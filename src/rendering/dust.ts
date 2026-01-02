/**
 * Dust Particles - Provides visual reference for movement in space.
 *
 * Particles are stationary in world space. As the player moves,
 * they stream past, giving a sense of speed and direction.
 */

import * as THREE from 'three';

/** Dust system configuration */
const PARTICLE_COUNT = 2000;
const SPAWN_RADIUS_MIN = 50;   // Minimum distance from player (avoid dense center)
const SPAWN_RADIUS_MAX = 800;  // Maximum spawn distance
const DESPAWN_RADIUS = 900;    // Particles despawn beyond this - gives buffer for turning
const PARTICLE_SIZE = 0.5;
const PARTICLE_COLOR = 0x888899;

/** Dust particle system state */
export interface DustSystem {
  points: THREE.Points;
  positions: Float32Array;
  geometry: THREE.BufferGeometry;
}

/** Creates the dust particle system */
export function createDustSystem(scene: THREE.Scene): DustSystem {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);

  // Initialize particles at origin (will be repositioned on first update)
  for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
    positions[i] = 0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: PARTICLE_COLOR,
    size: PARTICLE_SIZE,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    points,
    positions,
    geometry,
  };
}

/** Spawns a particle at random position in shell around a point */
function spawnParticle(
  positions: Float32Array,
  idx: number,
  centerX: number,
  centerY: number,
  centerZ: number
): void {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  // Uniform distribution in spherical shell (not biased toward center)
  const r = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);

  positions[idx] = centerX + r * Math.sin(phi) * Math.cos(theta);
  positions[idx + 1] = centerY + r * Math.sin(phi) * Math.sin(theta);
  positions[idx + 2] = centerZ + r * Math.cos(phi);
}

/** Updates dust particles based on player position and velocity */
export function updateDustSystem(
  dust: DustSystem,
  playerPosition: THREE.Vector3,
  playerVelocity?: THREE.Vector3
): void {
  // Bias spawn center forward based on velocity to prevent outrunning particles
  const spawnCenter = playerPosition.clone();
  if (playerVelocity && playerVelocity.lengthSq() > 0) {
    // Offset spawn center forward by ~2 seconds of travel
    spawnCenter.addScaledVector(playerVelocity, 2.0);
  }
  const { positions, geometry } = dust;
  let needsUpdate = false;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const idx = i * 3;
    const px = positions[idx]!;
    const py = positions[idx + 1]!;
    const pz = positions[idx + 2]!;

    // Calculate distance from player
    const dx = px - playerPosition.x;
    const dy = py - playerPosition.y;
    const dz = pz - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    // Respawn if too far, too close, or uninitialized
    const tooFar = distSq > DESPAWN_RADIUS * DESPAWN_RADIUS;
    const tooClose = distSq < SPAWN_RADIUS_MIN * SPAWN_RADIUS_MIN;
    const uninitialized = distSq === 0;

    if (tooFar || tooClose || uninitialized) {
      // Spawn around biased center (ahead of player when moving)
      spawnParticle(positions, idx, spawnCenter.x, spawnCenter.y, spawnCenter.z);
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    geometry.attributes.position!.needsUpdate = true;
  }
}

/** Removes dust system from scene */
export function disposeDustSystem(dust: DustSystem, scene: THREE.Scene): void {
  scene.remove(dust.points);
  dust.geometry.dispose();
  (dust.points.material as THREE.Material).dispose();
}
