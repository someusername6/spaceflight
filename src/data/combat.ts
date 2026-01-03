/**
 * Combat Constants - Central source of truth for combat mechanics.
 *
 * Heat thresholds, damage values, and other combat-related constants.
 */

/**
 * Heat system thresholds.
 * These create graduated lockouts for weapons and afterburner.
 */
export const HEAT_THRESHOLDS = {
  /** HUD warning threshold (90%) - triggers visual warning, AI may regroup */
  warning: 0.9,
  /** Afterburner lock threshold (95%) - afterburner disabled */
  afterburnerLock: 0.95,
  /** Afterburner unlock threshold (50%) - afterburner re-enabled (hysteresis) */
  afterburnerUnlock: 0.5,
  /** Weapon lock threshold (100%) - all weapons disabled */
  weaponLock: 1.0,
  /** Weapon unlock threshold (95%) - weapons re-enabled (hysteresis) */
  weaponUnlock: 0.95,
};

/**
 * Collision constants.
 */
export const COLLISION_CONSTANTS = {
  /** Damage dealt on ship-to-ship collision */
  shipCollisionDamage: 10,
  /** Default collision radius for ships */
  defaultShipRadius: 5,
};

/**
 * Weapon range thresholds for AI weapon selection.
 * Used to categorize weapons and distances.
 */
export const RANGE_THRESHOLDS = {
  /** Very long range (1500m+) - railgun, nuclear lance */
  veryLong: 1500,
  /** Long range (800-1500m) - lasers, plasma */
  long: 800,
  /** Medium range (400-800m) - ion, flak, pulse */
  medium: 400,
  /** Short range (<400m) - autocannon, lightning */
  // Anything below medium is short
};

/**
 * Weapon spawning offsets.
 */
export const SPAWN_OFFSETS = {
  /** Forward offset for projectile spawn */
  projectile: 3,
  /** Forward offset for missile spawn */
  missile: 4,
  /** Backward offset for decoy spawn */
  decoy: 3,
  /** Lateral offset between weapon banks */
  bankLateral: 1.5,
  /** Forward offset for beam origin */
  beam: 3,
};

/**
 * Projectile/missile collision radii.
 */
export const PROJECTILE_RADII = {
  projectile: 0.5,
  missile: 1.0,
  decoy: 1.5,
  shrapnel: 0.3,
};

/**
 * Flak shrapnel constants.
 */
export const SHRAPNEL_CONSTANTS = {
  speed: 450,
  range: 120,
  damage: 8,
};

/**
 * Beam weapon constants.
 */
export const BEAM_CONSTANTS = {
  /** Minimum distance for falloff calculation (caps damage when very close) */
  minFalloffDistance: 100,
  /** Tesla arc distance for off-target pulse beams (Lightning) */
  offTargetArcDistance: 150,
  /** Fade duration when beam stops firing */
  fadeDuration: 0.15,
};

/**
 * Explosion constants.
 */
export const EXPLOSION_CONSTANTS = {
  /** Default explosion duration in seconds */
  defaultDuration: 0.8,
  /** Nuke explosion duration in seconds */
  nukeDuration: 2.0,
  /** Standard missile explosion visual size */
  missileSize: 4,
  /** Nuke explosion visual size */
  nukeSize: 15,
  /** Nuke AoE damage multiplier (half damage vs direct hit) */
  nukeAoeDamageMultiplier: 0.5,
  /** Ship death delay before cleanup (allows explosion to engulf) */
  shipDeathDelay: 0.15,
};

/**
 * Lock system constants.
 */
export const LOCK_CONSTANTS = {
  /** Lock decay rate when no valid target (per second) */
  decayRate: 2,
};
