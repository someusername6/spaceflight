/**
 * Three.js renderer setup and scene management.
 */

import * as THREE from 'three';
import type { World, Entity } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import { Faction, type FactionComponent } from '../components/faction';
import { generateSkyboxTexture, getSunDirectionFromSeed } from './skybox';

/** Renderer state */
export interface Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  webglRenderer: THREE.WebGLRenderer;
  entityMeshes: Map<Entity, THREE.Object3D>;
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

  // Skybox seed (use string seed for reproducible results)
  const skyboxSeed = '7alzyiphy3k0';

  // Basic lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  // Directional light from sun direction (derived from skybox seed)
  const sunDir = getSunDirectionFromSeed(skyboxSeed);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.copy(sunDir);
  scene.add(directionalLight);

  // Procedural skybox (fully deterministic from seed)
  scene.background = generateSkyboxTexture(webglRenderer, {
    seed: skyboxSeed,
  });

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

/** Syncs Three.js scene with ECS world */
export function syncScene(renderer: Renderer, world: World): void {
  const { scene, entityMeshes } = renderer;
  const seenEntities = new Set<Entity>();

  // Update or create meshes for entities with transforms
  for (const entity of queryEntities(world, ['transform'])) {
    seenEntities.add(entity);
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');

    let mesh = entityMeshes.get(entity);

    if (!mesh) {
      // Create new mesh
      mesh = createShipMesh(faction?.faction ?? Faction.Neutral);
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
