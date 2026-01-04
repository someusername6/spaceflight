/**
 * Skybox Param Generation - Generates random parameters for nebulae, halos, sun.
 */

import * as THREE from 'three';
import { createMT } from '../../core/mersenne-twister';
import {
  HALO_CONTINUE_CHANCE,
  HALO_FALLOFF_BASE,
  HALO_MAX_COUNT,
  NEBULA_CONTINUE_CHANCE,
  NEBULA_FALLOFF_MAX,
  NEBULA_FALLOFF_MIN,
  NEBULA_INTENSITY_MAX,
  NEBULA_INTENSITY_MIN,
  NEBULA_MAX_COUNT,
  NEBULA_OFFSET_RANGE,
  NEBULA_SCALE_MAX,
  NEBULA_SCALE_MIN,
  RNG_OFFSET_NEBULAE,
  RNG_OFFSET_ROTATIONS,
  RNG_OFFSET_STAR_HALOS,
  RNG_OFFSET_SUN,
  ROTATION_CONTINUE_CHANCE,
  ROTATION_MAX_LAYERS,
  SUN_FALLOFF_MAX,
  SUN_FALLOFF_MIN,
  SUN_SIZE_MAX,
  SUN_SIZE_MIN,
} from './skybox-constants';

export interface NebulaParams {
  color: THREE.Vector3;
  offset: THREE.Vector3;
  scale: number;
  intensity: number;
  falloff: number;
}

export interface HaloParams {
  direction: THREE.Vector3;
  color: THREE.Vector3;
  size: number;
  falloff: number;
}

export interface SunParams {
  direction: THREE.Vector3;
  color: THREE.Vector3;
  size: number;
  falloff: number;
}

export interface SkyboxParams {
  nebulae: NebulaParams[];
  starHalos: HaloParams[];
  sun: SunParams;
  starRotations: THREE.Matrix4[];
}

function randomRotation(rng: { random: () => number }): THREE.Matrix4 {
  const mat = new THREE.Matrix4();
  mat.makeRotationX(rng.random() * Math.PI * 2);
  const rotY = new THREE.Matrix4().makeRotationY(rng.random() * Math.PI * 2);
  const rotZ = new THREE.Matrix4().makeRotationZ(rng.random() * Math.PI * 2);
  mat.multiply(rotY).multiply(rotZ);
  return mat;
}

export function randomVec3Normalized(rng: {
  random: () => number;
}): THREE.Vector3 {
  const rot = randomRotation(rng);
  const v = new THREE.Vector3(0, 0, 1);
  v.applyMatrix4(rot);
  return v.normalize();
}

export function generateParams(seed: string): SkyboxParams {
  // Star rotations (multiple rotation layers)
  const rngR = createMT(seed, RNG_OFFSET_ROTATIONS);
  const starRotations: THREE.Matrix4[] = [];
  while (true) {
    starRotations.push(randomRotation(rngR));
    if (
      rngR.random() < ROTATION_CONTINUE_CHANCE ||
      starRotations.length >= ROTATION_MAX_LAYERS
    )
      break;
  }

  // Nebulae
  const rngN = createMT(seed, RNG_OFFSET_NEBULAE);
  const nebulae: SkyboxParams['nebulae'] = [];
  while (true) {
    const scaleRange = NEBULA_SCALE_MAX - NEBULA_SCALE_MIN;
    const intensityRange = NEBULA_INTENSITY_MAX - NEBULA_INTENSITY_MIN;
    const falloffRange = NEBULA_FALLOFF_MAX - NEBULA_FALLOFF_MIN;
    // Bias colors toward dark (pow 2.5 gives avg ~0.28 instead of 0.5)
    const colorBias = 2.5;
    nebulae.push({
      scale: rngN.random() * scaleRange + NEBULA_SCALE_MIN,
      color: new THREE.Vector3(
        rngN.random() ** colorBias,
        rngN.random() ** colorBias,
        rngN.random() ** colorBias,
      ),
      intensity: rngN.random() * intensityRange + NEBULA_INTENSITY_MIN,
      falloff: rngN.random() * falloffRange + NEBULA_FALLOFF_MIN,
      offset: new THREE.Vector3(
        rngN.random() * NEBULA_OFFSET_RANGE * 2 - NEBULA_OFFSET_RANGE,
        rngN.random() * NEBULA_OFFSET_RANGE * 2 - NEBULA_OFFSET_RANGE,
        rngN.random() * NEBULA_OFFSET_RANGE * 2 - NEBULA_OFFSET_RANGE,
      ),
    });
    if (
      rngN.random() < NEBULA_CONTINUE_CHANCE ||
      nebulae.length >= NEBULA_MAX_COUNT
    )
      break;
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
    if (
      rngS.random() < HALO_CONTINUE_CHANCE ||
      starHalos.length >= HALO_MAX_COUNT
    )
      break;
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
