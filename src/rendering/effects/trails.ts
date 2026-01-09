/**
 * Projectile Bolt Rendering - Visual bolts for projectiles with object pooling.
 *
 * Each projectile gets a glowing bolt mesh that follows it. Object pooling
 * is used to avoid GPU resource allocation/deallocation churn during gameplay.
 */

import * as THREE from 'three';
import type { Projectile, WeaponName } from '../../components/projectile';
import type { Transform } from '../../components/transform';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { getWeaponVisual, type WeaponVisualConfig } from './trail-config';

// Reusable Set for tracking seen projectiles
const seenProjectiles = new Set<Entity>();

/** Get the appropriate geometry for a weapon's bolt shape */
function getBoltGeometry(
  renderer: BoltRenderer,
  visual: WeaponVisualConfig,
): THREE.BufferGeometry {
  return visual.boltShape === 'sphere'
    ? renderer.energyBoltGeometry
    : visual.boltShape === 'capsule'
      ? renderer.capsuleBoltGeometry
      : renderer.ballisticBoltGeometry;
}

/** Bolt state for one projectile */
interface ProjectileBolt {
  bolt: THREE.Mesh;
  weaponName: WeaponName;
}

/** Bolt renderer state */
export interface BoltRenderer {
  bolts: Map<Entity, ProjectileBolt>;
  energyBoltGeometry: THREE.SphereGeometry;
  ballisticBoltGeometry: THREE.CylinderGeometry;
  capsuleBoltGeometry: THREE.CapsuleGeometry;
  /** Pool of inactive bolt objects (for reuse) */
  pool: ProjectileBolt[];
  /** Scene reference for adding/removing objects */
  scene: THREE.Scene | null;
}

/** Creates the bolt renderer */
export function createBoltRenderer(): BoltRenderer {
  return {
    bolts: new Map(),
    // Energy bolts: glowing spheres
    energyBoltGeometry: new THREE.SphereGeometry(0.5, 8, 6),
    // Ballistic bolts: elongated cylinders (bullet-like)
    ballisticBoltGeometry: new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6),
    // Capsule bolts: elongated blaster-style (rounded cylinder)
    capsuleBoltGeometry: new THREE.CapsuleGeometry(0.12, 5.0, 4, 8),
    // Object pool for reusing bolt objects
    pool: [],
    scene: null,
  };
}

/** Get a bolt from pool or create a new one */
function acquireBolt(
  renderer: BoltRenderer,
  scene: THREE.Scene,
  weaponName: WeaponName,
  startPosition: THREE.Vector3,
): ProjectileBolt {
  // Store scene reference for pool management
  renderer.scene = scene;

  // Try to get from pool first
  const pooledBolt = renderer.pool.pop();
  if (pooledBolt) {
    // Reinitialize pooled bolt for new projectile
    reinitializeBolt(renderer, pooledBolt, weaponName, startPosition);
    pooledBolt.bolt.visible = true;
    return pooledBolt;
  }

  // Create new bolt if pool is empty
  return createNewBolt(renderer, scene, weaponName, startPosition);
}

/** Reinitialize a pooled bolt for a new projectile */
function reinitializeBolt(
  renderer: BoltRenderer,
  projectileBolt: ProjectileBolt,
  weaponName: WeaponName,
  startPosition: THREE.Vector3,
): void {
  const visual = getWeaponVisual(weaponName);

  // Update state
  projectileBolt.weaponName = weaponName;

  // Update bolt geometry if shape changed (shared geometry, just swap reference)
  const newGeometry = getBoltGeometry(renderer, visual);
  if (projectileBolt.bolt.geometry !== newGeometry) {
    projectileBolt.bolt.geometry = newGeometry;
  }

  // Update bolt material color and scale
  (projectileBolt.bolt.material as THREE.MeshBasicMaterial).color.copy(
    visual.color,
  );
  projectileBolt.bolt.scale.setScalar(visual.boltSize / 0.5);
  projectileBolt.bolt.position.copy(startPosition);
}

/** Creates a new bolt (only called when pool is empty) */
function createNewBolt(
  renderer: BoltRenderer,
  scene: THREE.Scene,
  weaponName: WeaponName,
  startPosition: THREE.Vector3,
): ProjectileBolt {
  const visual = getWeaponVisual(weaponName);
  const boltGeometry = getBoltGeometry(renderer, visual);

  const boltMaterial = new THREE.MeshBasicMaterial({
    color: visual.color,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
  bolt.position.copy(startPosition);
  bolt.scale.setScalar(visual.boltSize / 0.5);
  scene.add(bolt);

  return {
    bolt,
    weaponName,
  };
}

/** Release a bolt back to the pool */
function releaseBolt(
  renderer: BoltRenderer,
  projectileBolt: ProjectileBolt,
): void {
  projectileBolt.bolt.visible = false;
  renderer.pool.push(projectileBolt);
}

/** Updates trail visuals */
export function updateBoltRenderer(
  renderer: BoltRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  seenProjectiles.clear();

  // Update or create bolts for projectiles
  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    seenProjectiles.add(entity);

    const projectile = getComponent<Projectile>(
      world,
      entity,
      'projectile',
    ) as Projectile;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    let projectileBolt = renderer.bolts.get(entity);

    if (!projectileBolt) {
      projectileBolt = acquireBolt(
        renderer,
        scene,
        projectile.weaponName,
        transform.position,
      );
      renderer.bolts.set(entity, projectileBolt);
    }

    // Update bolt position and orientation
    updateBolt(projectileBolt, transform.position, projectile.direction);
  }

  // Release bolts for projectiles that no longer exist (return to pool)
  for (const [entity, projectileBolt] of renderer.bolts) {
    if (!seenProjectiles.has(entity)) {
      releaseBolt(renderer, projectileBolt);
      renderer.bolts.delete(entity);
    }
  }
}

// Reusable quaternion for bolt orientation
const boltQuat = new THREE.Quaternion();
const boltForward = new THREE.Vector3(0, 1, 0); // Cylinder points in +Y

/** Updates a single bolt with new position */
function updateBolt(
  projectileBolt: ProjectileBolt,
  position: THREE.Vector3,
  direction: THREE.Vector3,
): void {
  projectileBolt.bolt.position.copy(position);
  boltQuat.setFromUnitVectors(boltForward, direction);
  projectileBolt.bolt.quaternion.copy(boltQuat);
}

/** Dispose a single bolt's resources */
function disposeBolt(projectileBolt: ProjectileBolt, scene: THREE.Scene): void {
  scene.remove(projectileBolt.bolt);
  // Note: bolt geometry is shared (not cloned), so don't dispose it per-bolt
  (projectileBolt.bolt.material as THREE.Material).dispose();
}

/** Disposes of trail renderer resources */
export function disposeBoltRenderer(
  renderer: BoltRenderer,
  scene: THREE.Scene,
): void {
  // Dispose active bolts
  for (const projectileBolt of renderer.bolts.values()) {
    disposeBolt(projectileBolt, scene);
  }
  renderer.bolts.clear();

  // Dispose pooled bolts (important: these are still in the scene, just hidden)
  for (const projectileBolt of renderer.pool) {
    disposeBolt(projectileBolt, scene);
  }
  renderer.pool.length = 0;

  // Dispose shared geometries
  renderer.energyBoltGeometry.dispose();
  renderer.ballisticBoltGeometry.dispose();
  renderer.capsuleBoltGeometry.dispose();
  renderer.scene = null;
}
