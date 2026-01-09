/**
 * Nuclear Lance Impact Effects - Flash, ring, particles, and light at hit point.
 */

import * as THREE from 'three';
import { createPRNG, random } from '../../core/prng';
import type { LanceShot, NuclearLanceRenderer } from './nuclear-lance-types';
import {
  direction,
  IMPACT_FLASH_COLOR,
  IMPACT_FLASH_DURATION,
  IMPACT_FLASH_MAX_SCALE,
  IMPACT_LIGHT_DISTANCE,
  IMPACT_LIGHT_INTENSITY,
  IMPACT_PARTICLE_COLOR,
  IMPACT_PARTICLE_COUNT,
  IMPACT_PARTICLE_SPEED,
  IMPACT_PARTICLES_DURATION,
  IMPACT_RING_COLOR,
  IMPACT_RING_DURATION,
  IMPACT_RING_MAX_SCALE,
  quaternion,
  tempColor,
} from './nuclear-lance-types';

/** Create all impact effects at hit point */
export function createImpactEffects(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
): void {
  // Impact flash sphere
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: IMPACT_FLASH_COLOR,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(renderer.sphereGeometry.clone(), flashMaterial);
  flash.position.copy(shot.hitPoint);
  flash.scale.setScalar(1);
  scene.add(flash);
  renderer.impactFlashMeshes.set(key, flash);

  // Shockwave ring
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: IMPACT_RING_COLOR,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(renderer.ringGeometry.clone(), ringMaterial);
  ring.position.copy(shot.hitPoint);
  // Orient ring perpendicular to beam direction
  direction.copy(shot.hitPoint).sub(shot.origin).normalize();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  ring.quaternion.copy(quaternion);
  ring.scale.setScalar(1);
  scene.add(ring);
  renderer.impactRings.set(key, ring);

  // Impact point light
  const light = new THREE.PointLight(
    IMPACT_FLASH_COLOR,
    IMPACT_LIGHT_INTENSITY,
    IMPACT_LIGHT_DISTANCE,
  );
  light.position.copy(shot.hitPoint);
  scene.add(light);
  renderer.impactLights.set(key, light);

  // Impact particles
  createImpactParticles(renderer, scene, key, shot);
}

/** Create impact particle system */
function createImpactParticles(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
): void {
  // Generate random velocities (seeded for determinism)
  const velocities = new Float32Array(IMPACT_PARTICLE_COUNT * 3);
  const prng = createPRNG(shot.entitySeed);

  for (let i = 0; i < IMPACT_PARTICLE_COUNT; i++) {
    const theta = random(prng) * Math.PI * 2;
    const phi = Math.acos(2 * random(prng) - 1);

    const idx = i * 3;
    velocities[idx] = Math.sin(phi) * Math.cos(theta);
    velocities[idx + 1] = Math.sin(phi) * Math.sin(theta);
    velocities[idx + 2] = Math.cos(phi);
  }
  renderer.particleVelocities.set(key, velocities);

  // Create particle positions (start at impact point)
  const positions = new Float32Array(IMPACT_PARTICLE_COUNT * 3);
  for (let i = 0; i < IMPACT_PARTICLE_COUNT; i++) {
    const idx = i * 3;
    positions[idx] = shot.hitPoint.x;
    positions[idx + 1] = shot.hitPoint.y;
    positions[idx + 2] = shot.hitPoint.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: IMPACT_PARTICLE_COLOR,
    size: 2.5,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  renderer.impactParticles.set(key, particles);
}

/** Update all impact effects */
export function updateImpactEffects(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
  age: number,
): void {
  updateImpactFlash(renderer, scene, key, age);
  updateImpactRing(renderer, scene, key, age);
  updateImpactLight(renderer, scene, key, age);
  updateImpactParticles(renderer, scene, key, shot, age);
}

/** Update impact flash sphere */
function updateImpactFlash(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  age: number,
): void {
  const flash = renderer.impactFlashMeshes.get(key);
  if (!flash) return;

  const progress = age / IMPACT_FLASH_DURATION;

  if (progress >= 1) {
    scene.remove(flash);
    flash.geometry.dispose();
    (flash.material as THREE.Material).dispose();
    renderer.impactFlashMeshes.delete(key);
    return;
  }

  const easedProgress = 1 - (1 - progress) ** 2;
  const scale = 1 + easedProgress * (IMPACT_FLASH_MAX_SCALE - 1);
  flash.scale.setScalar(scale);

  const material = flash.material as THREE.MeshBasicMaterial;
  material.opacity = 1 - easedProgress;

  // Color shift from white-orange to orange
  tempColor.setRGB(1.0, 0.9 - progress * 0.3, 0.7 - progress * 0.4);
  material.color.copy(tempColor);
}

/** Update shockwave ring */
function updateImpactRing(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  age: number,
): void {
  const ring = renderer.impactRings.get(key);
  if (!ring) return;

  const progress = age / IMPACT_RING_DURATION;

  if (progress >= 1) {
    scene.remove(ring);
    ring.geometry.dispose();
    (ring.material as THREE.Material).dispose();
    renderer.impactRings.delete(key);
    return;
  }

  const easedProgress = 1 - (1 - progress) ** 2;
  const scale = 1 + easedProgress * (IMPACT_RING_MAX_SCALE - 1);
  ring.scale.setScalar(scale);

  const material = ring.material as THREE.MeshBasicMaterial;
  material.opacity = 0.8 * (1 - easedProgress);
}

/** Update impact point light */
function updateImpactLight(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  age: number,
): void {
  const light = renderer.impactLights.get(key);
  if (!light) return;

  // Light peaks early then fades
  const progress = age / IMPACT_FLASH_DURATION;

  if (progress >= 1) {
    scene.remove(light);
    renderer.impactLights.delete(key);
    return;
  }

  // Peak at 20% then decay
  const peakTime = 0.2;
  let intensity: number;
  if (progress < peakTime) {
    intensity = IMPACT_LIGHT_INTENSITY * (progress / peakTime) * 1.5;
  } else {
    intensity =
      IMPACT_LIGHT_INTENSITY *
      1.5 *
      (1 - (progress - peakTime) / (1 - peakTime));
  }
  light.intensity = Math.max(0, intensity);
}

/** Update impact particles */
function updateImpactParticles(
  renderer: NuclearLanceRenderer,
  scene: THREE.Scene,
  key: string,
  shot: LanceShot,
  age: number,
): void {
  const particles = renderer.impactParticles.get(key);
  const velocities = renderer.particleVelocities.get(key);
  if (!particles || !velocities) return;

  const progress = age / IMPACT_PARTICLES_DURATION;

  if (progress >= 1) {
    scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();
    renderer.impactParticles.delete(key);
    renderer.particleVelocities.delete(key);
    return;
  }

  const easedProgress = 1 - (1 - progress) ** 2;
  const distance = easedProgress * IMPACT_PARTICLE_SPEED;

  // Update particle positions
  const positions = particles.geometry.attributes.position
    ?.array as Float32Array;
  for (let i = 0; i < IMPACT_PARTICLE_COUNT; i++) {
    const idx = i * 3;
    positions[idx] = shot.hitPoint.x + (velocities[idx] as number) * distance;
    positions[idx + 1] =
      shot.hitPoint.y + (velocities[idx + 1] as number) * distance;
    positions[idx + 2] =
      shot.hitPoint.z + (velocities[idx + 2] as number) * distance;
  }
  const posAttr = particles.geometry.attributes.position;
  if (posAttr) {
    posAttr.needsUpdate = true;
  }

  // Fade particles
  (particles.material as THREE.PointsMaterial).opacity = 1 - easedProgress;
}
