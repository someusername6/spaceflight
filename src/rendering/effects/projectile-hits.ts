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

/** Effect duration in seconds */
const HIT_DURATION = 0.25;

/**
 * Interval for beam hit effects - ensures ~2.5 concurrent effects for
 * continuous visual feedback during sustained beam fire.
 */
export const BEAM_HIT_INTERVAL = HIT_DURATION * 0.4;

/** Particles per hit effect */
const PARTICLES_PER_HIT = 12;

/** Effect colors by category */
const EFFECT_COLORS = {
  energy: {
    flash: new THREE.Color(0.4, 0.8, 1.0), // Cyan
    particles: new THREE.Color(0.2, 0.6, 1.0), // Blue
  },
  ballistic: {
    flash: new THREE.Color(1.0, 0.6, 0.2), // Orange
    particles: new THREE.Color(1.0, 0.8, 0.3), // Yellow-orange
  },
};

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
  flashGeometry: THREE.SphereGeometry;
  hitIdCounter: number;
}

/** Creates the projectile hit renderer */
export function createProjectileHitRenderer(): ProjectileHitRenderer {
  return {
    effects: [],
    flashGeometry: new THREE.SphereGeometry(1, 12, 8),
    hitIdCounter: 0,
  };
}

// Reusable vector for processing pending hits
const hitPosition = new THREE.Vector3();

/** Create particle velocities for hit effect */
function createParticleVelocities(seed: number): Float32Array {
  const velocities = new Float32Array(PARTICLES_PER_HIT * 3);
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

  return velocities;
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
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(renderer.flashGeometry.clone(), flashMaterial);
  flash.position.copy(position);
  flash.scale.setScalar(category === 'energy' ? 1.5 : 1.0);
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
    size: category === 'energy' ? 1.5 : 2.0,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Random velocities
  const particleVelocities = createParticleVelocities(
    renderer.hitIdCounter++ * 12345,
  );

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
): void {
  const gameTime = world.systemState.gameTime;
  const pendingHits = world.systemState.projectileHits.pending;

  // Create effects for pending hits
  for (const hit of pendingHits) {
    hitPosition.set(hit.x, hit.y, hit.z);
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
  pendingHits.length = 0;

  // Update existing effects
  for (let i = renderer.effects.length - 1; i >= 0; i--) {
    const effect = renderer.effects[i];
    if (!effect) continue;

    const age = gameTime - effect.startTime;
    const progress = age / HIT_DURATION;

    if (progress >= 1) {
      // Effect expired - remove
      scene.remove(effect.flash);
      scene.remove(effect.particles);
      effect.flash.geometry.dispose();
      (effect.flash.material as THREE.Material).dispose();
      effect.particles.geometry.dispose();
      (effect.particles.material as THREE.Material).dispose();
      renderer.effects.splice(i, 1);
      continue;
    }

    // Update flash - expand and fade
    const flashScale =
      effect.category === 'energy'
        ? 1.5 + progress * 3 // Energy: bigger, faster expansion
        : 1.0 + progress * 2; // Ballistic: smaller, slower
    effect.flash.scale.setScalar(flashScale);
    (effect.flash.material as THREE.MeshBasicMaterial).opacity =
      0.9 * (1 - progress);

    // Update particles - fly outward
    const particlePositions = effect.particles.geometry.attributes.position
      ?.array as Float32Array;
    const particleSpeed = effect.category === 'energy' ? 15 : 10;
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
    (effect.particles.material as THREE.PointsMaterial).opacity = 1 - progress;
  }
}

/** Disposes of projectile hit renderer resources */
export function disposeProjectileHitRenderer(
  renderer: ProjectileHitRenderer,
  scene: THREE.Scene,
): void {
  for (const effect of renderer.effects) {
    scene.remove(effect.flash);
    scene.remove(effect.particles);
    effect.flash.geometry.dispose();
    (effect.flash.material as THREE.Material).dispose();
    effect.particles.geometry.dispose();
    (effect.particles.material as THREE.Material).dispose();
  }
  renderer.effects.length = 0;
  renderer.flashGeometry.dispose();
}
