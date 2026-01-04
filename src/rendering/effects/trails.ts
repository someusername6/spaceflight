/**
 * Trail Rendering - Visual trails for projectiles.
 *
 * Trails are purely visual (not ECS state). Each projectile gets a trail
 * that fades out behind it, giving a sense of speed and direction.
 *
 * Visual appearance varies by weapon type:
 * - Plasma: Green glowing spheres, medium trail
 * - Pulse: Cyan rapid-fire small bolts, short trail
 * - Ion: Blue electric orbs, medium trail
 * - Autocannon: Yellow/orange short streaks
 * - Railgun: White long piercing trails
 */

import * as THREE from 'three';
import { Faction, type FactionComponent } from '../../components/faction';
import type { Projectile, WeaponName } from '../../components/projectile';
import type { Transform } from '../../components/transform';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/** Weapon-specific visual configuration */
interface WeaponVisualConfig {
  color: THREE.Color;
  enemyColor: THREE.Color;
  trailLength: number;
  boltSize: number; // Scale for bolt mesh
  boltShape: 'sphere' | 'cylinder';
}

/** Visual configs per weapon */
const WEAPON_VISUALS: Record<string, WeaponVisualConfig> = {
  // Energy weapons
  Plasma: {
    color: new THREE.Color(0.2, 1.0, 0.4), // Bright green
    enemyColor: new THREE.Color(1.0, 0.2, 0.3), // Red-pink
    trailLength: 8,
    boltSize: 0.6,
    boltShape: 'sphere',
  },
  Pulse: {
    color: new THREE.Color(0.3, 0.9, 1.0), // Cyan
    enemyColor: new THREE.Color(1.0, 0.5, 0.2), // Orange
    trailLength: 5,
    boltSize: 0.35,
    boltShape: 'sphere',
  },
  Ion: {
    color: new THREE.Color(0.4, 0.5, 1.0), // Blue-purple
    enemyColor: new THREE.Color(1.0, 0.3, 0.5), // Magenta
    trailLength: 7,
    boltSize: 0.5,
    boltShape: 'sphere',
  },
  // Ballistic weapons
  Autocannon: {
    color: new THREE.Color(1.0, 0.85, 0.3), // Yellow-gold
    enemyColor: new THREE.Color(1.0, 0.6, 0.2), // Orange
    trailLength: 4,
    boltSize: 0.25,
    boltShape: 'cylinder',
  },
  Railgun: {
    color: new THREE.Color(1.0, 1.0, 1.0), // Pure white
    enemyColor: new THREE.Color(0.9, 0.9, 1.0), // Slight blue-white
    trailLength: 14, // Long trail
    boltSize: 0.2,
    boltShape: 'cylinder',
  },
  Flak: {
    color: new THREE.Color(1.0, 0.2, 0.2), // Red
    enemyColor: new THREE.Color(1.0, 0.3, 0.1), // Red-orange
    trailLength: 6,
    boltSize: 0.4,
    boltShape: 'sphere',
  },
  Shrapnel: {
    color: new THREE.Color(1.0, 0.9, 0.3), // Yellow (like autocannon)
    enemyColor: new THREE.Color(1.0, 0.7, 0.2), // Orange-yellow
    trailLength: 3, // Short trail
    boltSize: 0.15, // Small
    boltShape: 'cylinder',
  },
};

/** Default visual config for unknown weapons */
const DEFAULT_VISUAL: WeaponVisualConfig = {
  color: new THREE.Color(0.5, 1.0, 0.5),
  enemyColor: new THREE.Color(1.0, 0.5, 0.3),
  trailLength: 6,
  boltSize: 0.4,
  boltShape: 'sphere',
};

/** Get visual config for a weapon */
function getWeaponVisual(weaponName: WeaponName): WeaponVisualConfig {
  return WEAPON_VISUALS[weaponName] ?? DEFAULT_VISUAL;
}

// Reusable Set for tracking seen projectiles
const seenProjectiles = new Set<Entity>();

