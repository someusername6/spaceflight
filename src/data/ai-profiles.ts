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
  /**
   * Beam tracking speed in radians per second.
   * How fast beam weapons correct toward the perceived target.
   * Higher = faster lock-on, less hunting behavior.
   * Ace: ~4.0 (near-instant lock), Rookie: ~0.8 (slow hunting)
   */
  beamTrackingSpeed: number;

  // === ENGAGEMENT ===
  /** Distance to start engaging (firing weapons) */
  engageRange: number;
  /** Distance to give up pursuit */
  breakOffRange: number;
  /**
   * Multiplier for preferred combat range based on skill.
   * Ace pilots engage from farther (precision makes long-range viable).
   * Rookie pilots engage closer (autoaim helps more at close range).
   */
  combatRangeMultiplier: number;

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

  // === BURST-DISENGAGE (for long-range ships) ===
  /** How long to engage before repositioning (seconds) */
  burstDuration: number;
  /** Cooldown between repositioning attempts (seconds) */
  repositionCooldown: number;
  /** Max time to spend repositioning before re-engaging (seconds) */
  maxRepositionTime: number;

  // === KITING (for ranged ships) ===
  /**
   * Multiplier for archetype's fleeDistance.
   * Skilled kiters maintain larger distances (react faster to closing enemies).
   * Only affects ships with fleeDistance defined.
   */
  fleeDistanceMultiplier: number;
}

/**
 * Preset AI profiles for different skill levels.
 *
 * These can be used directly or as templates for custom profiles.
 */
