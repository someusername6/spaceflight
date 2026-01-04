/**
 * AI Playstyle System - Skill expression varies by ship role.
 *
 * Different playstyles express skill differently:
 * - brawler: Standard - better aim, lower panic threshold, more aggressive
 * - escape: Speed-based survival - skilled pilots use speed advantage better
 * - kiting: Range maintenance - skilled pilots maintain optimal distance
 */

import { type AIProfile, getAIProfile } from './ai-profiles';

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
