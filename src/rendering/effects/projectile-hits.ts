/**
 * Projectile Hit Effects - Visual feedback when projectiles impact targets.
 *
 * Energy weapons: Bright flash with electrical spark particles
 * Ballistic weapons: Sparks and debris particles
 */

import * as THREE from 'three';
import type { ProjectileCategory } from '../../components/projectile';
import { createPRNG, random } from '../../core/prng';
import type { World } from '../../core/types';
import { TICK_SEC } from '../../game';
import {
  BEAM_HIT_INTERVAL,
  EFFECT_COLORS,
  HIT_BALLISTIC_FLASH_EXPANSION,
  HIT_BALLISTIC_FLASH_SCALE,
  HIT_BALLISTIC_PARTICLE_SIZE,
  HIT_BALLISTIC_PARTICLE_SPEED,
  HIT_DURATION,
  HIT_ENERGY_FLASH_EXPANSION,
  HIT_ENERGY_FLASH_SCALE,
  HIT_ENERGY_PARTICLE_SIZE,
  HIT_ENERGY_PARTICLE_SPEED,
  HIT_FLASH_OPACITY,
  HIT_PARTICLE_OPACITY,
  PARTICLES_PER_HIT,
} from './projectile-hit-config';

export { BEAM_HIT_INTERVAL };

/** Single hit effect state */
interface HitEffect {
  flash: THREE.Mesh;
  particles: THREE.Points;
  particleVelocities: Float32Array;
  startTime: number;
  category: ProjectileCategory;
  position: THREE.Vector3;
}

/** Hit effect renderer state */
export interface ProjectileHitRenderer {
  effects: HitEffect[];
  pool: HitEffect[]; // Pooled effects for reuse (avoids allocation)
  flashGeometry: THREE.SphereGeometry;
  hitIdCounter: number;
}

/** Creates the projectile hit renderer */
export function createProjectileHitRenderer(): ProjectileHitRenderer {
  return {
    effects: [],
    pool: [],
    flashGeometry: new THREE.SphereGeometry(1, 12, 8),
    hitIdCounter: 0,
  };
}

// Reusable vector for processing pending hits
const hitPosition = new THREE.Vector3();

// Reusable colors for custom color effects (avoids allocation per effect)
const reusableFlashColor = new THREE.Color();
const reusableParticleColor = new THREE.Color();

/** Fill array with particle velocities (random hemisphere directions) */
function fillParticleVelocities(velocities: Float32Array, seed: number): void {
  const prng = createPRNG(seed);

  for (let i = 0; i < PARTICLES_PER_HIT; i++) {
    // Random direction on hemisphere (facing outward from impact)
    const theta = random(prng) * Math.PI * 2;
    const phi = random(prng) * Math.PI * 0.5; // Hemisphere

    const idx = i * 3;
    velocities[idx] = Math.sin(phi) * Math.cos(theta);
    velocities[idx + 1] = Math.sin(phi) * Math.sin(theta);
    velocities[idx + 2] = Math.cos(phi);
  }
}

/** Hide a hit effect (for pooling - doesn't dispose) */
function hideHitEffect(effect: HitEffect): void {
  effect.flash.visible = false;
  effect.particles.visible = false;
}

