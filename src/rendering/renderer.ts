/**
 * Three.js renderer setup and scene management.
 */

import * as THREE from 'three';
import { Faction, type FactionComponent } from '../components/faction';
import type { Missile } from '../components/missile';
import type { Physics } from '../components/physics';
import type { Transform } from '../components/transform';
import { getComponent, hasComponent, isShip, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
  type BeamLineEntry,
  disposeBeamLine,
  setBeamResolution,
  updateAllBeamLines,
} from './beam-lines';
import { DUST_LAYER } from './effects/dust';
import {
  createDecoyMesh,
  createMissileMesh,
  createProjectileMesh,
  createShipMesh,
} from './mesh-factory';
import {
  generateSkyboxTexture,
  getSunDirectionFromSeed,
} from './skybox/skybox';

/** Renderer state */
export interface Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  webglRenderer: THREE.WebGLRenderer;
  entityMeshes: Map<Entity, THREE.Object3D>;
  beamLines: Map<string, BeamLineEntry>; // Key: "${entity}-${weaponIndex}"
  /** Resize handler for cleanup */
  resizeHandler: () => void;
}

// Reusable objects (avoid per-frame allocations)
const cameraOffset = new THREE.Vector3();
const seenEntities = new Set<Entity>();
// Reusable vectors for interpolation
const interpPos = new THREE.Vector3();
const interpRot = new THREE.Quaternion();

/**
 * Position smoothing to reduce jitter from frame timing variations.
 * Uses exponential moving average on the interpolated position.
 */
const smoothedPositions = new Map<Entity, THREE.Vector3>();
const POSITION_SMOOTH_FACTOR = 0.4; // Higher = more responsive, lower = smoother

/** Creates the renderer and attaches to container */
export function createRenderer(container: HTMLElement, seed: number): Renderer {
  // Scene (no background - skybox provides it)
  const scene = new THREE.Scene();

  // Camera (60° vertical FOV - standard for space combat games, avoids fish-eye)
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    10000,
  );
  camera.layers.enable(DUST_LAYER); // See dust particles (target camera won't)

  // WebGL Renderer
  const webglRenderer = new THREE.WebGLRenderer({ antialias: true });
  webglRenderer.setSize(container.clientWidth, container.clientHeight);
  webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(webglRenderer.domElement);

  // Skybox seed (derived from game seed for determinism)
  const skyboxSeed = seed.toString();

  // Basic lighting - ambient so ships are visible from all angles
  const ambientLight = new THREE.AmbientLight(0x505050, 0.6);
  scene.add(ambientLight);

  // Directional light from sun direction (derived from skybox seed)
  const sunDir = getSunDirectionFromSeed(skyboxSeed);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
  directionalLight.position.copy(sunDir);
  scene.add(directionalLight);

  // Generate procedural skybox
  scene.background = generateSkyboxTexture(webglRenderer, { seed: skyboxSeed });

  // Set initial beam resolution
  setBeamResolution(container.clientWidth, container.clientHeight);

  // Handle resize (stored for cleanup)
  const resizeHandler = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(container.clientWidth, container.clientHeight);
    setBeamResolution(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', resizeHandler);

  return {
    scene,
    camera,
    webglRenderer,
    entityMeshes: new Map(),
    beamLines: new Map(),
    resizeHandler,
  };
}

/**
 * Syncs Three.js scene with ECS world.
 * @param alpha - Interpolation factor (0-1) for smooth rendering between physics ticks
 */
