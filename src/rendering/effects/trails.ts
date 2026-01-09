/**
 * Trail Rendering - Visual trails for projectiles with object pooling.
 *
 * Trails are purely visual (not ECS state). Each projectile gets a trail
 * that fades out behind it, giving a sense of speed and direction.
 *
 * Object pooling: Trail objects (Line, Mesh, Materials) are pooled and reused
 * to avoid GPU resource allocation/deallocation churn during gameplay.
 */

import * as THREE from 'three';
import { Faction, type FactionComponent } from '../../components/faction';
import type { Projectile, WeaponName } from '../../components/projectile';
import type { Transform } from '../../components/transform';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { getWeaponVisual, MAX_TRAIL_LENGTH } from './trail-config';

// Reusable Set for tracking seen projectiles
const seenProjectiles = new Set<Entity>();

/** Trail state for one projectile */
interface ProjectileTrail {
  line: THREE.Line;
  bolt: THREE.Mesh; // Glowing bolt at projectile head
  positions: Float32Array; // Ring buffer of positions
  colors: Float32Array; // Per-vertex colors for fading
  orderedPositions: Float32Array; // Pre-allocated buffer for ordered output
  writeIndex: number; // Next position to write
  pointCount: number; // How many points are valid (fills up over time)
  trailLength: number; // Max trail points (varies by weapon)
  weaponName: WeaponName;
  faction: Faction;
  baseColor: THREE.Color;
}

/** Trail renderer state */
export interface TrailRenderer {
  trails: Map<Entity, ProjectileTrail>;
  energyBoltGeometry: THREE.SphereGeometry;
  ballisticBoltGeometry: THREE.CylinderGeometry;
  capsuleBoltGeometry: THREE.CapsuleGeometry;
  /** Pool of inactive trail objects (for reuse) */
  pool: ProjectileTrail[];
  /** Scene reference for adding/removing objects */
  scene: THREE.Scene | null;
}

/** Creates the trail renderer */
export function createTrailRenderer(): TrailRenderer {
  return {
    trails: new Map(),
    // Energy bolts: glowing spheres
    energyBoltGeometry: new THREE.SphereGeometry(0.5, 8, 6),
    // Ballistic bolts: elongated cylinders (bullet-like)
    ballisticBoltGeometry: new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6),
    // Capsule bolts: elongated blaster-style (rounded cylinder)
    capsuleBoltGeometry: new THREE.CapsuleGeometry(0.12, 0.5, 4, 8),
    // Object pool for reusing trail objects
    pool: [],
    scene: null,
  };
}

/** Get a trail from pool or create a new one */
function acquireTrail(
  renderer: TrailRenderer,
  scene: THREE.Scene,
  weaponName: WeaponName,
  faction: Faction,
  startPosition: THREE.Vector3,
): ProjectileTrail {
  // Store scene reference for pool management
  renderer.scene = scene;

  // Try to get from pool first
  const pooledTrail = renderer.pool.pop();
  if (pooledTrail) {
    // Reinitialize pooled trail for new projectile
    reinitializeTrail(pooledTrail, weaponName, faction, startPosition);
    // Make visible again
    pooledTrail.line.visible = true;
    pooledTrail.bolt.visible = true;
    return pooledTrail;
  }

  // Create new trail if pool is empty
  return createNewTrail(renderer, scene, weaponName, faction, startPosition);
}

