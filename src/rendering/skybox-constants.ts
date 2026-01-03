/** Skybox generation constants */

// RNG seed offsets for deterministic generation
export const RNG_OFFSET_ROTATIONS = 1000;
export const RNG_OFFSET_NEBULAE = 2000;
export const RNG_OFFSET_STAR_HALOS = 3000;
export const RNG_OFFSET_SUN = 4000;

// Nebula parameters (tuned for ~50% black sky)
export const NEBULA_MAX_COUNT = 5;
export const NEBULA_SCALE_MIN = 0.25;
export const NEBULA_SCALE_MAX = 0.75;
export const NEBULA_INTENSITY_MIN = 0.6;
export const NEBULA_INTENSITY_MAX = 1.0;
export const NEBULA_FALLOFF_MIN = 4.0;
export const NEBULA_FALLOFF_MAX = 9.0;
export const NEBULA_OFFSET_RANGE = 1000;
export const NEBULA_CONTINUE_CHANCE = 0.45;

// Star halo parameters
export const HALO_MAX_COUNT = 9;
export const HALO_FALLOFF_BASE = Math.pow(2, 20); // ~1 million
export const HALO_CONTINUE_CHANCE = 0.01;

// Sun parameters (high falloff = tight halo)
export const SUN_SIZE_MIN = 0.0004;
export const SUN_SIZE_MAX = 0.0006;
export const SUN_FALLOFF_MIN = 1024.0;
export const SUN_FALLOFF_MAX = 2048.0;

// Star rotation layers
export const ROTATION_MAX_LAYERS = 5;
export const ROTATION_CONTINUE_CHANCE = 0.2;
