/**
 * Projectile Hit Effect Configuration - Constants for hit effect visuals.
 *
 * Particle counts, sizes, lifetimes, speeds, and color definitions
 * used by projectile-hits.ts to render impact effects.
 */

import * as THREE from 'three';

/** Effect duration in seconds */
export const HIT_DURATION = 0.25;

/**
 * Interval for beam hit effects - ensures ~2.5 concurrent effects for
 * continuous visual feedback during sustained beam fire.
 */
export const BEAM_HIT_INTERVAL = HIT_DURATION * 0.4;

/** Particles per hit effect */
export const PARTICLES_PER_HIT = 12;

/** Hit effect visual properties by category */
export const HIT_FLASH_OPACITY = 0.9;
export const HIT_PARTICLE_OPACITY = 1.0;
export const HIT_ENERGY_FLASH_SCALE = 1.5;
export const HIT_BALLISTIC_FLASH_SCALE = 1.0;
export const HIT_ENERGY_PARTICLE_SIZE = 1.5;
export const HIT_BALLISTIC_PARTICLE_SIZE = 2.0;
export const HIT_ENERGY_FLASH_EXPANSION = 3;
export const HIT_BALLISTIC_FLASH_EXPANSION = 2;
export const HIT_ENERGY_PARTICLE_SPEED = 15;
export const HIT_BALLISTIC_PARTICLE_SPEED = 10;

/** Effect colors by category */
export const EFFECT_COLORS = {
  energy: {
    flash: new THREE.Color(0.4, 0.8, 1.0), // Cyan
    particles: new THREE.Color(0.2, 0.6, 1.0), // Blue
  },
  ballistic: {
    flash: new THREE.Color(1.0, 0.6, 0.2), // Orange
    particles: new THREE.Color(1.0, 0.8, 0.3), // Yellow-orange
  },
};