/** Reinitialize a pooled trail for a new projectile */
function reinitializeTrail(
  trail: ProjectileTrail,
  weaponName: WeaponName,
  faction: Faction,
  startPosition: THREE.Vector3,
): void {
  const visual = getWeaponVisual(weaponName);
  const trailLength = visual.trailLength;

  // Reset positions to start position
  for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
    const idx = i * 3;
    trail.positions[idx] = startPosition.x;
    trail.positions[idx + 1] = startPosition.y;
    trail.positions[idx + 2] = startPosition.z;
  }

  // Select color based on faction
  const baseColor =
    faction === Faction.Enemy ? visual.enemyColor : visual.color;

  // Reset colors
  for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
    const idx = i * 3;
    trail.colors[idx] = baseColor.r;
    trail.colors[idx + 1] = baseColor.g;
    trail.colors[idx + 2] = baseColor.b;
  }

  // Update geometry attributes
  const posAttr = trail.line.geometry.getAttribute('position');
  const colorAttr = trail.line.geometry.getAttribute('color');
  posAttr.needsUpdate = true;
  colorAttr.needsUpdate = true;

  // Reset state
  trail.writeIndex = 0;
  trail.pointCount = 1;
  trail.trailLength = trailLength;
  trail.weaponName = weaponName;
  trail.faction = faction;
  trail.baseColor.copy(baseColor);

  // Update bolt material color and scale
  (trail.bolt.material as THREE.MeshBasicMaterial).color.copy(baseColor);
  trail.bolt.scale.setScalar(visual.boltSize / 0.5);
  trail.bolt.position.copy(startPosition);

  // Reset draw range
  trail.line.geometry.setDrawRange(0, 1);
}

/** Creates a new trail (only called when pool is empty) */
function createNewTrail(
  renderer: TrailRenderer,
  scene: THREE.Scene,
  weaponName: WeaponName,
  faction: Faction,
  startPosition: THREE.Vector3,
): ProjectileTrail {
  const visual = getWeaponVisual(weaponName);
  const trailLength = visual.trailLength;

  // Allocate for max trail length (enables reuse for any weapon)
  const positions = new Float32Array(MAX_TRAIL_LENGTH * 3);
  const colors = new Float32Array(MAX_TRAIL_LENGTH * 3);
  const orderedPositions = new Float32Array(MAX_TRAIL_LENGTH * 3);

  // Initialize all positions to start position
  for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
    const idx = i * 3;
    positions[idx] = startPosition.x;
    positions[idx + 1] = startPosition.y;
    positions[idx + 2] = startPosition.z;
  }

  // Select color based on faction (player vs enemy)
  const baseColor =
    faction === Faction.Enemy ? visual.enemyColor : visual.color;
  for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
    const idx = i * 3;
    colors[idx] = baseColor.r;
    colors[idx + 1] = baseColor.g;
    colors[idx + 2] = baseColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const line = new THREE.Line(geometry, material);
  scene.add(line);

  // Create bolt mesh - use shared geometry (don't clone)
  const boltGeometry =
    visual.boltShape === 'sphere'
      ? renderer.energyBoltGeometry
      : visual.boltShape === 'capsule'
        ? renderer.capsuleBoltGeometry
        : renderer.ballisticBoltGeometry;

  const boltMaterial = new THREE.MeshBasicMaterial({
    color: baseColor,
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
    line,
    bolt,
    positions,
    colors,
    orderedPositions,
    writeIndex: 0,
    pointCount: 1,
    trailLength,
    weaponName,
    faction,
    baseColor: baseColor.clone(),
  };
}

/** Release a trail back to the pool */
function releaseTrail(renderer: TrailRenderer, trail: ProjectileTrail): void {
  // Hide instead of removing from scene
  trail.line.visible = false;
  trail.bolt.visible = false;
  // Return to pool
  renderer.pool.push(trail);
}

/** Updates trail visuals */
export function updateTrailRenderer(
  renderer: TrailRenderer,
  scene: THREE.Scene,
  world: World,
): void {
  seenProjectiles.clear();

  // Update or create trails for projectiles
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
    const faction = getComponent<FactionComponent>(world, entity, 'faction');

    let trail = renderer.trails.get(entity);

    if (!trail) {
      trail = acquireTrail(
        renderer,
        scene,
        projectile.weaponName,
        faction?.faction ?? Faction.Neutral,
        transform.position,
      );
      renderer.trails.set(entity, trail);
    }

    // Add current position to trail and update bolt
    updateTrail(trail, transform.position, projectile.direction);
  }

  // Release trails for projectiles that no longer exist (return to pool)
  for (const [entity, trail] of renderer.trails) {
    if (!seenProjectiles.has(entity)) {
      releaseTrail(renderer, trail);
      renderer.trails.delete(entity);
    }
  }
}

