/**
 * Three.js renderer setup and scene management.
 */

import * as THREE from 'three';
import type { World, Entity } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import { Faction, type FactionComponent } from '../components/faction';
import { getSunDirectionFromSeed, generateSkyboxTexture } from './skybox';
import { hasComponent } from '../core/ecs';
import { getActiveBeams } from '../systems/beams';

/** Renderer state */
export interface Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  webglRenderer: THREE.WebGLRenderer;
  entityMeshes: Map<Entity, THREE.Object3D>;
  beamLines: Map<Entity, THREE.Line>;
}

/** Colors for factions */
const FACTION_COLORS = {
  [Faction.Player]: 0x00ff00,  // Green
  [Faction.Enemy]: 0xff0000,   // Red
  [Faction.Neutral]: 0xffff00, // Yellow
};

/** Creates the renderer and attaches to container */
export function createRenderer(container: HTMLElement): Renderer {
  // Scene (no background - skybox provides it)
  const scene = new THREE.Scene();

  // Camera (60° vertical FOV - standard for space combat games, avoids fish-eye)
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
  );

  // WebGL Renderer
  const webglRenderer = new THREE.WebGLRenderer({ antialias: true });
  webglRenderer.setSize(container.clientWidth, container.clientHeight);
  webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(webglRenderer.domElement);

  // Skybox seed (use Date.now() for variety, or a fixed string for reproducibility)
  const skyboxSeed = Date.now().toString();

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
  const seenEntities = new Set<Entity>();

  // Update or create meshes for entities with transforms
  for (const entity of queryEntities(world, ['transform'])) {
    seenEntities.add(entity);
    const transform = getComponent<Transform>(world, entity, 'transform')!;
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
  updateBeamLines(scene, beamLines);
}

/** Updates beam line visuals */
function updateBeamLines(scene: THREE.Scene, beamLines: Map<Entity, THREE.Line>): void {
  const activeBeams = getActiveBeams();
  const seenBeams = new Set<Entity>();

  for (const [entity, beam] of activeBeams) {
    if (!beam.active || !beam.hitPoint) continue;
    seenBeams.add(entity);

    let line = beamLines.get(entity);
    if (!line) {
      // Create new beam line
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        color: beam.color,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });
      line = new THREE.Line(geometry, material);
      scene.add(line);
      beamLines.set(entity, line);
    }

    // Update line geometry
    const positions = new Float32Array([
      beam.origin.x, beam.origin.y, beam.origin.z,
      beam.hitPoint.x, beam.hitPoint.y, beam.hitPoint.z,
    ]);
    const posAttr = new THREE.BufferAttribute(positions, 3);
    line.geometry.setAttribute('position', posAttr);
    line.visible = true;

    // Update color if changed
    (line.material as THREE.LineBasicMaterial).color.copy(beam.color);
  }

  // Hide inactive beams
  for (const [entity, line] of beamLines) {
    if (!seenBeams.has(entity)) {
      line.visible = false;
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
  entity: Entity
): void {
  const transform = getComponent<Transform>(world, entity, 'transform');
  if (!transform) return;

  const { camera } = renderer;

  // Calculate camera position behind and above the ship (in ship's local space)
  const offset = new THREE.Vector3(0, 5, 20);
  offset.applyQuaternion(transform.rotation);
  camera.position.copy(transform.position).add(offset);

  // Make camera inherit ship's orientation exactly, then look forward
  // This keeps the ship centered during rolls
  camera.quaternion.copy(transform.rotation);

  // Apply a slight downward tilt to see the ship better
  const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -0.1 // Small downward tilt
  );
  camera.quaternion.multiply(tiltQuat);
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
