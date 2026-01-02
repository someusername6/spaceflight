/**
 * Dust Particles - Provides visual reference for movement in space.
 *
 * Uses a "tiled cube" approach: particles exist at deterministic positions
 * throughout infinite space. We tile a single cube of random positions
 * and only render particles within range of the player.
 *
 * This ensures uniform density regardless of movement direction or speed,
 * and turning around reveals the same particles you just passed.
 */

import * as THREE from 'three';

/** Dust system configuration */
const CUBE_SIZE = 200;         // Size of the repeating cube
const PARTICLES_PER_CUBE = 80; // Particles in each cube instance
const RENDER_DISTANCE = 600;   // How far to render particles
const PARTICLE_SIZE = 0.5;
const PARTICLE_COLOR = 0x888899;

// Pre-generate the "template" cube of particle offsets
// These are deterministic random positions within a unit cube
const TEMPLATE_OFFSETS: Array<{ x: number; y: number; z: number }> = [];

// Use a seeded random for deterministic template generation
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Initialize template with seeded random
const random = seededRandom(42);
for (let i = 0; i < PARTICLES_PER_CUBE; i++) {
  TEMPLATE_OFFSETS.push({
    x: random() * CUBE_SIZE,
    y: random() * CUBE_SIZE,
    z: random() * CUBE_SIZE,
  });
}

/** Dust particle system state */
export interface DustSystem {
  points: THREE.Points;
  positions: Float32Array;
  geometry: THREE.BufferGeometry;
  maxParticles: number;
}

/** Creates the dust particle system */
export function createDustSystem(scene: THREE.Scene): DustSystem {
  // Calculate how many cubes we need to cover render distance
  const cubesPerAxis = Math.ceil((RENDER_DISTANCE * 2) / CUBE_SIZE) + 1;
  const maxParticles = cubesPerAxis * cubesPerAxis * cubesPerAxis * PARTICLES_PER_CUBE;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);

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
    maxParticles,
  };
}

/** Updates dust particles based on player position */
export function updateDustSystem(
  dust: DustSystem,
  playerPosition: THREE.Vector3,
  _playerVelocity?: THREE.Vector3
): void {
  const { positions, geometry } = dust;

  // Find which cube the player is in
  const playerCubeX = Math.floor(playerPosition.x / CUBE_SIZE);
  const playerCubeY = Math.floor(playerPosition.y / CUBE_SIZE);
  const playerCubeZ = Math.floor(playerPosition.z / CUBE_SIZE);

  // Calculate how many cubes to render in each direction
  const cubeRadius = Math.ceil(RENDER_DISTANCE / CUBE_SIZE);

  let particleIndex = 0;
  const renderDistSq = RENDER_DISTANCE * RENDER_DISTANCE;

  // Iterate over nearby cubes
  for (let cx = playerCubeX - cubeRadius; cx <= playerCubeX + cubeRadius; cx++) {
    for (let cy = playerCubeY - cubeRadius; cy <= playerCubeY + cubeRadius; cy++) {
      for (let cz = playerCubeZ - cubeRadius; cz <= playerCubeZ + cubeRadius; cz++) {
        // World position of this cube's origin
        const cubeOriginX = cx * CUBE_SIZE;
        const cubeOriginY = cy * CUBE_SIZE;
        const cubeOriginZ = cz * CUBE_SIZE;

        // Add all particles from this cube
        for (const offset of TEMPLATE_OFFSETS) {
          const worldX = cubeOriginX + offset.x;
          const worldY = cubeOriginY + offset.y;
          const worldZ = cubeOriginZ + offset.z;

          // Distance check
          const dx = worldX - playerPosition.x;
          const dy = worldY - playerPosition.y;
          const dz = worldZ - playerPosition.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq <= renderDistSq && particleIndex < dust.maxParticles) {
            const idx = particleIndex * 3;
            positions[idx] = worldX;
            positions[idx + 1] = worldY;
            positions[idx + 2] = worldZ;
            particleIndex++;
          }
        }
      }
    }
  }

  // Zero out remaining positions (move them far away)
  for (let i = particleIndex; i < dust.maxParticles; i++) {
    const idx = i * 3;
    positions[idx] = 0;
    positions[idx + 1] = 0;
    positions[idx + 2] = -999999;
  }

  geometry.attributes.position!.needsUpdate = true;
  geometry.setDrawRange(0, particleIndex);
}

/** Removes dust system from scene */
export function disposeDustSystem(dust: DustSystem, scene: THREE.Scene): void {
  scene.remove(dust.points);
  dust.geometry.dispose();
  (dust.points.material as THREE.Material).dispose();
}