/** Reinitialize a pooled hit effect for reuse */
function reinitializeHitEffect(
  effect: HitEffect,
  renderer: ProjectileHitRenderer,
  position: THREE.Vector3,
  category: ProjectileCategory,
  gameTime: number,
  customColor?: { r: number; g: number; b: number },
): void {
  // Get colors - use reusable objects for custom colors to avoid allocation
  let flashColor: THREE.Color;
  let particleColor: THREE.Color;
  if (customColor) {
    reusableFlashColor.setRGB(customColor.r, customColor.g, customColor.b);
    reusableParticleColor.setRGB(customColor.r, customColor.g, customColor.b);
    flashColor = reusableFlashColor;
    particleColor = reusableParticleColor;
  } else {
    flashColor = EFFECT_COLORS[category].flash;
    particleColor = EFFECT_COLORS[category].particles;
  }

  // Reset flash
  effect.flash.position.copy(position);
  effect.flash.scale.setScalar(
    category === 'energy' ? HIT_ENERGY_FLASH_SCALE : HIT_BALLISTIC_FLASH_SCALE,
  );
  effect.flash.visible = true;
  const flashMat = effect.flash.material as THREE.MeshBasicMaterial;
  flashMat.color.copy(flashColor);
  flashMat.opacity = HIT_FLASH_OPACITY;

  // Reset particles
  const particlePositions = effect.particles.geometry.attributes.position
    ?.array as Float32Array;
  for (let i = 0; i < PARTICLES_PER_HIT; i++) {
    const idx = i * 3;
    particlePositions[idx] = position.x;
    particlePositions[idx + 1] = position.y;
    particlePositions[idx + 2] = position.z;
  }
  const posAttr = effect.particles.geometry.attributes.position;
  if (posAttr) {
    posAttr.needsUpdate = true;
  }
  effect.particles.visible = true;
  const particleMat = effect.particles.material as THREE.PointsMaterial;
  particleMat.color.copy(particleColor);
  particleMat.opacity = HIT_PARTICLE_OPACITY;
  particleMat.size =
    category === 'energy'
      ? HIT_ENERGY_PARTICLE_SIZE
      : HIT_BALLISTIC_PARTICLE_SIZE;

  // Regenerate velocities in-place (avoids allocation)
  fillParticleVelocities(
    effect.particleVelocities,
    renderer.hitIdCounter++ * 12345,
  );

  // Reset state
  effect.startTime = gameTime;
  effect.category = category;
  effect.position.copy(position);
}

