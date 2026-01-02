/**
 * Procedural space skybox - faithful port of wwwtyro's space-2d.
 * https://github.com/wwwtyro/space-2d
 */

import * as THREE from 'three';
import { MersenneTwister, createMT } from '../core/mersenne-twister';

export interface SkyboxConfig {
  seed: string;
  resolution?: number;
  noiseSeedOffset?: number;
}

export const DEFAULT_SKYBOX_CONFIG: SkyboxConfig = {
  seed: '7alzyiphy3k0',
  resolution: 1024,
  noiseSeedOffset: 4000,
};

// Fragment shader for nebula, stars, sun, and point stars
const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tNoise;
uniform float tNoiseSize;
uniform sampler2D tStars;
uniform vec2 uResolution;
uniform float uScale;

uniform vec3 uNebulaColors[5];
uniform vec2 uNebulaOffsets[5];
uniform float uNebulaScales[5];
uniform float uNebulaDensities[5];
uniform float uNebulaFalloffs[5];
uniform int uNebulaCount;

uniform vec2 uStarCenters[9];
uniform vec3 uStarHaloColors[9];
uniform float uStarHaloFalloffs[9];
uniform int uStarCount;

uniform vec2 uSunCenter;
uniform vec3 uSunHaloColor;
uniform float uSunCoreRadius;
uniform float uSunHaloFalloff;

float smootherstep(float a, float b, float r) {
  r = clamp(r, 0.0, 1.0);
  r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);
  return mix(a, b, r);
}

float perlin_2d(vec2 p) {
  vec2 p0 = floor(p);
  vec2 d0 = texture2D(tNoise, p0 / tNoiseSize).ba * 2.0 - 1.0;
  vec2 d1 = texture2D(tNoise, (p0 + vec2(1.0, 0.0)) / tNoiseSize).ba * 2.0 - 1.0;
  vec2 d2 = texture2D(tNoise, (p0 + vec2(1.0, 1.0)) / tNoiseSize).ba * 2.0 - 1.0;
  vec2 d3 = texture2D(tNoise, (p0 + vec2(0.0, 1.0)) / tNoiseSize).ba * 2.0 - 1.0;
  vec2 f = fract(p);
  float dp0 = dot(d0, f);
  float dp1 = dot(d1, f - vec2(1.0, 0.0));
  float dp2 = dot(d2, f - vec2(1.0, 1.0));
  float dp3 = dot(d3, f - vec2(0.0, 1.0));
  float m01 = smootherstep(dp0, dp1, f.x);
  float m32 = smootherstep(dp3, dp2, f.x);
  return smootherstep(m01, m32, f.y);
}

float noise(vec2 p, vec2 offset) {
  p += offset;
  float scale = 32.0;
  float displace = 0.0;
  for (int i = 0; i < 5; i++) {
    displace = perlin_2d(p * scale + displace) * 0.5 + 0.5;
    scale *= 0.5;
  }
  return perlin_2d(p + displace) * 0.5 + 0.5;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / uResolution;

  // Start with point stars
  vec3 color = texture2D(tStars, uv).rgb;

  // Nebulae
  for (int i = 0; i < 5; i++) {
    if (i >= uNebulaCount) break;
    float n = noise(fragCoord * uNebulaScales[i], uNebulaOffsets[i]);
    n = pow(n + uNebulaDensities[i], uNebulaFalloffs[i]);
    color = mix(color, uNebulaColors[i], n);
  }

  // Star halos
  for (int i = 0; i < 9; i++) {
    if (i >= uStarCount) break;
    float d = length(fragCoord - uStarCenters[i] * uResolution) / uScale;
    float e = 1.0 - exp(-d * uStarHaloFalloffs[i]);
    vec3 rgb = mix(vec3(1.0), uStarHaloColors[i], e);
    color = color + rgb * (1.0 - e);
  }

  // Sun
  float d = length(fragCoord - uSunCenter * uResolution) / uScale;
  if (d <= uSunCoreRadius) {
    color = vec3(1.0);
  } else {
    float e = 1.0 - exp(-(d - uSunCoreRadius) * uSunHaloFalloff);
    vec3 rgb = mix(vec3(1.0), uSunHaloColor, e);
    color = color + rgb * (1.0 - e);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function generateNoiseTexture(size: number, rng: MersenneTwister): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const angle = rng.random() * Math.PI * 2;
    data[i * 4 + 2] = Math.round((Math.cos(angle) * 0.5 + 0.5) * 255);
    data[i * 4 + 3] = Math.round((Math.sin(angle) * 0.5 + 0.5) * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function generateStarsTexture(w: number, h: number, rng: MersenneTwister): THREE.DataTexture {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = 255; // Alpha
  const count = Math.round(w * h * 0.05); // 5% density
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng.random() * w * h);
    const c = Math.min(255, Math.round(255 * Math.log(1 - rng.random()) * -0.125));
    data[idx * 4] = data[idx * 4 + 1] = data[idx * 4 + 2] = c;
  }
  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface SkyboxParams {
  nebulaCount: number;
  nebulae: Array<{ offset: [number, number]; scale: number; color: [number, number, number]; density: number; falloff: number }>;
  starCount: number;
  stars: Array<{ center: [number, number]; haloColor: [number, number, number]; haloFalloff: number }>;
  sun: { center: [number, number]; coreRadius: number; haloColor: [number, number, number]; haloFalloff: number };
}

function generateParams(seed: string, width: number, height: number): SkyboxParams {
  const scale = Math.max(width, height);
  const rngN = createMT(seed, 1000);
  const nebulaCount = Math.round(rngN.random() * 4 + 1);
  const nebulae: SkyboxParams['nebulae'] = [];
  for (let i = 0; i < nebulaCount; i++) {
    nebulae.push({
      offset: [rngN.random() * 100, rngN.random() * 100],
      scale: (rngN.random() * 2 + 1) / scale,
      color: [rngN.random(), rngN.random(), rngN.random()],
      density: rngN.random() * 0.2,
      falloff: rngN.random() * 2.0 + 3.0,
    });
  }
  const rngS = createMT(seed, 2000);
  const starCount = Math.round(rngS.random() * 8 + 1);
  const stars: SkyboxParams['stars'] = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      center: [rngS.random(), rngS.random()],
      haloColor: [rngS.random(), rngS.random(), rngS.random()],
      haloFalloff: rngS.random() * 1024 + 32,
    });
  }
  const rngSun = createMT(seed, 3000);
  return {
    nebulaCount, nebulae, starCount, stars,
    sun: {
      center: [rngSun.random(), rngSun.random()],
      coreRadius: rngSun.random() * 0.025 + 0.025,
      haloColor: [rngSun.random(), rngSun.random(), rngSun.random()],
      haloFalloff: rngSun.random() * 32 + 32,
    },
  };
}