export const AI_PROFILES: Record<string, AIProfile> = {
  green: {
    name: 'Green',
    aimErrorBase: 0.14,
    aimErrorDriftSpeed: 0.06,
    aimErrorAngularFactor: 0.9,
    beamTrackingSpeed: 0.5,
    engageRange: 400,
    breakOffRange: 800,
    combatRangeMultiplier: 0.6,
    heatSwitchThreshold: 0.98,
    minFiringAngle: 60,
    linkedFireHeatThreshold: 0.9,
    evadeShieldThreshold: 0.45,
    regroupShieldThreshold: 0.25,
    recoverShieldThreshold: 0.8,
    evadeCooldown: 2.0,
    regroupMinTime: 1.5,
    decoyCooldown: 5.0,
    burstDuration: 4.0,
    repositionCooldown: 8.0,
    maxRepositionTime: 8.0,
    fleeDistanceMultiplier: 0.6,
  },

  /**
   * Rookie - Poor aim, slow reactions, panics under fire.
   * Good for tutorial or easy encounters.
   */
  rookie: {
    name: 'Rookie',
    // Accuracy: Very poor
    aimErrorBase: 0.095, // ~5.5 degrees
    aimErrorDriftSpeed: 0.04,
    aimErrorAngularFactor: 0.68, // Affected by target movement
    beamTrackingSpeed: 0.8, // Slow hunting, overshoots target
    // Engagement: Conservative, engages closer (needs autoaim help)
    engageRange: 500,
    breakOffRange: 1000,
    combatRangeMultiplier: 0.8, // Engages 20% closer than base range
    // Weapon selection: Poor choices
    heatSwitchThreshold: 0.95, // Almost overheats before switching
    minFiringAngle: 45, // Wastes ammo at bad angles (tuned)
    linkedFireHeatThreshold: 0.8, // Overheats with linked fire
    // State transitions: Panics early, returns too early
    evadeShieldThreshold: 0.31, // Panics at relatively high shields
    regroupShieldThreshold: 0.17, // Retreats early when scared
    recoverShieldThreshold: 0.7, // Returns to fight too early (impatient)
    evadeCooldown: 3.0,
    regroupMinTime: 2.0,
    // Missiles: Slow reactions
    decoyCooldown: 3.5, // (tuned)
    // Burst-disengage: Long bursts, slow to reposition (easier to catch)
    burstDuration: 3.0,
    repositionCooldown: 6.0,
    maxRepositionTime: 6.0,
    // Kiting: Poor range maintenance (flees late when enemy is already close)
    fleeDistanceMultiplier: 0.8,
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
    beamTrackingSpeed: 1.5, // Moderate tracking
    // Engagement: Standard
    engageRange: 600,
    breakOffRange: 1200,
    combatRangeMultiplier: 1.0, // Baseline combat range
    // Weapon selection: Sensible
    heatSwitchThreshold: 0.75,
    minFiringAngle: 24, // More selective for skill progression
    linkedFireHeatThreshold: 0.6,
    // State transitions: Moderate composure
    evadeShieldThreshold: 0.25, // Evades at reasonable threshold
    regroupShieldThreshold: 0.12, // Retreats when moderately damaged
    recoverShieldThreshold: 0.55, // Returns at reasonable recovery
    evadeCooldown: 5.0,
    regroupMinTime: 3.0,
    // Missiles: Standard
    decoyCooldown: 2.0,
    // Burst-disengage: Moderate timing
    burstDuration: 2.5,
    repositionCooldown: 5.0,
    maxRepositionTime: 5.0,
    // Kiting: Moderate range maintenance
    fleeDistanceMultiplier: 0.9,
  },

  /**
   * Veteran - Skilled pilot, stays calm under pressure.
   * Challenging enemy for experienced players.
   */
  veteran: {
    name: 'Veteran',
    // Accuracy: Good
    aimErrorBase: 0.032, // ~2 degrees
    aimErrorDriftSpeed: 0.016,
    aimErrorAngularFactor: 0.3, // Good at tracking
    beamTrackingSpeed: 2.5, // Good tracking
    // Engagement: Aggressive but smart
    engageRange: 700,
    breakOffRange: 1400,
    combatRangeMultiplier: 1.15, // Engages 15% farther (better aim)
    // Weapon selection: Optimal
    heatSwitchThreshold: 0.65,
    minFiringAngle: 18, // More selective than regular, closer to ace (tuned for kiting)
    linkedFireHeatThreshold: 0.5,
    // State transitions: Calm under fire, patient recovery
    evadeShieldThreshold: 0.2, // Stays in fight
    regroupShieldThreshold: 0.09, // Retreats when damaged
    recoverShieldThreshold: 0.45, // Patient - waits for good recovery
    evadeCooldown: 6.0,
    regroupMinTime: 3.5,
    // Missiles: Quick reactions
    decoyCooldown: 1.4,
    // Burst-disengage: Efficient timing (hard to pin down)
    burstDuration: 2.0,
    repositionCooldown: 4.0,
    maxRepositionTime: 4.0,
    // Kiting: Good range maintenance
    fleeDistanceMultiplier: 1.0,
  },

  /**
   * Ace - Elite pilot, ice cold under fire.
   * Boss-level enemy, very difficult to defeat.
   */
  ace: {
    name: 'Ace',
    // Accuracy: Excellent
    aimErrorBase: 0.008, // ~0.5 degrees
    aimErrorDriftSpeed: 0.008, // Very stable aim
    aimErrorAngularFactor: 0.06, // Excellent at tracking
    beamTrackingSpeed: 4.0, // Near-instant lock
    // Engagement: Very aggressive
    engageRange: 800,
    breakOffRange: 1600,
    combatRangeMultiplier: 1.3, // Engages 30% farther (precision makes it viable)
    // Weapon selection: Perfect
    heatSwitchThreshold: 0.5, // Perfect heat management
    minFiringAngle: 14, // Very selective but viable for kiting
    linkedFireHeatThreshold: 0.35, // Can sustain linked fire longer
    // State transitions: Ice cold - stays in fight, very patient recovery
    evadeShieldThreshold: 0.12, // Very calm
    regroupShieldThreshold: 0.05, // Nearly dead before retreating
    recoverShieldThreshold: 0.3, // Patient
    evadeCooldown: 7.0,
    regroupMinTime: 4.0,
    // Missiles: Instant reactions
    decoyCooldown: 0.5, // Lightning fast
    // Burst-disengage: Optimal timing (extremely hard to catch)
    burstDuration: 1.5,
    repositionCooldown: 3.0,
    maxRepositionTime: 3.0,
    // Kiting: Excellent range maintenance (reacts to closing enemy)
    fleeDistanceMultiplier: 1.1,
  },

  /**
   * Elite - Legendary pilot, nearly superhuman accuracy.
   * Rare hire, extremely dangerous opponent.
   */
  elite: {
    name: 'Elite',
    // Accuracy: Near-perfect (only difference from ace)
    aimErrorBase: 0.004, // ~0.23 degrees - near perfect
    aimErrorDriftSpeed: 0.004, // Rock steady aim
    aimErrorAngularFactor: 0.03, // Almost immune to target movement
    beamTrackingSpeed: 4.0, // Near-instant lock
    // Engagement: Very aggressive
    engageRange: 800,
    breakOffRange: 1600,
    combatRangeMultiplier: 1.3, // Engages 30% farther (precision makes it viable)
    // Weapon selection: Perfect
    heatSwitchThreshold: 0.5, // Perfect heat management
    minFiringAngle: 14, // Very selective but viable for kiting
    linkedFireHeatThreshold: 0.35, // Can sustain linked fire longer
    // State transitions: Ice cold - stays in fight, very patient recovery
    evadeShieldThreshold: 0.12, // Very calm
    regroupShieldThreshold: 0.05, // Nearly dead before retreating
    recoverShieldThreshold: 0.3, // Patient
    evadeCooldown: 7.0,
    regroupMinTime: 4.0,
    // Missiles: Instant reactions
    decoyCooldown: 0.5, // Lightning fast
    // Burst-disengage: Optimal timing (extremely hard to catch)
    burstDuration: 1.5,
    repositionCooldown: 3.0,
    maxRepositionTime: 3.0,
    // Kiting: Excellent range maintenance (reacts to closing enemy)
    fleeDistanceMultiplier: 1.1,
  },

  /**
   * Player - Used for multiplayer player-controlled pilots.
   * These values are never used (players don't use AI) but exist
   * for type safety and display purposes.
   */
  player: {
    name: 'Player',
    // Use regular-like values (these are never actually used)
    aimErrorBase: 0.0,
    aimErrorDriftSpeed: 0.0,
    aimErrorAngularFactor: 0.0,
    beamTrackingSpeed: 1.0,
    engageRange: 600,
    breakOffRange: 1200,
    combatRangeMultiplier: 1.0,
    heatSwitchThreshold: 0.7,
    minFiringAngle: 25,
    linkedFireHeatThreshold: 0.6,
    evadeShieldThreshold: 0.3,
    regroupShieldThreshold: 0.15,
    recoverShieldThreshold: 0.5,
    evadeCooldown: 3.5,
    regroupMinTime: 2.5,
    decoyCooldown: 2.5,
    burstDuration: 2.5,
    repositionCooldown: 5.0,
    maxRepositionTime: 5.0,
    fleeDistanceMultiplier: 0.85,
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

// Re-export playstyle system from dedicated module
export { type AIPlaystyle, getProfileForPlaystyle } from './ai-playstyles';

/**
 * Global AI settings that affect all AI ships.
 * These are separate from per-entity profiles.
 */
export const AI_GLOBAL_SETTINGS = {
  /** Maximum AI ships that can target the player simultaneously */
  maxEngagingPlayer: 3,
};
