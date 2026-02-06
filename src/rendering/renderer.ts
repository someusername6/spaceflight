/**
 * Three.js renderer setup and scene management.
 */

import * as THREE from 'three';
import { DECOY_SPEED } from '../components/decoy';
import { Faction } from '../components/faction';
import { getComponent, hasComponent, isShip, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { getArchetype } from '../factories/ship';
import { TICK_SEC } from '../game';
import { setLightningResolution } from './beam-effects/lightning';
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
  createShipMesh,
  createStructureMesh,
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
  /** Interpolated positions for smooth rendering between ticks */
  interpolatedPositions: Map<Entity, THREE.Vector3>;
  /** Interpolated rotations for smooth rendering between ticks */
  interpolatedRotations: Map<Entity, THREE.Quaternion>;
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
 * Hermite interpolation for smooth velocity across tick boundaries.
 * Unlike linear lerp, this ensures visual velocity is continuous.
 */
function hermiteInterp(
  p0: THREE.Vector3,
  v0: THREE.Vector3,
  p1: THREE.Vector3,
  v1: THREE.Vector3,
  t: number,
  dt: number,
  out: THREE.Vector3,
): void {
  const t2 = t * t;
  const t3 = t2 * t;
  // Hermite basis functions
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  out.set(0, 0, 0);
  out.addScaledVector(p0, h00);
  out.addScaledVector(v0, h10 * dt);
  out.addScaledVector(p1, h01);
  out.addScaledVector(v1, h11 * dt);
}

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

  // Set initial line resolutions for Line2-based renderers
  setBeamResolution(container.clientWidth, container.clientHeight);
  setLightningResolution(container.clientWidth, container.clientHeight);

  // Handle resize (stored for cleanup)
  const resizeHandler = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(container.clientWidth, container.clientHeight);
    setBeamResolution(container.clientWidth, container.clientHeight);
    setLightningResolution(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', resizeHandler);

  return {
    scene,
    camera,
    webglRenderer,
    entityMeshes: new Map(),
    beamLines: new Map(),
    interpolatedPositions: new Map(),
    interpolatedRotations: new Map(),
    resizeHandler,
  };
}

/**
 * Syncs Three.js scene with ECS world.
 * @param alpha - Interpolation factor (0-1) for smooth rendering between physics ticks
 */
export function syncScene(renderer: Renderer, world: World, alpha = 1): void {
  const {
    scene,
    entityMeshes,
    beamLines,
    interpolatedPositions,
    interpolatedRotations,
  } = renderer;
  // Clear reusable Set (avoid per-frame allocations)
  seenEntities.clear();

  // Update or create meshes for entities with transforms
  for (const entity of queryEntities(world, ['transform'])) {
    // Whitelist: only create meshes for known renderable entity types
    // Note: projectiles use trail bolt as visual (no entity mesh needed)
    const isMissile = hasComponent(world, entity, 'missile');
    const isDecoy = hasComponent(world, entity, 'decoy');
    const isShipEntity = isShip(world, entity);
    const isStructure = hasComponent(world, entity, 'structure');

    if (!isMissile && !isDecoy && !isShipEntity && !isStructure) continue;

    seenEntities.add(entity);
    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;
    const faction = getComponent(world, entity, 'faction');

    let mesh = entityMeshes.get(entity);

    if (!mesh) {
      // Create appropriate mesh based on entity type
      if (isMissile) {
        const missile = getComponent(world, entity, 'missile');
        mesh = createMissileMesh(missile?.missileType ?? 'seeker');
      } else if (isDecoy) {
        mesh = createDecoyMesh(faction?.faction ?? Faction.Neutral);
      } else if (isStructure) {
        const structure = getComponent(world, entity, 'structure');
        mesh = createStructureMesh(
          structure?.structureType ?? 'waypoint',
          structure?.stationType,
        );
      } else {
        // Get ship class from identity -> archetype -> shipClassName
        // Falls back to using identity.archetype directly for convoy ships
        // (transport/freighter aren't in archetype registry but have meshes)
        const identity = getComponent(world, entity, 'shipIdentity');
        const archetype = identity
          ? getArchetype(identity.archetype)
          : undefined;
        const shipClass = archetype?.shipClassName ?? identity?.archetype;
        // Convoy ships always use Neutral color (yellow) regardless of faction
        const isConvoy = hasComponent(world, entity, 'convoyShip');
        const meshFaction = isConvoy
          ? Faction.Neutral
          : (faction?.faction ?? Faction.Neutral);
        mesh = createShipMesh(meshFaction, shipClass);
      }
      scene.add(mesh);
      entityMeshes.set(entity, mesh);
    }

    // Update transform with interpolation
    const physics = getComponent(world, entity, 'physics');
    const missile = isMissile ? getComponent(world, entity, 'missile') : null;
    const decoy = isDecoy ? getComponent(world, entity, 'decoy') : null;

    if (physics) {
      // Use Hermite interpolation for position (smooth velocity across tick boundaries)
      hermiteInterp(
        physics.prevPosition,
        physics.prevVelocity,
        transform.position,
        physics.velocity,
        alpha,
        TICK_SEC,
        interpPos,
      );
      // SLERP for rotation
      interpRot.slerpQuaternions(
        physics.prevRotation,
        transform.rotation,
        alpha,
      );

      mesh.position.copy(interpPos);
      mesh.quaternion.copy(interpRot);
    } else if (missile) {
      // Missiles use velocity-based interpolation (no physics component)
      // Interpolate backward from current position: pos - direction * speed * dt * (1-alpha)
      const backOffset = missile.speed * TICK_SEC * (1 - alpha);
      interpPos.copy(transform.position);
      interpPos.addScaledVector(missile.direction, -backOffset);

      mesh.position.copy(interpPos);
      mesh.quaternion.copy(transform.rotation);
      interpRot.copy(transform.rotation);
    } else if (decoy) {
      // Decoys use velocity-based interpolation (similar to missiles)
      const backOffset = DECOY_SPEED * TICK_SEC * (1 - alpha);
      interpPos.copy(transform.position);
      interpPos.addScaledVector(decoy.direction, -backOffset);

      mesh.position.copy(interpPos);
      mesh.quaternion.copy(transform.rotation);
      interpRot.copy(transform.rotation);
    } else {
      // No physics, missile, or decoy - use current transform directly
      mesh.position.copy(transform.position);
      mesh.quaternion.copy(transform.rotation);
      interpPos.copy(transform.position);
      interpRot.copy(transform.rotation);
    }

    // Store interpolated state for all entities (used by camera and effect renderers)
    let storedPos = interpolatedPositions.get(entity);
    if (!storedPos) {
      storedPos = new THREE.Vector3();
      interpolatedPositions.set(entity, storedPos);
    }
    storedPos.copy(interpPos);

    let storedRot = interpolatedRotations.get(entity);
    if (!storedRot) {
      storedRot = new THREE.Quaternion();
      interpolatedRotations.set(entity, storedRot);
    }
    storedRot.copy(interpRot);
  }

  // Remove meshes for entities that no longer exist
  for (const [entity, mesh] of entityMeshes) {
    if (!seenEntities.has(entity)) {
      if (mesh instanceof THREE.Mesh) {
        if (mesh.material instanceof THREE.Material) mesh.material.dispose();
      }
      scene.remove(mesh);
      entityMeshes.delete(entity);
      interpolatedPositions.delete(entity);
      interpolatedRotations.delete(entity);
    }
  }

  // Update beam lines with interpolated gameTime for smooth fade animation
  const interpolatedGameTime =
    world.systemState.gameTime - TICK_SEC * (1 - alpha);
  updateAllBeamLines(world, scene, beamLines, interpolatedGameTime, renderer);
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
  const transform = getComponent(world, entity, 'transform');
  if (!transform) return;

  const { camera } = renderer;

  // Use interpolated position/rotation (same as what mesh is rendered at)
  // This prevents camera-mesh desync that causes visible jitter
  const shipPos =
    getInterpolatedPosition(renderer, entity) ?? transform.position;
  const shipRot =
    getInterpolatedRotation(renderer, entity) ?? transform.rotation;

  // Calculate camera position behind and above the ship (in ship's local space)
  cameraOffset.set(0, 5, 20);
  cameraOffset.applyQuaternion(shipRot);
  camera.position.copy(shipPos).add(cameraOffset);

  // Make camera inherit ship's orientation exactly
  // This keeps the ship centered during rolls and ensures crosshair
  // accurately represents where shots will land
  camera.quaternion.copy(shipRot);
}

/** Gets the Three.js scene */
export function getScene(renderer: Renderer): THREE.Scene {
  return renderer.scene;
}

/**
 * Get the interpolated position for an entity.
 * Returns the same position the mesh is rendered at.
 * Returns null if no interpolated position exists.
 */
export function getInterpolatedPosition(
  renderer: Renderer,
  entity: Entity,
): THREE.Vector3 | null {
  return renderer.interpolatedPositions.get(entity) ?? null;
}

/**
 * Get the interpolated rotation for an entity.
 * Returns the same rotation the mesh is rendered at.
 * Returns null if no interpolated rotation exists.
 */
export function getInterpolatedRotation(
  renderer: Renderer,
  entity: Entity,
): THREE.Quaternion | null {
  return renderer.interpolatedRotations.get(entity) ?? null;
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

  // Remove canvas from DOM to fully release WebGL context
  const canvas = renderer.webglRenderer.domElement;
  if (canvas.parentElement) {
    canvas.parentElement.removeChild(canvas);
  }

  renderer.webglRenderer.dispose();
  for (const obj of renderer.entityMeshes.values()) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          for (const mat of child.material) mat.dispose();
        } else {
          child.material.dispose();
        }
      }
    });
  }
  renderer.entityMeshes.clear();
}
