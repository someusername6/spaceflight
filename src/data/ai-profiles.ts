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
    // Engagement: Conservative, engages closer (needs autoaim help)
    engageRange: 500,
    breakOffRange: 1000,
    combatRangeMultiplier: 0.8, // Engages 20% closer than base range
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
    // Protect: Standard spacing
    protectChaseRange: 400,
    protectPatrolRange: 200,
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
    aimErrorBase: 0.032, // ~2 degrees (tuned iter 5)
    aimErrorDriftSpeed: 0.016,
    aimErrorAngularFactor: 0.3, // Good at tracking (tuned iter 5)
    // Engagement: Aggressive but smart
    engageRange: 700,
    breakOffRange: 1400,
    combatRangeMultiplier: 1.15, // Engages 15% farther (better aim)
    // Weapon selection: Optimal
    heatSwitchThreshold: 0.65,
    minFiringAngle: 18, // More selective than regular, closer to ace (tuned for kiting)
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
    aimErrorBase: 0.008, // ~0.5 degrees (tuned iteration 1)
    aimErrorDriftSpeed: 0.008, // Very stable aim (tuned iter 4)
    aimErrorAngularFactor: 0.06, // Excellent at tracking (tuned iter 4)
    // Engagement: Very aggressive
    engageRange: 800,
    breakOffRange: 1600,
    combatRangeMultiplier: 1.3, // Engages 30% farther (precision makes it viable)
    // Weapon selection: Perfect
    heatSwitchThreshold: 0.5, // Perfect heat management (tuned iter 4)
    minFiringAngle: 14, // Very selective but viable for kiting
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
    // Kiting: Excellent range maintenance (reacts to closing enemy)
    fleeDistanceMultiplier: 1.1,
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

/** Playstyle type for skill scaling */
export type AIPlaystyle = 'brawler' | 'escape' | 'kiting';

/** Skill level as 0-1 value for aim error scaling */
const SKILL_VALUES: Record<string, number> = {
  rookie: 0,
  regular: 0.33,
  veteran: 0.66,
  ace: 1,
};

/**
 * Get engagement range multiplier for kiting playstyle.
 * Lower skill = closer range (compensates for poor aim).
 * Higher skill = farther range (precision makes long-range viable).
 *
 * Uses a moderate spread to balance:
 * - Mirrors: Not too much range asymmetry (prevents chase behavior)
 * - vs Brawlers: Lower skills engage closer to be more effective
 */
function getKitingRangeMultiplier(skill: number): number {
  // Ace (skill=1): 1.1x preferred range (sniper: 900 * 1.1 = 990m)
  // Veteran (skill=0.66): 0.96x (sniper: 864m)
  // Regular (skill=0.33): 0.83x (sniper: 747m)
  // Rookie (skill=0): 0.7x (sniper: 630m)
  return 0.7 + skill * 0.4;
}

/**
 * Get an AI profile modified for a specific playstyle.
 *
 * Different playstyles express skill differently:
 * - brawler: Standard - better aim, lower panic threshold, more aggressive
 * - escape: Speed-based survival - skilled pilots use speed advantage better
 * - kiting: Range maintenance - skilled pilots maintain optimal distance
 *
 * KEY INSIGHT: "Flee earlier" makes pilots lose because they fight less.
 * Instead, skill should improve EFFECTIVENESS within the ship's role.
 *
 * @param skillLevel - The base skill level (rookie, regular, veteran, ace)
 * @param playstyle - How skill should be expressed for this ship type
 * @returns Modified AI profile for the playstyle
 */
export function getProfileForPlaystyle(
  skillLevel: string,
  playstyle: AIPlaystyle,
): AIProfile {
  const base = getAIProfile(skillLevel);
  const skill = SKILL_VALUES[skillLevel.toLowerCase()] ?? 0.33;

  switch (playstyle) {
    case 'escape': {
      // Escape playstyle: skilled pilots are effective at hit-and-run
      //
      // In MIRROR matches, many base profile parameters cause inversions.
      // For escape ships, ONLY aim error should differentiate skill levels.
      // We use TIERED multipliers similar to kiting but less extreme.
      const escapeAimMult = 3.0 - skill * 2.0; // Ace 1x, Rookie 3x
      return {
        ...base,
        // TIERED aim error: ace 1x, veteran 1.7x, regular 2.3x, rookie 3x
        // Scout has a beam weapon so projectile aim matters less
        aimErrorBase: base.aimErrorBase * escapeAimMult,
        aimErrorDriftSpeed: base.aimErrorDriftSpeed * escapeAimMult,
        // Constant defensive thresholds (ace staying longer = getting caught)
        evadeShieldThreshold: 0.25,
        regroupShieldThreshold: 0.12,
        // Constant heat management (lower threshold = less DPS)
        heatSwitchThreshold: 0.8,
        linkedFireHeatThreshold: 0.7,
        // Constant firing angle (speed lets them get close regardless of skill)
        minFiringAngle: 35,
        // Constant combat range (closer = caught in mirrors)
        combatRangeMultiplier: 1.0,
        // Fast recovery/re-engagement (universal for escape playstyle)
        evadeCooldown: 2.5,
        regroupMinTime: 2.0,
      };
    }

    case 'kiting': {
      // Kiting playstyle: skilled pilots maintain optimal range
      //
      // KEY INSIGHT: Lower-skill snipers should engage CLOSER to compensate
      // for poor aim. A rookie sniper at 630m is closer to brawl range,
      // while ace snipers earn the right to fight at true long range (990m).
      //
      // CRITICAL: Flee distance stays CONSTANT to prevent chase asymmetry.
      // All skill levels flee at the same distance, but prefer different
      // engagement ranges. This gives skilled pilots a larger "engagement
      // window" (preferred range - flee distance) to deal damage.
      //
      // Engagement windows with sniper (900m base, 400m flee):
      // - Ace: 990m - 400m = 590m window
      // - Rookie: 630m - 400m = 230m window
      // Ace has 2.5x more room to maneuver and deal damage.
      const rangeMult = getKitingRangeMultiplier(skill);
      return {
        ...base,
        // Constant defensive thresholds
        evadeShieldThreshold: 0.25,
        regroupShieldThreshold: 0.12,
        // SKILL-BASED RANGE: lower skill = closer engagement
        combatRangeMultiplier: rangeMult,
        // CONSTANT flee distance - prevents chase asymmetry in mirrors
        fleeDistanceMultiplier: 1.0,
        // Constant heat management
        heatSwitchThreshold: 0.8,
        linkedFireHeatThreshold: 0.7,
        // All kiters fire at same angle threshold
        minFiringAngle: 30,
        // Constant repositioning
        repositionCooldown: 4.0,
        maxRepositionTime: 4.0,
      };
    }

    default:
      // Brawler: use base profile as-is
      return base;
  }
}

/**
 * Global AI settings that affect all AI ships.
 * These are separate from per-entity profiles.
 */
export const AI_GLOBAL_SETTINGS = {
  /** Maximum AI ships that can target the player simultaneously */
  maxEngagingPlayer: 3,
};