export function syncScene(renderer: Renderer, world: World, alpha = 1): void {
  const { scene, entityMeshes, beamLines } = renderer;
  // Clear reusable Set (avoid per-frame allocations)
  seenEntities.clear();

  // Update or create meshes for entities with transforms
  for (const entity of queryEntities(world, ['transform'])) {
    // Whitelist: only create meshes for known renderable entity types
    const isProjectile = hasComponent(world, entity, 'projectile');
    const isMissile = hasComponent(world, entity, 'missile');
    const isDecoy = hasComponent(world, entity, 'decoy');
    const isShipEntity = isShip(world, entity);

    if (!isProjectile && !isMissile && !isDecoy && !isShipEntity) continue;

    seenEntities.add(entity);
    // Query guarantees this component exists
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');

    let mesh = entityMeshes.get(entity);

    if (!mesh) {
      // Create appropriate mesh based on entity type
      if (isProjectile) {
        mesh = createProjectileMesh(faction?.faction ?? Faction.Neutral);
      } else if (isMissile) {
        const missile = getComponent<Missile>(world, entity, 'missile');
        mesh = createMissileMesh(missile?.missileType ?? 'seeker');
      } else if (isDecoy) {
        mesh = createDecoyMesh(faction?.faction ?? Faction.Neutral);
      } else {
        mesh = createShipMesh(faction?.faction ?? Faction.Neutral);
      }
      scene.add(mesh);
      entityMeshes.set(entity, mesh);
    }

    // Update transform with interpolation for entities with Physics
    const physics = getComponent<Physics>(world, entity, 'physics');
    if (physics) {
      // Interpolate between previous tick position and current position
      interpPos.lerpVectors(physics.prevPosition, transform.position, alpha);
      interpRot.slerpQuaternions(
        physics.prevRotation,
        transform.rotation,
        alpha,
      );

      // Apply position smoothing only to ships (reduces frame timing jitter)
      // Projectiles/missiles need precise positions for hit detection
      if (isShipEntity) {
        let smoothed = smoothedPositions.get(entity);
        if (!smoothed) {
          smoothed = new THREE.Vector3().copy(interpPos);
          smoothedPositions.set(entity, smoothed);
        } else {
          smoothed.lerp(interpPos, POSITION_SMOOTH_FACTOR);
        }
        mesh.position.copy(smoothed);
      } else {
        mesh.position.copy(interpPos);
      }

      mesh.quaternion.copy(interpRot);
    } else {
      // No physics component - use current transform directly
      mesh.position.copy(transform.position);
      mesh.quaternion.copy(transform.rotation);
    }
  }

  // Remove meshes for entities that no longer exist
  for (const [entity, mesh] of entityMeshes) {
    if (!seenEntities.has(entity)) {
      scene.remove(mesh);
      entityMeshes.delete(entity);
      smoothedPositions.delete(entity);
    }
  }

  // Update beam lines
  updateAllBeamLines(world, scene, beamLines, world.systemState.gameTime);
}

/** Renders the scene */
export function render(renderer: Renderer): void {
  renderer.webglRenderer.render(renderer.scene, renderer.camera);
}

/** Updates camera to follow an entity */
export function followEntity(
  renderer: Renderer,
  world: World,
  entity: Entity,
): void {
  const transform = getComponent<Transform>(world, entity, 'transform');
  if (!transform) return;

  const { camera } = renderer;

  // Calculate camera position behind and above the ship (in ship's local space)
  cameraOffset.set(0, 5, 20);
  cameraOffset.applyQuaternion(transform.rotation);
  camera.position.copy(transform.position).add(cameraOffset);

  // Make camera inherit ship's orientation exactly
  // This keeps the ship centered during rolls and ensures crosshair
  // accurately represents where shots will land
  camera.quaternion.copy(transform.rotation);
}

/** Gets the Three.js scene */
export function getScene(renderer: Renderer): THREE.Scene {
  return renderer.scene;
}

/** Disposes of renderer resources */
export function disposeRenderer(renderer: Renderer): void {
  // Remove resize event listener
  window.removeEventListener('resize', renderer.resizeHandler);

  // Dispose beam lines
  for (const entry of renderer.beamLines.values()) {
    disposeBeamLine(renderer.scene, entry);
  }
  renderer.beamLines.clear();

  renderer.webglRenderer.dispose();
  renderer.entityMeshes.clear();
}
