/**
 * Three.js renderer setup and scene management.
 */

import * as THREE from 'three';
import { Faction, type FactionComponent } from '../components/faction';
import type { Missile } from '../components/missile';
import type { Transform } from '../components/transform';
import {
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
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

/** Beam fade-out duration in seconds */
const BEAM_FADE_DURATION = 0.15;

/** Beam line entry with cached entity ID to avoid parsing */
interface BeamLineEntry {
  line: THREE.Line;
  entityId: Entity;
  positions: Float32Array; // Reusable position buffer
  fadeStartTime: number | null; // When fade-out started (null = active)
}

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
const cameraTiltAxis = new THREE.Vector3(1, 0, 0);
const cameraTiltQuat = new THREE.Quaternion();
const seenEntities = new Set<Entity>();
const seenBeams = new Set<string>();

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

  // Handle resize (stored for cleanup)
  const resizeHandler = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(container.clientWidth, container.clientHeight);
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

/** Syncs Three.js scene with ECS world */
export function syncScene(renderer: Renderer, world: World): void {
  const { scene, entityMeshes, beamLines } = renderer;
  // Clear reusable Set (avoid per-frame allocations)
  seenEntities.clear();

  // Update or create meshes for entities with transforms
  for (const entity of queryEntities(world, ['transform'])) {
    seenEntities.add(entity);
    // Query guarantees this component exists
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    const isProjectile = hasComponent(world, entity, 'projectile');
    const isMissile = hasComponent(world, entity, 'missile');
    const isDecoy = hasComponent(world, entity, 'decoy');

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

    // Update transform
    mesh.position.copy(transform.position);
    mesh.quaternion.copy(transform.rotation);
  }

  // Remove meshes for entities that no longer exist
  for (const [entity, mesh] of entityMeshes) {
    if (!seenEntities.has(entity)) {
      scene.remove(mesh);
      entityMeshes.delete(entity);
    }
  }

  // Update beam lines
  updateBeamLines(world, scene, beamLines, world.systemState.gameTime);
}

/** Updates beam line visuals */
function updateBeamLines(
  world: World,
  scene: THREE.Scene,
  beamLines: Map<string, BeamLineEntry>,
  gameTime: number,
): void {
  const activeBeams = world.systemState.beams.activeBeams;
  // Clear reusable Set (avoid per-frame allocations)
  seenBeams.clear();

  for (const [entity, beams] of activeBeams) {
    for (const beam of beams) {
      if (!beam.active || !beam.hitPoint) continue;

      const key = `${entity}-${beam.weaponIndex}`;
      seenBeams.add(key);

      let entry = beamLines.get(key);
      if (!entry) {
        // Create new beam line with reusable position buffer
        const positions = new Float32Array(6); // 2 points * 3 components
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3),
        );
        const material = new THREE.LineBasicMaterial({
          color: beam.color,
          linewidth: 2,
          transparent: true,
          opacity: 0.8,
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        entry = { line, entityId: entity, positions, fadeStartTime: null };
        beamLines.set(key, entry);
      }

      // Beam is active - reset fade state
      entry.fadeStartTime = null;

      // Update position buffer in-place (no allocation)
      const positions = entry.positions;
      positions[0] = beam.origin.x;
      positions[1] = beam.origin.y;
      positions[2] = beam.origin.z;
      positions[3] = beam.hitPoint.x;
      positions[4] = beam.hitPoint.y;
      positions[5] = beam.hitPoint.z;

      // Mark buffer as needing update
      const posAttr = entry.line.geometry.getAttribute('position');
      if (posAttr) {
        posAttr.needsUpdate = true;
      }
      entry.line.visible = true;
      (entry.line.material as THREE.LineBasicMaterial).opacity = 0.8;

      // Update color if changed
      (entry.line.material as THREE.LineBasicMaterial).color.copy(beam.color);
    }
  }

  // Handle inactive beams (fade out) and clean up destroyed entities
  for (const [key, entry] of beamLines) {
    if (!seenBeams.has(key)) {
      // Use cached entityId instead of parsing key
      if (!entityExists(world, entry.entityId)) {
        // Entity destroyed - remove beam line entirely
        scene.remove(entry.line);
        entry.line.geometry.dispose();
        (entry.line.material as THREE.Material).dispose();
        beamLines.delete(key);
      } else {
        // Entity exists but beam inactive - fade out
        if (entry.fadeStartTime === null) {
          // Start fading
          entry.fadeStartTime = gameTime;
        }

        const fadeAge = gameTime - entry.fadeStartTime;
        const fadeProgress = fadeAge / BEAM_FADE_DURATION;

        if (fadeProgress >= 1) {
          // Fade complete - hide
          entry.line.visible = false;
        } else {
          // Still fading - update opacity
          entry.line.visible = true;
          (entry.line.material as THREE.LineBasicMaterial).opacity =
            0.8 * (1 - fadeProgress);
        }
      }
    }
  }
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

  // Make camera inherit ship's orientation exactly, then look forward
  // This keeps the ship centered during rolls
  camera.quaternion.copy(transform.rotation);

  // Apply a slight downward tilt to see the ship better
  cameraTiltQuat.setFromAxisAngle(cameraTiltAxis, -0.1);
  camera.quaternion.multiply(cameraTiltQuat);
}

/** Gets the Three.js scene */
export function getScene(renderer: Renderer): THREE.Scene {
  return renderer.scene;
}

/** Disposes of renderer resources */
export function disposeRenderer(renderer: Renderer): void {
  // Remove resize event listener
  window.removeEventListener('resize', renderer.resizeHandler);

  renderer.webglRenderer.dispose();
  renderer.entityMeshes.clear();
}
