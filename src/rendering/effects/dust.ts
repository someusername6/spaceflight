/**
 * Dust Particles - Provides visual reference for movement in space.
 *
 * Uses a "tiled cube" approach: particles exist at deterministic positions
 * throughout infinite space. We tile a single cube of random positions
 * and only render particles within range of the player.
 */

import * as THREE from 'three';

/** Dust system configuration */
const CUBE_SIZE = 100;
const PARTICLES_PER_CUBE = 4;
const RENDER_DISTANCE = 600;
const PARTICLE_SIZE = 8;
const PARTICLE_COLOR = new THREE.Color(0xffffff);

/** Layer for dust particles (excluded from target camera) */
export const DUST_LAYER = 1;

// Fade distances (ship is ~40-50 units from camera)
const FADE_NEAR = 50; // Fully faded at ship distance
const FADE_MID = 150; // Fully visible here
const FADE_FAR = 500; // Start fading out
const FADE_END = 600; // Fully faded at render distance

/** Hash cube coordinates to a seed - each cube gets unique but deterministic particles */
function hashCubeCoords(cx: number, cy: number, cz: number): number {
  let h = cx * 374761393 + cy * 668265263 + cz * 1274126177;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  return h;
}

/** Generate a random value from seed, returns new seed and value */
function nextRandom(seed: number): [number, number] {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return [seed, seed / 0x7fffffff];
}

/** Simple vertex shader - just size attenuation and pass distance */
const vertexShader = /* glsl */ `
  uniform float uSize;
  varying float vDistance;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = -mvPosition.z;
    gl_PointSize = uSize * (150.0 / vDistance);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** Simple fragment shader - square with distance-based fading */
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFadeNear;
  uniform float uFadeMid;
  uniform float uFadeFar;
  uniform float uFadeEnd;

  varying float vDistance;

  void main() {
    // Near fade: 0 at uFadeNear, 1 at uFadeMid
    float nearFade = smoothstep(uFadeNear, uFadeMid, vDistance);

    // Far fade: 1 at uFadeFar, 0 at uFadeEnd
    float farFade = 1.0 - smoothstep(uFadeFar, uFadeEnd, vDistance);

    float alpha = nearFade * farFade * 0.7;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** Dust particle system state */
export interface DustSystem {
  points: THREE.Points;
  positions: Float32Array;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  maxParticles: number;
}

/** Creates the dust particle system */
export function createDustSystem(scene: THREE.Scene): DustSystem {
  const cubesPerAxis = Math.ceil((RENDER_DISTANCE * 2) / CUBE_SIZE) + 1;
  const maxParticles =
    cubesPerAxis * cubesPerAxis * cubesPerAxis * PARTICLES_PER_CUBE;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: PARTICLE_SIZE },
      uColor: { value: PARTICLE_COLOR },
      uFadeNear: { value: FADE_NEAR },
      uFadeMid: { value: FADE_MID },
      uFadeFar: { value: FADE_FAR },
      uFadeEnd: { value: FADE_END },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.layers.set(DUST_LAYER); // Only on dust layer (excluded from target camera)
  points.frustumCulled = false; // Particles reposition each frame; stale bounds would cause culling
  scene.add(points);

  return { points, positions, geometry, material, maxParticles };
}

/** Updates dust particles based on player position */
export function updateDustSystem(
  dust: DustSystem,
  playerPosition: THREE.Vector3,
): void {
  const { positions, geometry } = dust;

  const playerCubeX = Math.floor(playerPosition.x / CUBE_SIZE);
  const playerCubeY = Math.floor(playerPosition.y / CUBE_SIZE);
  const playerCubeZ = Math.floor(playerPosition.z / CUBE_SIZE);
  const cubeRadius = Math.ceil(RENDER_DISTANCE / CUBE_SIZE);

  let particleIndex = 0;
  const renderDistSq = RENDER_DISTANCE * RENDER_DISTANCE;

  for (
    let cx = playerCubeX - cubeRadius;
    cx <= playerCubeX + cubeRadius;
    cx++
  ) {
    for (
      let cy = playerCubeY - cubeRadius;
      cy <= playerCubeY + cubeRadius;
      cy++
    ) {
      for (
        let cz = playerCubeZ - cubeRadius;
        cz <= playerCubeZ + cubeRadius;
        cz++
      ) {
        const cubeOriginX = cx * CUBE_SIZE;
        const cubeOriginY = cy * CUBE_SIZE;
        const cubeOriginZ = cz * CUBE_SIZE;

        // Each cube gets unique particle positions based on its coordinates
        let seed = hashCubeCoords(cx, cy, cz);

        for (let i = 0; i < PARTICLES_PER_CUBE; i++) {
          let ox: number;
          let oy: number;
          let oz: number;
          [seed, ox] = nextRandom(seed);
          [seed, oy] = nextRandom(seed);
          [seed, oz] = nextRandom(seed);

          const worldX = cubeOriginX + ox * CUBE_SIZE;
          const worldY = cubeOriginY + oy * CUBE_SIZE;
          const worldZ = cubeOriginZ + oz * CUBE_SIZE;

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

  // setDrawRange excludes unused particles from rendering - no need to reposition them

  const positionAttr = geometry.attributes.position;
  if (positionAttr) {
    positionAttr.needsUpdate = true;
  }
  geometry.setDrawRange(0, particleIndex);
}

/** Removes dust system from scene */
export function disposeDustSystem(dust: DustSystem, scene: THREE.Scene): void {
  scene.remove(dust.points);
  dust.geometry.dispose();
  dust.material.dispose();
}
