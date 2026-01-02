/**
 * Dust Particles - Provides visual reference for movement in space.
 *
 * Uses a "tiled cube" approach: particles exist at deterministic positions
 * throughout infinite space. We tile a single cube of random positions
 * and only render particles within range of the player.
 *
 * Visual improvements:
 * - Circular particles with soft edges (shader-based)
 * - Fade out when too close to camera (prevents huge blocking particles)
 * - Fade out at distance (smooth transition at render boundary)
 */

import * as THREE from 'three';

/** Dust system configuration */
const CUBE_SIZE = 120;          // Smaller cubes = more frequent particles
const PARTICLES_PER_CUBE = 8;   // Fewer per cube, but cubes are smaller
const RENDER_DISTANCE = 400;    // Tighter field, faster turnover
const PARTICLE_COLOR = new THREE.Color(0x777777);  // Darker grey

// Size attenuation parameters
const SIZE_BASE = 10.0;       // Size at reference distance
const SIZE_REF_DIST = 150.0;  // Reference distance for size calc
const MAX_POINT_SIZE = 8.0;   // Cap for very close particles
const MIN_POINT_SIZE = 2.0;   // Minimum visibility

// Distance-based fading
const FADE_NEAR_START = 20;   // Start fading when closer than this
const FADE_NEAR_END = 50;     // Fully visible at this distance
const FADE_FAR_START = 280;   // Start fading at this distance
const FADE_FAR_END = 380;     // Fully faded before render boundary

// Pre-generate the "template" cube of particle offsets
const TEMPLATE_OFFSETS: Array<{ x: number; y: number; z: number }> = [];

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const random = seededRandom(42);
for (let i = 0; i < PARTICLES_PER_CUBE; i++) {
  TEMPLATE_OFFSETS.push({
    x: random() * CUBE_SIZE,
    y: random() * CUBE_SIZE,
    z: random() * CUBE_SIZE,
  });
}

/** Vertex shader - handles size attenuation and passes distance to fragment */
const vertexShader = /* glsl */ `
  uniform float uSizeBase;
  uniform float uSizeRefDist;
  uniform float uMaxSize;
  uniform float uMinSize;

  varying float vDistance;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = -mvPosition.z;

    // Size attenuation: uSizeBase is size at uSizeRefDist distance
    // Closer = larger, farther = smaller (natural perspective)
    float size = uSizeBase * (uSizeRefDist / max(vDistance, 1.0));

    // Clamp to prevent extremes
    gl_PointSize = clamp(size, uMinSize, uMaxSize);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** Fragment shader - circular shape with distance-based fading */
const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFadeNearStart;
  uniform float uFadeNearEnd;
  uniform float uFadeFarStart;
  uniform float uFadeFarEnd;

  varying float vDistance;

  void main() {
    // Circular shape: distance from center of point sprite
    float dist = length(gl_PointCoord - vec2(0.5));

    // Discard pixels outside circle
    if (dist > 0.5) discard;

    // Soft edge falloff (fully opaque center, fade at edges)
    float edgeAlpha = 1.0 - smoothstep(0.2, 0.5, dist);

    // Near camera fade (fade out when too close to prevent huge particles)
    float nearFade = smoothstep(uFadeNearStart, uFadeNearEnd, vDistance);

    // Far distance fade (smooth transition at render boundary)
    float farFade = 1.0 - smoothstep(uFadeFarStart, uFadeFarEnd, vDistance);

    // Combine all alpha factors
    float alpha = uOpacity * edgeAlpha * nearFade * farFade;

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
  const maxParticles = cubesPerAxis * cubesPerAxis * cubesPerAxis * PARTICLES_PER_CUBE;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSizeBase: { value: SIZE_BASE },
      uSizeRefDist: { value: SIZE_REF_DIST },
      uMaxSize: { value: MAX_POINT_SIZE },
      uMinSize: { value: MIN_POINT_SIZE },
      uColor: { value: PARTICLE_COLOR },
      uOpacity: { value: 0.75 },
      uFadeNearStart: { value: FADE_NEAR_START },
      uFadeNearEnd: { value: FADE_NEAR_END },
      uFadeFarStart: { value: FADE_FAR_START },
      uFadeFarEnd: { value: FADE_FAR_END },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { points, positions, geometry, material, maxParticles };
}

/** Updates dust particles based on player position */
export function updateDustSystem(
  dust: DustSystem,
  playerPosition: THREE.Vector3,
  _playerVelocity?: THREE.Vector3
): void {
  const { positions, geometry } = dust;

  const playerCubeX = Math.floor(playerPosition.x / CUBE_SIZE);
  const playerCubeY = Math.floor(playerPosition.y / CUBE_SIZE);
  const playerCubeZ = Math.floor(playerPosition.z / CUBE_SIZE);
  const cubeRadius = Math.ceil(RENDER_DISTANCE / CUBE_SIZE);

  let particleIndex = 0;
  const renderDistSq = RENDER_DISTANCE * RENDER_DISTANCE;

  for (let cx = playerCubeX - cubeRadius; cx <= playerCubeX + cubeRadius; cx++) {
    for (let cy = playerCubeY - cubeRadius; cy <= playerCubeY + cubeRadius; cy++) {
      for (let cz = playerCubeZ - cubeRadius; cz <= playerCubeZ + cubeRadius; cz++) {
        const cubeOriginX = cx * CUBE_SIZE;
        const cubeOriginY = cy * CUBE_SIZE;
        const cubeOriginZ = cz * CUBE_SIZE;

        for (const offset of TEMPLATE_OFFSETS) {
          const worldX = cubeOriginX + offset.x;
          const worldY = cubeOriginY + offset.y;
          const worldZ = cubeOriginZ + offset.z;

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

  // Hide unused particles
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
  dust.material.dispose();
}
