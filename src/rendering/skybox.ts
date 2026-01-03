/**
 * Procedural space skybox - based on wwwtyro's space-3d approach.
 * Uses 4D Perlin noise with 3D vector displacement for seamless cubemap.
 * https://tools.wwwtyro.net/space-3d/index.html
 */

import * as THREE from 'three';
import { createMT } from '../core/mersenne-twister';
import { noise4DGLSL } from './shaders/noise4d.glsl';
import { createStarGeometry } from './skybox-stars';
import {
  RNG_OFFSET_ROTATIONS, RNG_OFFSET_NEBULAE, RNG_OFFSET_STAR_HALOS, RNG_OFFSET_SUN,
  NEBULA_MAX_COUNT, NEBULA_SCALE_MIN, NEBULA_SCALE_MAX,
  NEBULA_INTENSITY_MIN, NEBULA_INTENSITY_MAX, NEBULA_FALLOFF_MIN, NEBULA_FALLOFF_MAX,
  NEBULA_OFFSET_RANGE, NEBULA_CONTINUE_CHANCE,
  HALO_MAX_COUNT, HALO_FALLOFF_BASE, HALO_CONTINUE_CHANCE,
  SUN_SIZE_MIN, SUN_SIZE_MAX, SUN_FALLOFF_MIN, SUN_FALLOFF_MAX,
  ROTATION_MAX_LAYERS, ROTATION_CONTINUE_CHANCE,
} from './skybox-constants';

export interface SkyboxConfig {
  seed: string;
  resolution?: number;
}

export const DEFAULT_SKYBOX_CONFIG: SkyboxConfig = {
  seed: '7alzyiphy3k0',
  resolution: 1024,
};

const skyboxFragmentShader = /* glsl */ `
precision highp float;
varying vec3 vPosition;
uniform vec3 uNebulaColors[5], uNebulaOffsets[5];
uniform float uNebulaScales[5], uNebulaIntensities[5], uNebulaFalloffs[5];
uniform int uNebulaCount;
uniform vec3 uHaloDirections[9], uHaloColors[9];
uniform float uHaloSizes[9], uHaloFalloffs[9];
uniform int uHaloCount;
uniform vec3 uSunDirection, uSunColor;
uniform float uSunSize, uSunFalloff;

${noise4DGLSL}

float noise(vec3 p) {
  return 0.5 * cnoise(vec4(p, 0.0)) + 0.5;
}

float nebula(vec3 p) {
  float scale = 64.0; vec3 displace = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    displace = vec3(noise(p.xyz * scale + displace), noise(p.yzx * scale + displace), noise(p.zxy * scale + displace));
    scale *= 0.5;
  }
  return noise(p * scale + displace);
}

void main() {
  vec3 dir = normalize(vPosition);
  vec3 color = vec3(0.0);

  for (int i = 0; i < 5; i++) { // Nebulae
    if (i >= uNebulaCount) break;
    vec3 posn = dir * uNebulaScales[i];
    float c = min(1.0, nebula(posn + uNebulaOffsets[i]) * uNebulaIntensities[i]);
    color += uNebulaColors[i] * pow(c, uNebulaFalloffs[i]);
  }
  for (int i = 0; i < 9; i++) { // Star halos
    if (i >= uHaloCount) break;
    float d = 1.0 - clamp(dot(dir, uHaloDirections[i]), 0.0, 1.0);
    color += uHaloColors[i] * exp(-(d - uHaloSizes[i]) * uHaloFalloffs[i]);
  }
  // Sun
  float sunDot = clamp(dot(dir, uSunDirection), 0.0, 1.0);
  float sunC = smoothstep(1.0 - uSunSize * 32.0, 1.0 - uSunSize, sunDot);
  sunC += pow(sunDot, uSunFalloff) * 0.5;
  vec3 sunColor = mix(uSunColor, vec3(1.0, 1.0, 1.0), sunC);
  color += sunColor * sunC;

  gl_FragColor = vec4(color, 1.0);
}
`;

