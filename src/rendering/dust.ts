/**
 * Dust Particles - Provides visual reference for movement in space.
 *
 * Particles are stationary in world space. As the player moves,
 * they stream past, giving a sense of speed and direction.
 */

import * as THREE from 'three';

/** Dust system configuration */
const PARTICLE_COUNT = 1000;
const SPAWN_RADIUS = 150;      // Particles spawn within this radius of player
const DESPAWN_RADIUS = 200;    // Particles despawn beyond this radius
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

/** Updates dust particles based on player position */
export function updateDustSystem(
  dust: DustSystem,
  playerPosition: THREE.Vector3
): void {
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

    // If too far, respawn near player
    if (distSq > DESPAWN_RADIUS * DESPAWN_RADIUS || distSq === 0) {
      // Spawn at random position within spawn radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * SPAWN_RADIUS;

      positions[idx] = playerPosition.x + r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = playerPosition.y + r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = playerPosition.z + r * Math.cos(phi);
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