/** Creates a hit effect */
function createHitEffect(
  renderer: ProjectileHitRenderer,
  scene: THREE.Scene,
  position: THREE.Vector3,
  category: ProjectileCategory,
  gameTime: number,
  customColor?: { r: number; g: number; b: number },
): HitEffect {
  // Use custom color if provided (for beam weapons), otherwise use category default
  const colors = customColor
    ? {
        flash: new THREE.Color(customColor.r, customColor.g, customColor.b),
        particles: new THREE.Color(customColor.r, customColor.g, customColor.b),
      }
    : EFFECT_COLORS[category];

  // Flash sphere
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: colors.flash,
    transparent: true,
    opacity: HIT_FLASH_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(renderer.flashGeometry.clone(), flashMaterial);
  flash.position.copy(position);
  flash.scale.setScalar(
    category === 'energy' ? HIT_ENERGY_FLASH_SCALE : HIT_BALLISTIC_FLASH_SCALE,
  );
  scene.add(flash);

  // Particles
  const particlePositions = new Float32Array(PARTICLES_PER_HIT * 3);
  for (let i = 0; i < PARTICLES_PER_HIT; i++) {
    const idx = i * 3;
    particlePositions[idx] = position.x;
    particlePositions[idx + 1] = position.y;
    particlePositions[idx + 2] = position.z;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3),
  );

  const particleMaterial = new THREE.PointsMaterial({
    color: colors.particles,
    size:
      category === 'energy'
        ? HIT_ENERGY_PARTICLE_SIZE
        : HIT_BALLISTIC_PARTICLE_SIZE,
    transparent: true,
    opacity: HIT_PARTICLE_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Random velocities
  const particleVelocities = new Float32Array(PARTICLES_PER_HIT * 3);
  fillParticleVelocities(particleVelocities, renderer.hitIdCounter++ * 12345);

  return {
    flash,
    particles,
    particleVelocities,
    startTime: gameTime,
    category,
    position: position.clone(),
  };
}

/** Updates hit effect visuals */
export function updateProjectileHitRenderer(
  renderer: ProjectileHitRenderer,
  scene: THREE.Scene,
  world: World,
  alpha = 1,
): void {
  // Calculate interpolated gameTime for smooth animation
  const gameTime = world.systemState.gameTime - TICK_SEC * (1 - alpha);
  const pendingHits = world.systemState.projectileHits.pending;

  // Create effects for pending hits (reuse from pool when available)
  // Skip stale items - they're from before a seek and would appear at wrong positions
  const maxAge = TICK_SEC * 2;
  for (const hit of pendingHits) {
    if (gameTime - hit.gameTime > maxAge) continue;

    hitPosition.set(hit.x, hit.y, hit.z);

    // Try to reuse from pool first (avoids allocation)
    const pooled = renderer.pool.pop();
    if (pooled) {
      reinitializeHitEffect(
        pooled,
        renderer,
        hitPosition,
        hit.category,
        gameTime,
        hit.color,
      );
      renderer.effects.push(pooled);
    } else {
      // No pooled effect available, create new one
      const effect = createHitEffect(
        renderer,
        scene,
        hitPosition,
        hit.category,
        gameTime,
        hit.color,
      );
      renderer.effects.push(effect);
    }
  }
  pendingHits.length = 0;

  // Update existing effects
  for (let i = renderer.effects.length - 1; i >= 0; i--) {
    const effect = renderer.effects[i];
    if (!effect) continue;

    const age = gameTime - effect.startTime;
    const progress = age / HIT_DURATION;

    if (progress >= 1) {
      // Effect expired - return to pool for reuse
      hideHitEffect(effect);
      renderer.effects.splice(i, 1);
      renderer.pool.push(effect);
      continue;
    }

    // Update flash - expand and fade
    const flashScale =
      effect.category === 'energy'
        ? HIT_ENERGY_FLASH_SCALE + progress * HIT_ENERGY_FLASH_EXPANSION
        : HIT_BALLISTIC_FLASH_SCALE + progress * HIT_BALLISTIC_FLASH_EXPANSION;
    effect.flash.scale.setScalar(flashScale);
    (effect.flash.material as THREE.MeshBasicMaterial).opacity =
      HIT_FLASH_OPACITY * (1 - progress);

    // Update particles - fly outward
    const particlePositions = effect.particles.geometry.attributes.position
      ?.array as Float32Array;
    const particleSpeed =
      effect.category === 'energy'
        ? HIT_ENERGY_PARTICLE_SPEED
        : HIT_BALLISTIC_PARTICLE_SPEED;
    const particleDistance = age * particleSpeed;

    for (let p = 0; p < PARTICLES_PER_HIT; p++) {
      const idx = p * 3;
      particlePositions[idx] =
        effect.position.x +
        (effect.particleVelocities[idx] as number) * particleDistance;
      particlePositions[idx + 1] =
        effect.position.y +
        (effect.particleVelocities[idx + 1] as number) * particleDistance;
      particlePositions[idx + 2] =
        effect.position.z +
        (effect.particleVelocities[idx + 2] as number) * particleDistance;
    }

    const posAttr = effect.particles.geometry.attributes.position;
    if (posAttr) {
      posAttr.needsUpdate = true;
    }

    // Fade particles
    (effect.particles.material as THREE.PointsMaterial).opacity =
      HIT_PARTICLE_OPACITY * (1 - progress);
  }
}

/**
 * Reset projectile hit renderer state (for replay seeking).
 * Returns active effects to pool for reuse.
 */
export function resetProjectileHitRenderer(
  renderer: ProjectileHitRenderer,
  _scene: THREE.Scene,
): void {
  // Return active effects to pool (don't dispose - reuse them)
  for (const effect of renderer.effects) {
    hideHitEffect(effect);
    renderer.pool.push(effect);
  }
  renderer.effects.length = 0;
}

/** Disposes of projectile hit renderer resources */
export function disposeProjectileHitRenderer(
  renderer: ProjectileHitRenderer,
  scene: THREE.Scene,
): void {
  // Dispose active effects
  for (const effect of renderer.effects) {
    scene.remove(effect.flash);
    scene.remove(effect.particles);
    effect.flash.geometry.dispose();
    (effect.flash.material as THREE.Material).dispose();
    effect.particles.geometry.dispose();
    (effect.particles.material as THREE.Material).dispose();
  }
  renderer.effects.length = 0;

  // Dispose pooled effects
  for (const effect of renderer.pool) {
    scene.remove(effect.flash);
    scene.remove(effect.particles);
    effect.flash.geometry.dispose();
    (effect.flash.material as THREE.Material).dispose();
    effect.particles.geometry.dispose();
    (effect.particles.material as THREE.Material).dispose();
  }
  renderer.pool.length = 0;

  renderer.flashGeometry.dispose();
}