/** Trail state for one projectile */
interface ProjectileTrail {
  line: THREE.Line;
  bolt: THREE.Mesh; // Glowing bolt at projectile head
  positions: Float32Array; // Ring buffer of positions
  colors: Float32Array; // Per-vertex colors for fading
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
}

/** Creates the trail renderer */
export function createTrailRenderer(): TrailRenderer {
  return {
    trails: new Map(),
    // Energy bolts: glowing spheres
    energyBoltGeometry: new THREE.SphereGeometry(0.5, 8, 6),
    // Ballistic bolts: elongated cylinders (bullet-like)
    ballisticBoltGeometry: new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6),
  };
}

/** Creates a trail for a projectile */
function createTrail(
  renderer: TrailRenderer,
  scene: THREE.Scene,
  weaponName: WeaponName,
  faction: Faction,
  startPosition: THREE.Vector3,
): ProjectileTrail {
  const visual = getWeaponVisual(weaponName);
  const trailLength = visual.trailLength;
  const positions = new Float32Array(trailLength * 3);
  const colors = new Float32Array(trailLength * 3);

  // Initialize all positions to start position
  for (let i = 0; i < trailLength; i++) {
    const idx = i * 3;
    positions[idx] = startPosition.x;
    positions[idx + 1] = startPosition.y;
    positions[idx + 2] = startPosition.z;
  }

  // Select color based on faction (player vs enemy)
  const baseColor =
    faction === Faction.Enemy ? visual.enemyColor : visual.color;
  for (let i = 0; i < trailLength; i++) {
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

  // Create bolt mesh (projectile head)
  const boltGeometry =
    visual.boltShape === 'sphere'
      ? renderer.energyBoltGeometry.clone()
      : renderer.ballisticBoltGeometry.clone();

  const boltMaterial = new THREE.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
  bolt.position.copy(startPosition);
  bolt.scale.setScalar(visual.boltSize / 0.5); // Normalize to base size
  scene.add(bolt);

  return {
    line,
    bolt,
    positions,
    colors,
    writeIndex: 0,
    pointCount: 1,
    trailLength,
    weaponName,
    faction,
    baseColor,
  };
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
      trail = createTrail(
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

  // Remove trails for projectiles that no longer exist
  for (const [entity, trail] of renderer.trails) {
    if (!seenProjectiles.has(entity)) {
      scene.remove(trail.line);
      scene.remove(trail.bolt);
      trail.line.geometry.dispose();
      (trail.line.material as THREE.Material).dispose();
      trail.bolt.geometry.dispose();
      (trail.bolt.material as THREE.Material).dispose();
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
  const { positions, colors, writeIndex, trailLength, baseColor } = trail;

  // Write new position at current index
  const idx = writeIndex * 3;
  positions[idx] = position.x;
  positions[idx + 1] = position.y;
  positions[idx + 2] = position.z;

  // Advance write index (ring buffer)
  trail.writeIndex = (writeIndex + 1) % trailLength;
  trail.pointCount = Math.min(trail.pointCount + 1, trailLength);

  // Rebuild position array in order (oldest to newest) for line rendering
  const orderedPositions = new Float32Array(trail.pointCount * 3);

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

  // Update geometry with ordered positions
  const posAttr = trail.line.geometry.getAttribute('position');
  const colorAttr = trail.line.geometry.getAttribute('color');

  // Copy ordered positions back
  for (let i = 0; i < trail.pointCount * 3; i++) {
    (posAttr.array as Float32Array)[i] = orderedPositions[i] as number;
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

/** Disposes of trail renderer resources */
export function disposeTrailRenderer(
  renderer: TrailRenderer,
  scene: THREE.Scene,
): void {
  for (const trail of renderer.trails.values()) {
    scene.remove(trail.line);
    scene.remove(trail.bolt);
    trail.line.geometry.dispose();
    (trail.line.material as THREE.Material).dispose();
    trail.bolt.geometry.dispose();
    (trail.bolt.material as THREE.Material).dispose();
  }
  renderer.trails.clear();
  renderer.energyBoltGeometry.dispose();
  renderer.ballisticBoltGeometry.dispose();
}
