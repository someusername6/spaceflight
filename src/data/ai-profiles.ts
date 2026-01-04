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

  // === BURST-DISENGAGE (for long-range ships) ===
  /** How long to engage before repositioning (seconds) */
  burstDuration: number;
  /** Cooldown between repositioning attempts (seconds) */
  repositionCooldown: number;
  /** Max time to spend repositioning before re-engaging (seconds) */
  maxRepositionTime: number;
}

/**
 * Preset AI profiles for different skill levels.
 *
 * These can be used directly or as templates for custom profiles.
 */
export const AI_PROFILES: Record<string, AIProfile> = {
  /**
   * Rookie - Poor aim, slow reactions, panics under fire.
   * Good for tutorial or easy encounters.
   */
  rookie: {
    name: 'Rookie',
    // Accuracy: Very poor
    aimErrorBase: 0.095, // ~5.5 degrees (tuned iter 5)
    aimErrorDriftSpeed: 0.04,
    aimErrorAngularFactor: 0.68, // Affected by target movement (tuned iter 5)
    // Engagement: Conservative
    engageRange: 500,
    breakOffRange: 1000,
    // Weapon selection: Poor choices
    heatSwitchThreshold: 0.95, // Almost overheats before switching
    minFiringAngle: 45, // Wastes ammo at bad angles (tuned)
    linkedFireHeatThreshold: 0.8, // Overheats with linked fire
    // State transitions: Panics early, returns too early
    evadeShieldThreshold: 0.31, // Panics at relatively high shields (tuned iter 5)
    regroupShieldThreshold: 0.17, // Retreats early when scared (tuned iter 5)
    recoverShieldThreshold: 0.7, // Returns to fight too early (impatient)
    evadeCooldown: 3.0,
    regroupMinTime: 2.0,
    // Missiles: Slow reactions
    decoyCooldown: 3.5, // (tuned)
    // Protect: Tight formation (easier to hit)
    protectChaseRange: 300,
    protectPatrolRange: 150,
    // Burst-disengage: Long bursts, slow to reposition (easier to catch)
    burstDuration: 3.0,
    repositionCooldown: 6.0,
    maxRepositionTime: 6.0,
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
    // State transitions: Moderate composure
    evadeShieldThreshold: 0.25, // Evades at reasonable threshold
    regroupShieldThreshold: 0.12, // Retreats when moderately damaged
    recoverShieldThreshold: 0.55, // Returns at reasonable recovery
    evadeCooldown: 5.0,
    regroupMinTime: 3.0,
    // Missiles: Standard
    decoyCooldown: 2.0,
    // Protect: Standard spacing
    protectChaseRange: 400,
    protectPatrolRange: 200,
    // Burst-disengage: Moderate timing
    burstDuration: 2.5,
    repositionCooldown: 5.0,
    maxRepositionTime: 5.0,
  },

  /**
   * Veteran - Skilled pilot, stays calm under pressure.
   * Challenging enemy for experienced players.
   */
  veteran: {
    name: 'Veteran',
    // Accuracy: Good
    aimErrorBase: 0.032, // ~2 degrees (tuned iter 5)
    aimErrorDriftSpeed: 0.016,
    aimErrorAngularFactor: 0.3, // Good at tracking (tuned iter 5)
    // Engagement: Aggressive but smart
    engageRange: 700,
    breakOffRange: 1400,
    // Weapon selection: Optimal
    heatSwitchThreshold: 0.65,
    minFiringAngle: 24, // Selective (tuned iter 3)
    linkedFireHeatThreshold: 0.5,
    // State transitions: Calm under fire, patient recovery
    evadeShieldThreshold: 0.2, // Stays in fight (tuned iter 5)
    regroupShieldThreshold: 0.09, // Retreats when damaged (tuned iter 5)
    recoverShieldThreshold: 0.45, // Patient - waits for good recovery
    evadeCooldown: 6.0,
    regroupMinTime: 3.5,
    // Missiles: Quick reactions
    decoyCooldown: 1.4, // (tuned iter 3)
    // Protect: Wide coverage
    protectChaseRange: 500,
    protectPatrolRange: 250,
    // Burst-disengage: Efficient timing (hard to pin down)
    burstDuration: 2.0,
    repositionCooldown: 4.0,
    maxRepositionTime: 4.0,
  },

  /**
   * Ace - Elite pilot, ice cold under fire.
   * Boss-level enemy, very difficult to defeat.
   */
  ace: {
    name: 'Ace',
    // Accuracy: Excellent
    aimErrorBase: 0.008, // ~0.5 degrees (tuned iteration 1)
    aimErrorDriftSpeed: 0.008, // Very stable aim (tuned iter 4)
    aimErrorAngularFactor: 0.06, // Excellent at tracking (tuned iter 4)
    // Engagement: Very aggressive
    engageRange: 800,
    breakOffRange: 1600,
    // Weapon selection: Perfect
    heatSwitchThreshold: 0.5, // Perfect heat management (tuned iter 4)
    minFiringAngle: 12, // Very selective (tuned iter 3)
    linkedFireHeatThreshold: 0.35, // Can sustain linked fire longer (tuned iter 4)
    // State transitions: Ice cold - stays in fight, very patient recovery
    evadeShieldThreshold: 0.12, // Very calm (tuned iter 5)
    regroupShieldThreshold: 0.05, // Nearly dead before retreating (tuned iter 5)
    recoverShieldThreshold: 0.3, // Patient (tuned iter 2)
    evadeCooldown: 7.0,
    regroupMinTime: 4.0,
    // Missiles: Instant reactions
    decoyCooldown: 0.5, // Lightning fast (tuned iter 4)
    // Protect: Maximum coverage
    protectChaseRange: 600,
    protectPatrolRange: 300,
    // Burst-disengage: Optimal timing (extremely hard to catch)
    burstDuration: 1.5,
    repositionCooldown: 3.0,
    maxRepositionTime: 3.0,
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
