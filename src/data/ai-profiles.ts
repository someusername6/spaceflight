/**
 * AI Behavior Profiles - Configurable AI competence levels.
 *
 * Each profile defines how an AI behaves in combat. Different profiles
 * create different difficulty levels (rookie → ace).
 *
 * Profiles can be assigned per-entity, allowing mixed difficulty encounters.
 */

/** AI behavior profile - all parameters that affect AI decision-making */
export interface AIProfile {
  /** Profile name for debugging/display */
  name: string;

  // === ACCURACY ===
  /** Base aim error in radians (~0.05 = 3 degrees) */
  aimErrorBase: number;
  /** Aim drift speed in radians per second */
  aimErrorDriftSpeed: number;
  /**
   * Multiplier for target angular velocity contribution to aim error.
   * Higher = target movement affects accuracy more.
   * Angular velocity (rad/s) * factor = additional error (rad).
   * Example: 0.5 factor * 0.1 rad/s angular velocity = 0.05 rad extra error
   */
  aimErrorAngularFactor: number;

  // === ENGAGEMENT ===
  /** Distance to start engaging (firing weapons) */
  engageRange: number;
  /** Distance to give up pursuit */
  breakOffRange: number;

  // === WEAPON SELECTION ===
  /** Heat percentage to switch to cooler weapons (0-1) */
  heatSwitchThreshold: number;
  /** Don't waste ammo beyond this angle in degrees */
  minFiringAngle: number;
  /** Heat percentage to prefer linked fire (0-1) */
  linkedFireHeatThreshold: number;

  // === STATE TRANSITIONS ===
  /** Shield percentage to trigger evade (0-1) */
  evadeShieldThreshold: number;
  /** Shield percentage to trigger regroup (0-1) */
  regroupShieldThreshold: number;
  /** Shield percentage to exit regroup (0-1) */
  recoverShieldThreshold: number;
  /** Minimum time in evade state (seconds) */
  evadeCooldown: number;
  /** Minimum time in regroup state (seconds) */
  regroupMinTime: number;

  // === MISSILES ===
  /** Cooldown between decoy launches (seconds) */
  decoyCooldown: number;

  // === PROTECT BEHAVIOR ===
  /** Max distance from protectee to chase threats */
  protectChaseRange: number;
  /** Distance to patrol around protectee */
  protectPatrolRange: number;
}

/**
 * Preset AI profiles for different skill levels.
 *
 * These can be used directly or as templates for custom profiles.
 */