const skyboxVertexShader = /* glsl */ `
varying vec3 vPosition;
void main() {
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

interface NebulaParams { color: THREE.Vector3; offset: THREE.Vector3; scale: number; intensity: number; falloff: number; }
interface HaloParams { direction: THREE.Vector3; color: THREE.Vector3; size: number; falloff: number; }
interface SunParams { direction: THREE.Vector3; color: THREE.Vector3; size: number; falloff: number; }
interface SkyboxParams { nebulae: NebulaParams[]; starHalos: HaloParams[]; sun: SunParams; starRotations: THREE.Matrix4[]; }

function generateParams(seed: string): SkyboxParams {
  // Star rotations (multiple rotation layers)
  const rngR = createMT(seed, RNG_OFFSET_ROTATIONS);
  const starRotations: THREE.Matrix4[] = [];
  while (true) {
    starRotations.push(randomRotation(rngR));
    if (rngR.random() < ROTATION_CONTINUE_CHANCE || starRotations.length >= ROTATION_MAX_LAYERS) break;
  }

  // Nebulae
  const rngN = createMT(seed, RNG_OFFSET_NEBULAE);
  const nebulae: SkyboxParams['nebulae'] = [];
  while (true) {
    const scaleRange = NEBULA_SCALE_MAX - NEBULA_SCALE_MIN;
    const intensityRange = NEBULA_INTENSITY_MAX - NEBULA_INTENSITY_MIN;
    const falloffRange = NEBULA_FALLOFF_MAX - NEBULA_FALLOFF_MIN;
    nebulae.push({
      scale: rngN.random() * scaleRange + NEBULA_SCALE_MIN,
      color: new THREE.Vector3(rngN.random(), rngN.random(), rngN.random()),
      intensity: rngN.random() * intensityRange + NEBULA_INTENSITY_MIN,
      falloff: rngN.random() * falloffRange + NEBULA_FALLOFF_MIN,
      offset: new THREE.Vector3(
        rngN.random() * NEBULA_OFFSET_RANGE * 2 - NEBULA_OFFSET_RANGE,
        rngN.random() * NEBULA_OFFSET_RANGE * 2 - NEBULA_OFFSET_RANGE,
        rngN.random() * NEBULA_OFFSET_RANGE * 2 - NEBULA_OFFSET_RANGE
      ),
    });
    if (rngN.random() < NEBULA_CONTINUE_CHANCE || nebulae.length >= NEBULA_MAX_COUNT) break;
  }

  // Star halos
  const rngS = createMT(seed, RNG_OFFSET_STAR_HALOS);
  const starHalos: SkyboxParams['starHalos'] = [];
  while (true) {
    starHalos.push({
      direction: randomVec3Normalized(rngS),
      color: new THREE.Vector3(1, 1, 1),
      size: 0.0,
      falloff: rngS.random() * HALO_FALLOFF_BASE + HALO_FALLOFF_BASE,
    });
    if (rngS.random() < HALO_CONTINUE_CHANCE || starHalos.length >= HALO_MAX_COUNT) break;
  }

  // Sun
  const rngSun = createMT(seed, RNG_OFFSET_SUN);
  const sizeRange = SUN_SIZE_MAX - SUN_SIZE_MIN;
  const falloffRange = SUN_FALLOFF_MAX - SUN_FALLOFF_MIN;
  const sun = {
    direction: randomVec3Normalized(rngSun),
    color: new THREE.Vector3(rngSun.random(), rngSun.random(), rngSun.random()),
    size: rngSun.random() * sizeRange + SUN_SIZE_MIN,
    falloff: rngSun.random() * falloffRange + SUN_FALLOFF_MIN,
  };

  return { nebulae, starHalos, sun, starRotations };
}

function randomVec3Normalized(rng: { random: () => number }): THREE.Vector3 {
  const rot = randomRotation(rng);
  const v = new THREE.Vector3(0, 0, 1);
  v.applyMatrix4(rot);
  return v.normalize();
}

function randomRotation(rng: { random: () => number }): THREE.Matrix4 {
  const mat = new THREE.Matrix4();
  mat.makeRotationX(rng.random() * Math.PI * 2);
  const rotY = new THREE.Matrix4().makeRotationY(rng.random() * Math.PI * 2);
  const rotZ = new THREE.Matrix4().makeRotationZ(rng.random() * Math.PI * 2);
  mat.multiply(rotY).multiply(rotZ);
  return mat;
}

function pad<T>(arr: T[], len: number, def: T): T[] {
  return [...arr, ...Array(len - arr.length).fill(def)];
}

/** Generate skybox cubemap texture */
export function generateSkyboxTexture(
  renderer: THREE.WebGLRenderer,
  config: Partial<SkyboxConfig> = {}
): THREE.CubeTexture {
  const cfg = { ...DEFAULT_SKYBOX_CONFIG, ...config };
  const resolution = cfg.resolution ?? 1024;
  const params = generateParams(cfg.seed);

  // Create cube render target
  const cubeRT = new THREE.WebGLCubeRenderTarget(resolution, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });

  // Create cube camera
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRT);

  // Create scene
  const skyboxScene = new THREE.Scene();

  // Render order matches bundle.js:
  // 1. Point stars (multiple rotation layers)
  // 2. Star halos
  // 3. Nebulae
  // 4. Sun

  // Add point stars with multiple rotation layers (matches bundle.js pStarParams)
  const starGeometry = createStarGeometry(cfg.seed);
  const starMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  let renderOrder = 0;
  for (const rotation of params.starRotations) {
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.applyMatrix4(rotation);
    starMesh.renderOrder = renderOrder++;
    skyboxScene.add(starMesh);
  }

  // Add nebula/halos/sun box with alpha blending
  const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
  const uniforms = {
    uNebulaColors: {
      value: pad(params.nebulae.map((n) => n.color), NEBULA_MAX_COUNT, new THREE.Vector3()),
    },
    uNebulaOffsets: {
      value: pad(params.nebulae.map((n) => n.offset), NEBULA_MAX_COUNT, new THREE.Vector3()),
    },
    uNebulaScales: {
      value: pad(params.nebulae.map((n) => n.scale), NEBULA_MAX_COUNT, 0.5),
    },
    uNebulaIntensities: {
      value: pad(params.nebulae.map((n) => n.intensity), NEBULA_MAX_COUNT, 1),
    },
    uNebulaFalloffs: {
      value: pad(params.nebulae.map((n) => n.falloff), NEBULA_MAX_COUNT, 4),
    },
    uNebulaCount: { value: params.nebulae.length },
    uHaloDirections: {
      value: pad(params.starHalos.map((h) => h.direction), HALO_MAX_COUNT, new THREE.Vector3()),
    },
    uHaloColors: {
      value: pad(params.starHalos.map((h) => h.color), HALO_MAX_COUNT, new THREE.Vector3()),
    },
    uHaloSizes: {
      value: pad(params.starHalos.map((h) => h.size), HALO_MAX_COUNT, 0),
    },
    uHaloFalloffs: {
      value: pad(params.starHalos.map((h) => h.falloff), HALO_MAX_COUNT, HALO_FALLOFF_BASE),
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
