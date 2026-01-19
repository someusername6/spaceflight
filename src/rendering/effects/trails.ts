/**
 * Projectile Bolt Rendering - Visual bolts for projectiles with object pooling.
 *
 * Each projectile gets a glowing bolt mesh that follows it. Object pooling
 * is used to avoid GPU resource allocation/deallocation churn during gameplay.
 */

import * as THREE from 'three';
import type { WeaponName } from '../../components/projectile';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { TICK_SEC } from '../../game';
import {
  getWeaponVisual,
  setBoltScale,
  type WeaponVisualConfig,
} from './trail-config';

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
  setBoltScale(visual, projectileBolt.bolt.scale);
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
  setBoltScale(visual, bolt.scale);
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

/** Updates trail visuals with interpolation */
export function updateBoltRenderer(
  renderer: BoltRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
): void {
  seenProjectiles.clear();

  // Update or create bolts for projectiles
  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    seenProjectiles.add(entity);

    const projectile = getComponent(world, entity, 'projectile');
    const transform = getComponent(world, entity, 'transform');
    if (!projectile || !transform) continue;

    let projectileBolt = renderer.bolts.get(entity);

    if (!projectileBolt) {
      // Use visualName for rendering, fall back to weaponName
      const visualName = projectile.visualName ?? projectile.weaponName;
      projectileBolt = acquireBolt(
        renderer,
        scene,
        visualName,
        transform.position,
      );
      renderer.bolts.set(entity, projectileBolt);
    }

    // Calculate interpolated position:
    // prevPosition = currentPosition - direction * speed * TICK_SEC
    // interpPosition = lerp(prevPosition, currentPosition, alpha)
    // Simplified: currentPosition - direction * speed * TICK_SEC * (1 - alpha)
    const backOffset = projectile.speed * TICK_SEC * (1 - alpha);
    interpPos.copy(transform.position);
    interpPos.addScaledVector(projectile.direction, -backOffset);

    // Update bolt position, orientation, and growth
    updateBolt(
      projectileBolt,
      interpPos,
      projectile.direction,
      projectile.distanceTraveled,
    );
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
// Reusable vector for interpolated position
const interpPos = new THREE.Vector3();

/** Updates a single bolt with new position, handling length growth for long projectiles */
function updateBolt(
  projectileBolt: ProjectileBolt,
  position: THREE.Vector3,
  direction: THREE.Vector3,
  distanceTraveled: number,
): void {
  const visual = getWeaponVisual(projectileBolt.weaponName);

  // Calculate effective length based on distance traveled (projectile "emerges" from muzzle)
  // Spheres have no length, so skip growth logic for them
  let effectiveLength: number | undefined;
  let positionOffset = 0;

  if (visual.boltShape !== 'sphere' && visual.length) {
    effectiveLength = Math.min(distanceTraveled, visual.length);
    // Offset position backward so the back of the bolt stays at spawn point until fully emerged
    positionOffset = -effectiveLength / 2;
  }

  // Update scale with effective length
  setBoltScale(visual, projectileBolt.bolt.scale, effectiveLength);

  // Update position with offset along direction
  projectileBolt.bolt.position.copy(position);
  if (positionOffset !== 0) {
    projectileBolt.bolt.position.addScaledVector(direction, positionOffset);
  }

  // Update orientation
  boltQuat.setFromUnitVectors(boltForward, direction);
  projectileBolt.bolt.quaternion.copy(boltQuat);
}

/** Dispose a single bolt's resources */
function disposeBolt(projectileBolt: ProjectileBolt, scene: THREE.Scene): void {
  scene.remove(projectileBolt.bolt);
  // Note: bolt geometry is shared (not cloned), so don't dispose it per-bolt
  (projectileBolt.bolt.material as THREE.Material).dispose();
}

/**
 * Reset bolt renderer state (for replay seeking).
 * Returns active bolts to pool without disposing shared resources.
 */
export function resetBoltRenderer(renderer: BoltRenderer): void {
  // Return active bolts to pool
  for (const projectileBolt of renderer.bolts.values()) {
    releaseBolt(renderer, projectileBolt);
  }
  renderer.bolts.clear();

  // Clear tracking state
  seenProjectiles.clear();
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

  // Clear tracking state
  seenProjectiles.clear();
}