export const AI_PROFILES: Record<string, AIProfile> = {
  /**
   * Rookie - Poor aim, slow reactions, bad decisions.
   * Good for tutorial or easy encounters.
   */
  rookie: {
    name: 'Rookie',
    // Accuracy: Very poor
    aimErrorBase: 0.12, // ~7 degrees
    aimErrorDriftSpeed: 0.04,
    aimErrorAngularFactor: 0.8, // Very affected by target movement
    // Engagement: Conservative
    engageRange: 500,
    breakOffRange: 1000,
    // Weapon selection: Poor choices
    heatSwitchThreshold: 0.95, // Almost overheats before switching
    minFiringAngle: 50, // Wastes ammo at bad angles (high = permissive)
    linkedFireHeatThreshold: 0.8, // Overheats with linked fire
    // State transitions: Slow to react
    evadeShieldThreshold: 0.15, // Waits too long to evade
    regroupShieldThreshold: 0.05, // Nearly dead before retreating
    recoverShieldThreshold: 0.6, // Returns to fight too early
    evadeCooldown: 3.0,
    regroupMinTime: 2.0,
    // Missiles: Slow reactions
    decoyCooldown: 4.0,
    // Protect: Tight formation (easier to hit)
    protectChaseRange: 300,
    protectPatrolRange: 150,
  },

  /**
   * Regular - Baseline AI, reasonable competence.
   * Standard enemy for most encounters.
   */
  regular: {
    name: 'Regular',
    // Accuracy: Moderate
    aimErrorBase: 0.05, // ~3 degrees
    aimErrorDriftSpeed: 0.02,
    aimErrorAngularFactor: 0.5, // Moderately affected by target movement
    // Engagement: Standard
    engageRange: 600,
    breakOffRange: 1200,
    // Weapon selection: Sensible
    heatSwitchThreshold: 0.75,
    minFiringAngle: 35, // Moderate selectivity
    linkedFireHeatThreshold: 0.6,
    // State transitions: Reasonable
    evadeShieldThreshold: 0.2,
    regroupShieldThreshold: 0.1,
    recoverShieldThreshold: 0.5,
    evadeCooldown: 5.0,
    regroupMinTime: 3.0,
    // Missiles: Standard
    decoyCooldown: 2.0,
    // Protect: Standard spacing
    protectChaseRange: 400,
    protectPatrolRange: 200,
  },

  /**
   * Veteran - Skilled pilot, good decisions.
   * Challenging enemy for experienced players.
   */
  veteran: {
    name: 'Veteran',
    // Accuracy: Good
    aimErrorBase: 0.03, // ~2 degrees
    aimErrorDriftSpeed: 0.015,
    aimErrorAngularFactor: 0.3, // Good at tracking moving targets
    // Engagement: Aggressive but smart
    engageRange: 700,
    breakOffRange: 1400,
    // Weapon selection: Optimal
    heatSwitchThreshold: 0.65,
    minFiringAngle: 25, // Selective - only fires when well-aimed
    linkedFireHeatThreshold: 0.5,
    // State transitions: Quick reactions
    evadeShieldThreshold: 0.25,
    regroupShieldThreshold: 0.12,
    recoverShieldThreshold: 0.45,
    evadeCooldown: 6.0,
    regroupMinTime: 3.5,
    // Missiles: Quick reactions
    decoyCooldown: 1.5,
    // Protect: Wide coverage
    protectChaseRange: 500,
    protectPatrolRange: 250,
  },

  /**
   * Ace - Elite pilot, near-perfect execution.
   * Boss-level enemy, very difficult to defeat.
   */
  ace: {
    name: 'Ace',
    // Accuracy: Excellent
    aimErrorBase: 0.015, // ~1 degree
    aimErrorDriftSpeed: 0.01,
    aimErrorAngularFactor: 0.15, // Excellent at tracking fast targets
    // Engagement: Very aggressive
    engageRange: 800,
    breakOffRange: 1600,
    // Weapon selection: Perfect
    heatSwitchThreshold: 0.55,
    minFiringAngle: 15, // Very selective - only fires when perfectly aimed
    linkedFireHeatThreshold: 0.4,
    // State transitions: Perfect timing
    evadeShieldThreshold: 0.3,
    regroupShieldThreshold: 0.15,
    recoverShieldThreshold: 0.4,
    evadeCooldown: 7.0,
    regroupMinTime: 4.0,
    // Missiles: Instant reactions
    decoyCooldown: 1.0,
    // Protect: Maximum coverage
    protectChaseRange: 600,
    protectPatrolRange: 300,
  },
};

/** Profile names for type safety */
export type ProfileName = keyof typeof AI_PROFILES;

/** Get a profile by name, with fallback to 'regular' */
export function getAIProfile(name: string): AIProfile {
  const key = name.toLowerCase();
  const profile = AI_PROFILES[key];
  if (profile) {
    return profile;
  }
  // Fallback to regular (guaranteed to exist)
  return AI_PROFILES.regular as AIProfile;
}

/** Create a custom profile by modifying an existing one */
export function createCustomProfile(
  base: ProfileName,
  overrides: Partial<AIProfile>,
): AIProfile {
  return { ...AI_PROFILES[base], ...overrides } as AIProfile;
}

/**
 * Global AI settings that affect all AI ships.
 * These are separate from per-entity profiles.
 */
export const AI_GLOBAL_SETTINGS = {
  /** Maximum AI ships that can target the player simultaneously */
  maxEngagingPlayer: 3,
};
