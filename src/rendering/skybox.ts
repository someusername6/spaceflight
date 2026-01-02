/**
 * Procedural space skybox - based on wwwtyro's space-3d approach.
 * Uses 4D Perlin noise with 3D vector displacement for seamless cubemap.
 * https://tools.wwwtyro.net/space-3d/index.html
 */

import * as THREE from 'three';
import { createMT } from '../core/mersenne-twister';
import { noise4DGLSL } from './shaders/noise4d.glsl';
import { createStarGeometry } from './skybox-stars';

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
  const int steps = 6;
  float scale = pow(2.0, float(steps)); // 64.0
  vec3 displace = vec3(0.0);
  for (int i = 0; i < steps; i++) {
    displace = vec3(
      noise(p.xyz * scale + displace),
      noise(p.yzx * scale + displace),
      noise(p.zxy * scale + displace)
    );
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

interface SkyboxParams {
  nebulae: Array<{
    color: THREE.Vector3;
    offset: THREE.Vector3;
    scale: number;
    intensity: number;
    falloff: number;
  }>;
  starHalos: Array<{
    direction: THREE.Vector3;
    color: THREE.Vector3;
    size: number;
    falloff: number;
  }>;
  sun: {
    direction: THREE.Vector3;
    color: THREE.Vector3;
    size: number;
    falloff: number;
  };
  starRotations: THREE.Matrix4[];
}

function generateParams(seed: string): SkyboxParams {
  // Nebulae (matches bundle.js nebulaParams)
  const rngN = createMT(seed, 2000);
  const nebulae: SkyboxParams['nebulae'] = [];
  while (true) {
    nebulae.push({
      scale: rngN.random() * 0.5 + 0.25, // 0.25-0.75
      color: new THREE.Vector3(rngN.random(), rngN.random(), rngN.random()),
      intensity: rngN.random() * 0.2 + 0.9, // 0.9-1.1
      falloff: rngN.random() * 3.0 + 3.0, // 3.0-6.0
      offset: new THREE.Vector3(
        rngN.random() * 2000 - 1000, // -1000 to 1000
        rngN.random() * 2000 - 1000,
        rngN.random() * 2000 - 1000
      ),
    });
    if (rngN.random() < 0.5 || nebulae.length >= 5) break;
  }

  // Star halos (matches bundle.js starParams with pStar shader)
  const rngS = createMT(seed, 3000);
  const starHalos: SkyboxParams['starHalos'] = [];
  while (true) {
    starHalos.push({
      direction: randomVec3Normalized(rngS),
      color: new THREE.Vector3(1, 1, 1), // white
      size: 0.0, // uSize = 0
      falloff: rngS.random() * Math.pow(2, 20) + Math.pow(2, 20), // huge falloff
    });
    if (rngS.random() < 0.01 || starHalos.length >= 9) break;
  }

  // Sun (matches bundle.js sunParams with pSun shader)
  const rngSun = createMT(seed, 4000);
  const sun = {
    direction: randomVec3Normalized(rngSun),
    color: new THREE.Vector3(rngSun.random(), rngSun.random(), rngSun.random()),
    size: rngSun.random() * 0.0001 + 0.0001, // 0.0001-0.0002
    falloff: rngSun.random() * 16.0 + 8.0, // 8-24
  };

  // Star rotations (matches bundle.js pStarParams - multiple rotation layers)
  const rngR = createMT(seed, 1000);
  const starRotations: THREE.Matrix4[] = [];
  while (true) {
    starRotations.push(randomRotation(rngR));
    if (rngR.random() < 0.2 || starRotations.length >= 5) break;
  }

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
      value: pad(params.nebulae.map((n) => n.color), 5, new THREE.Vector3()),
    },
    uNebulaOffsets: {
      value: pad(params.nebulae.map((n) => n.offset), 5, new THREE.Vector3()),
    },
    uNebulaScales: {
      value: pad(params.nebulae.map((n) => n.scale), 5, 0.5),
    },
    uNebulaIntensities: {
      value: pad(params.nebulae.map((n) => n.intensity), 5, 1),
    },
    uNebulaFalloffs: {
      value: pad(params.nebulae.map((n) => n.falloff), 5, 4),
    },
    uNebulaCount: { value: params.nebulae.length },
    uHaloDirections: {
      value: pad(params.starHalos.map((h) => h.direction), 9, new THREE.Vector3()),
    },
    uHaloColors: {
      value: pad(params.starHalos.map((h) => h.color), 9, new THREE.Vector3()),
    },
    uHaloSizes: {
      value: pad(params.starHalos.map((h) => h.size), 9, 0),
    },
    uHaloFalloffs: {
      value: pad(params.starHalos.map((h) => h.falloff), 9, Math.pow(2, 20)),
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

  // Cleanup
  nebulaMaterial.dispose();
  boxGeometry.dispose();
  starGeometry.dispose();
  starMaterial.dispose();

  return cubeRT.texture;
}

/** Get sun direction from seed for lighting */
export function getSunDirectionFromSeed(seed: string): THREE.Vector3 {
  const rng = createMT(seed, 4000);
  return randomVec3Normalized(rng);
}