// Reusable quaternion for bolt orientation
const boltQuat = new THREE.Quaternion();
const boltForward = new THREE.Vector3(0, 1, 0); // Cylinder points in +Y

/** Updates a single trail with new position */
function updateTrail(
  trail: ProjectileTrail,
  position: THREE.Vector3,
  direction: THREE.Vector3,
): void {
  const {
    positions,
    colors,
    orderedPositions,
    writeIndex,
    trailLength,
    baseColor,
  } = trail;

  // Write new position at current index
  const idx = writeIndex * 3;
  positions[idx] = position.x;
  positions[idx + 1] = position.y;
  positions[idx + 2] = position.z;

  // Advance write index (ring buffer)
  trail.writeIndex = (writeIndex + 1) % trailLength;
  trail.pointCount = Math.min(trail.pointCount + 1, trailLength);

  // Rebuild position array in order (oldest to newest) for line rendering
  // Uses pre-allocated orderedPositions buffer (no per-frame allocation)
  for (let i = 0; i < trail.pointCount; i++) {
    // Read from ring buffer in order (oldest first)
    const readIdx =
      ((trail.writeIndex - trail.pointCount + i + trailLength) % trailLength) *
      3;
    const writeIdx = i * 3;

    orderedPositions[writeIdx] = positions[readIdx] as number;
    orderedPositions[writeIdx + 1] = positions[readIdx + 1] as number;
    orderedPositions[writeIdx + 2] = positions[readIdx + 2] as number;

    // Color fades from dim (oldest) to bright (newest)
    const intensity = (i + 1) / trail.pointCount;
    colors[writeIdx] = baseColor.r * intensity;
    colors[writeIdx + 1] = baseColor.g * intensity;
    colors[writeIdx + 2] = baseColor.b * intensity;
  }

  // Update geometry with ordered positions (direct copy from pre-allocated buffer)
  const posAttr = trail.line.geometry.getAttribute('position');
  const colorAttr = trail.line.geometry.getAttribute('color');
  const posArray = posAttr.array as Float32Array;

  for (let i = 0; i < trail.pointCount * 3; i++) {
    posArray[i] = orderedPositions[i] as number;
  }

  posAttr.needsUpdate = true;
  colorAttr.needsUpdate = true;

  // Update draw range to only render valid points
  trail.line.geometry.setDrawRange(0, trail.pointCount);

  // Update bolt position and orientation
  trail.bolt.position.copy(position);
  boltQuat.setFromUnitVectors(boltForward, direction);
  trail.bolt.quaternion.copy(boltQuat);
}

/** Dispose a single trail's resources */
function disposeTrail(trail: ProjectileTrail, scene: THREE.Scene): void {
  scene.remove(trail.line);
  scene.remove(trail.bolt);
  trail.line.geometry.dispose();
  (trail.line.material as THREE.Material).dispose();
  // Note: bolt geometry is shared (not cloned), so don't dispose it per-trail
  (trail.bolt.material as THREE.Material).dispose();
}

/** Disposes of trail renderer resources */
export function disposeTrailRenderer(
  renderer: TrailRenderer,
  scene: THREE.Scene,
): void {
  // Dispose active trails
  for (const trail of renderer.trails.values()) {
    disposeTrail(trail, scene);
  }
  renderer.trails.clear();

  // Dispose pooled trails (important: these are still in the scene, just hidden)
  for (const trail of renderer.pool) {
    disposeTrail(trail, scene);
  }
  renderer.pool.length = 0;

  // Dispose shared geometries
  renderer.energyBoltGeometry.dispose();
  renderer.ballisticBoltGeometry.dispose();
  renderer.capsuleBoltGeometry.dispose();
  renderer.scene = null;
}
