/**
 * Procedural space skybox - based on wwwtyro's space-3d approach.
 * Uses 4D Perlin noise with 3D vector displacement for seamless cubemap.
 * https://tools.wwwtyro.net/space-3d/index.html
 */

import * as THREE from 'three';
import { createMT } from '../../core/mersenne-twister';
import {
  skyboxFragmentShader,
  skyboxVertexShader,
  starFragmentShader,
  starVertexShader,
} from './shaders/skybox.glsl';
import {
  HALO_FALLOFF_BASE,
  HALO_MAX_COUNT,
  NEBULA_MAX_COUNT,
  RNG_OFFSET_SUN,
} from './skybox-constants';
import { generateParams, randomVec3Normalized } from './skybox-params';
import { createStarGeometry } from './skybox-stars';

export interface SkyboxConfig {
  seed: string;
  resolution?: number;
}

export const DEFAULT_SKYBOX_CONFIG: SkyboxConfig = {
  seed: '7alzyiphy3k0',
  resolution: 2048,
};

function pad<T>(arr: T[], len: number, def: T): T[] {
  return [...arr, ...Array(len - arr.length).fill(def)];
}

/** Generate skybox cubemap texture */
export function generateSkyboxTexture(
  renderer: THREE.WebGLRenderer,
  config: Partial<SkyboxConfig> = {},
): THREE.CubeTexture {
  const cfg = { ...DEFAULT_SKYBOX_CONFIG, ...config };
  const resolution = cfg.resolution ?? 1024;
  const params = generateParams(cfg.seed);

  // Create cube render target (no mipmaps to preserve small star detail)
  const cubeRT = new THREE.WebGLCubeRenderTarget(resolution, {
    format: THREE.RGBAFormat,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  // Create cube camera (near=0.1, far=256 matches bundle.js exactly)
  const cubeCamera = new THREE.CubeCamera(0.1, 256, cubeRT);

  const skyboxScene = new THREE.Scene();

  // Point stars
  const starGeometry = createStarGeometry(cfg.seed);
  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
  });

  // Render star layers with accumulated rotations
  let renderOrder = 0;
  const accumulatedRotation = new THREE.Matrix4();
  for (const rotation of params.starRotations) {
    accumulatedRotation.premultiply(rotation);
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.applyMatrix4(accumulatedRotation.clone());
    starMesh.renderOrder = renderOrder++;
    skyboxScene.add(starMesh);
  }

  // Add nebula/halos/sun box with alpha blending
  const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
  const uniforms = {
    uNebulaColors: {
      value: pad(
        params.nebulae.map((n) => n.color),
        NEBULA_MAX_COUNT,
        new THREE.Vector3(),
      ),
    },
    uNebulaOffsets: {
      value: pad(
        params.nebulae.map((n) => n.offset),
        NEBULA_MAX_COUNT,
        new THREE.Vector3(),
      ),
    },
    uNebulaScales: {
      value: pad(
        params.nebulae.map((n) => n.scale),
        NEBULA_MAX_COUNT,
        0.5,
      ),
    },
    uNebulaIntensities: {
      value: pad(
        params.nebulae.map((n) => n.intensity),
        NEBULA_MAX_COUNT,
        1,
      ),
    },
    uNebulaFalloffs: {
      value: pad(
        params.nebulae.map((n) => n.falloff),
        NEBULA_MAX_COUNT,
        4,
      ),
    },
    uNebulaCount: { value: params.nebulae.length },
    uHaloDirections: {
      value: pad(
        params.starHalos.map((h) => h.direction),
        HALO_MAX_COUNT,
        new THREE.Vector3(),
      ),
    },
    uHaloColors: {
      value: pad(
        params.starHalos.map((h) => h.color),
        HALO_MAX_COUNT,
        new THREE.Vector3(),
      ),
    },
    uHaloSizes: {
      value: pad(
        params.starHalos.map((h) => h.size),
        HALO_MAX_COUNT,
        0,
      ),
    },
    uHaloFalloffs: {
      value: pad(
        params.starHalos.map((h) => h.falloff),
        HALO_MAX_COUNT,
        HALO_FALLOFF_BASE,
      ),
    },
    uHaloCount: { value: params.starHalos.length },
    uSunDirection: { value: params.sun.direction },
    uSunColor: { value: params.sun.color },
    uSunSize: { value: params.sun.size },
    uSunFalloff: { value: params.sun.falloff },
  };

  const nebulaMaterial = new THREE.ShaderMaterial({
    vertexShader: skyboxVertexShader,
    fragmentShader: skyboxFragmentShader,
    uniforms,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const nebulaMesh = new THREE.Mesh(boxGeometry, nebulaMaterial);
  nebulaMesh.renderOrder = renderOrder;
  skyboxScene.add(nebulaMesh);

  // Render the cubemap
  cubeCamera.update(renderer, skyboxScene);

  // Extract texture before disposing render target
  const texture = cubeRT.texture;

  // Cleanup (render target frame buffer, not the texture itself)
  nebulaMaterial.dispose();
  boxGeometry.dispose();
  starGeometry.dispose();
  starMaterial.dispose();
  // Note: We don't dispose cubeRT as that would destroy the texture we're returning.
  // The caller owns the texture and should dispose it when done.

  return texture;
}

/** Get sun direction from seed for lighting */
export function getSunDirectionFromSeed(seed: string): THREE.Vector3 {
  const rng = createMT(seed, RNG_OFFSET_SUN);
  return randomVec3Normalized(rng);
}
