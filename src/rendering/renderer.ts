/**
 * Three.js renderer setup and scene management.
 */

import * as THREE from 'three';
import { Faction, type FactionComponent } from '../components/faction';
import type { Transform } from '../components/transform';
import {
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { getActiveBeams } from '../systems/beams';
import { generateSkyboxTexture, getSunDirectionFromSeed } from './skybox';

/** Beam line entry with cached entity ID to avoid parsing */
interface BeamLineEntry {
  line: THREE.Line;
  entityId: Entity;
  positions: Float32Array; // Reusable position buffer
}

/** Renderer state */
export interface Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  webglRenderer: THREE.WebGLRenderer;
  entityMeshes: Map<Entity, THREE.Object3D>;
  beamLines: Map<string, BeamLineEntry>; // Key: "${entity}-${weaponIndex}"
}

/** Colors for factions */
const FACTION_COLORS = {
  [Faction.Player]: 0x00ff00, // Green
  [Faction.Enemy]: 0xff0000, // Red
  [Faction.Neutral]: 0xffff00, // Yellow
};

// Reusable objects for camera updates (avoid per-frame allocations)
const cameraOffset = new THREE.Vector3();
const cameraTiltAxis = new THREE.Vector3(1, 0, 0);
const cameraTiltQuat = new THREE.Quaternion();

// Reusable Sets for scene sync (avoid per-frame allocations)
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

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(container.clientWidth, container.clientHeight);
  });

  return {
    scene,
    camera,
    webglRenderer,
    entityMeshes: new Map(),
    beamLines: new Map(),
  };
}

/** Creates a placeholder ship mesh */
function createShipMesh(faction: Faction): THREE.Mesh {
  // Simple arrow-like shape pointing in -Z direction
  const geometry = new THREE.ConeGeometry(2, 8, 4);
  geometry.rotateX(Math.PI / 2);

  const color = FACTION_COLORS[faction] ?? 0xffffff;
  const material = new THREE.MeshPhongMaterial({ color });

  return new THREE.Mesh(geometry, material);
}

/** Creates a projectile mesh */
function createProjectileMesh(faction: Faction): THREE.Mesh {
  // Small glowing sphere
  const geometry = new THREE.SphereGeometry(0.3, 8, 6);
  const color = FACTION_COLORS[faction] ?? 0xffff00;
  const material = new THREE.MeshBasicMaterial({ color }); // Unlit for glow effect

  return new THREE.Mesh(geometry, material);
}

/** Creates a missile mesh */
function createMissileMesh(faction: Faction): THREE.Mesh {
  // Elongated cone pointing in -Z
  const geometry = new THREE.ConeGeometry(0.5, 3, 6);
  geometry.rotateX(Math.PI / 2);
  const color = FACTION_COLORS[faction] ?? 0xffff00;
  const material = new THREE.MeshBasicMaterial({ color });

  return new THREE.Mesh(geometry, material);
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

    let mesh = entityMeshes.get(entity);

    if (!mesh) {
      // Create appropriate mesh based on entity type
      if (isProjectile) {
        mesh = createProjectileMesh(faction?.faction ?? Faction.Neutral);
      } else if (isMissile) {
        mesh = createMissileMesh(faction?.faction ?? Faction.Neutral);
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
  updateBeamLines(world, scene, beamLines);
}

/** Updates beam line visuals */
function updateBeamLines(
  world: World,
  scene: THREE.Scene,
  beamLines: Map<string, BeamLineEntry>,
): void {
  const activeBeams = getActiveBeams(world);
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
        entry = { line, entityId: entity, positions };
        beamLines.set(key, entry);
      }

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

      // Update color if changed
      (entry.line.material as THREE.LineBasicMaterial).color.copy(beam.color);
    }
  }

  // Hide inactive beams and clean up beams for destroyed entities
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
        // Entity exists but beam inactive - just hide
        entry.line.visible = false;
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
  renderer.webglRenderer.dispose();
  renderer.entityMeshes.clear();
}