function renderSkyboxTexture(
  renderer: THREE.WebGLRenderer, width: number, height: number,
  noiseTexture: THREE.DataTexture, starsTexture: THREE.DataTexture, params: SkyboxParams
): THREE.Texture {
  const scale = Math.max(width, height);
  const pad = <T>(arr: T[], len: number, def: T) => [...arr, ...Array(len - arr.length).fill(def)];

  const uniforms = {
    tNoise: { value: noiseTexture },
    tNoiseSize: { value: 256 },
    tStars: { value: starsTexture },
    uResolution: { value: new THREE.Vector2(width, height) },
    uScale: { value: scale },
    uNebulaColors: { value: pad(params.nebulae.map(n => new THREE.Vector3(...n.color)), 5, new THREE.Vector3()) },
    uNebulaOffsets: { value: pad(params.nebulae.map(n => new THREE.Vector2(...n.offset)), 5, new THREE.Vector2()) },
    uNebulaScales: { value: pad(params.nebulae.map(n => n.scale), 5, 0.002) },
    uNebulaDensities: { value: pad(params.nebulae.map(n => n.density), 5, 0.1) },
    uNebulaFalloffs: { value: pad(params.nebulae.map(n => n.falloff), 5, 4.0) },
    uNebulaCount: { value: params.nebulaCount },
    uStarCenters: { value: pad(params.stars.map(s => new THREE.Vector2(...s.center)), 9, new THREE.Vector2()) },
    uStarHaloColors: { value: pad(params.stars.map(s => new THREE.Vector3(...s.haloColor)), 9, new THREE.Vector3()) },
    uStarHaloFalloffs: { value: pad(params.stars.map(s => s.haloFalloff), 9, 100) },
    uStarCount: { value: params.starCount },
    uSunCenter: { value: new THREE.Vector2(...params.sun.center) },
    uSunHaloColor: { value: new THREE.Vector3(...params.sun.haloColor) },
    uSunCoreRadius: { value: params.sun.coreRadius },
    uSunHaloFalloff: { value: params.sun.haloFalloff },
  };

  const rt = new THREE.WebGLRenderTarget(width, height);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  material.dispose();

  return rt.texture;
}

/** Generate skybox texture (point stars, nebula, star halos, sun) */
export function generateSkyboxTexture(
  renderer: THREE.WebGLRenderer,
  config: Partial<SkyboxConfig> = {}
): THREE.Texture {
  const cfg = { ...DEFAULT_SKYBOX_CONFIG, ...config };
  const width = (cfg.resolution ?? 1024) * 2;
  const height = cfg.resolution ?? 1024;

  const noiseTexture = generateNoiseTexture(256, createMT(cfg.seed, cfg.noiseSeedOffset ?? 4000));
  const starsTexture = generateStarsTexture(width, height, createMT(cfg.seed, 0));
  const params = generateParams(cfg.seed, width, height);
  const texture = renderSkyboxTexture(renderer, width, height, noiseTexture, starsTexture, params);

  texture.mapping = THREE.EquirectangularReflectionMapping;
  noiseTexture.dispose();
  starsTexture.dispose();

  return texture;
}

/** Get sun direction from seed for lighting */
export function getSunDirectionFromSeed(seed: string): THREE.Vector3 {
  const rng = createMT(seed, 3000);
  const theta = rng.random() * Math.PI * 2;
  const phi = rng.random() * Math.PI;
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
}
