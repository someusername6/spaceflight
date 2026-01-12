/**
 * AI Playstyle System - Skill expression varies by ship role.
 *
 * Different playstyles express skill differently:
 * - brawler: Standard - better aim, lower panic threshold, more aggressive
 * - escape: Speed-based survival - skilled pilots use speed advantage better
 * - kiting: Range maintenance - skilled pilots maintain optimal distance
 * - beam: Close-range beam ships - skill improves accuracy without changing
 *         defensive behavior (prevents "brave ace" inversion in beam duels)
 */

import { type AIProfile, getAIProfile } from './ai-profiles';

/** Playstyle type for skill scaling */
export type AIPlaystyle = 'brawler' | 'escape' | 'kiting' | 'beam' | 'gunboat';

/** Skill level as 0-1 value for aim error scaling */
const SKILL_VALUES: Record<string, number> = {
  rookie: 0,
  regular: 0.33,
  veteran: 0.66,
  ace: 1,
};

/**
 * Get aim error multiplier for kiting playstyle.
 * Lower skill = higher multiplier = more error.
 * This creates asymmetric advantages: ace is precise, rookie misses a lot.
 *
 * The values are calibrated so that with railgun's 2° autoaim:
 * - Ace (0.5° base): 0.5° → within autoaim, always hits
 * - Veteran (2° base): 4° → outside autoaim, mostly misses
 * - Regular (3° base): 9° → rarely in autoaim, often misses
 * - Rookie (5.5° base): 22° → never in autoaim, misses badly
 */
function getKitingAimMultiplier(skill: number): number {
  // Ace (skill=1): 1.0x (base aim error ~0.5°)
  // Veteran (skill=0.66): 2.0x (base aim error ~2° → 4°)
  // Regular (skill=0.33): 3.0x (base aim error ~3° → 9°)
  // Rookie (skill=0): 4.0x (base aim error ~5.5° → 22°)
  return 4.0 - skill * 3.0;
}

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
      // Kiting playstyle: skilled pilots maintain optimal range AND hit more
      //
      // PRIMARY: Tiered aim error overcomes railgun's 2° autoaim
      // - Ace stays precise (0.5°), rookie misses badly (22°)
      // - This is the main skill differentiator for projectile weapons
      //
      // SECONDARY: Skill-based engagement range
      // - Aces earn the right to fight at true long range
      // - Rookies engage closer where they might land more hits
      //
      // CONSTANT: Flee distance prevents chase asymmetry in mirrors
      const aimMult = getKitingAimMultiplier(skill);
      const rangeMult = getKitingRangeMultiplier(skill);
      return {
        ...base,
        // PRIMARY: Tiered aim error - overcomes autoaim for skill differentiation
        aimErrorBase: base.aimErrorBase * aimMult,
        aimErrorDriftSpeed: base.aimErrorDriftSpeed * aimMult,
        // Constant defensive thresholds
        evadeShieldThreshold: 0.25,
        regroupShieldThreshold: 0.12,
        // SECONDARY: Skill-based range (aces earn long-range fighting)
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

    case 'beam': {
      // Beam playstyle: for close-range beam ships (e.g., lancers)
      //
      // KEY INSIGHT: In beam-vs-beam duels, the standard brawler "brave ace"
      // behavior is COUNTERPRODUCTIVE. Ace stays until 12% shields while
      // rookie evades at 31% - but with continuous beams at close range,
      // the ace just takes more damage before retreating.
      //
      // SOLUTION: Use constant defensive thresholds (like escape/kiting)
      // so skill only affects ACCURACY, not suicidal bravery.
      //
      // Skill differentiation comes from aim error multiplier:
      // - More aggressive than kiting since beams need bigger differences
      // - At 400m range: ace wobbles 3m, rookie wobbles 120m+
      const beamAimMult = 4.0 - skill * 3.0; // Ace 1x, Rookie 4x

      return {
        ...base,
        // Tiered aim error with aggressive scaling for beam ships
        aimErrorBase: base.aimErrorBase * beamAimMult,
        aimErrorDriftSpeed: base.aimErrorDriftSpeed * beamAimMult,
        // CONSTANT defensive thresholds - prevents "brave ace" inversion
        // All skill levels evade at same point, so fights are fair accuracy races
        evadeShieldThreshold: 0.25,
        regroupShieldThreshold: 0.12,
        recoverShieldThreshold: 0.55,
        // Constant combat range (beam ships want to stay close)
        combatRangeMultiplier: 1.0,
        // Constant heat management
        heatSwitchThreshold: 0.8,
        linkedFireHeatThreshold: 0.7,
        // Beam ships fire at moderate angles (continuous damage)
        minFiringAngle: 30,
        // Standard evade/regroup timing
        evadeCooldown: 4.0,
        regroupMinTime: 2.5,
      };
    }

    case 'gunboat': {
      // Gunboat playstyle: for multi-weapon brawlers (e.g., striker with 5 weapons)
      //
      // KEY INSIGHT: With many weapons, rookie's "spray and pray" (45° firing angle,
      // high heat threshold) produces higher DPS than veteran's selective firing.
      // Volume compensates for accuracy in close-range brawling.
      //
      // SOLUTION: Use constant constraints for ALL skill levels.
      // All skill differentiation comes from base profile aim error.
      // This creates fair mirror matches where accuracy is the only factor.
      //
      // NOTE: Striker mirrors may still show slight inversion at lower tiers
      // due to weapon mix effects, but should be within acceptable variance.
      return {
        ...base,
        // Keep base aim error from profile (main skill differentiator)
        // CONSTANT firing angle - prevents rookie volume advantage
        minFiringAngle: 25,
        // CONSTANT heat management - prevents rookie overheat advantage
        heatSwitchThreshold: 0.75,
        linkedFireHeatThreshold: 0.6,
        // CONSTANT defensive thresholds - prevents "brave ace" inversion
        evadeShieldThreshold: 0.25,
        regroupShieldThreshold: 0.12,
        recoverShieldThreshold: 0.55,
        // Constant combat range
        combatRangeMultiplier: 1.0,
      };
    }

    default:
      // Brawler: use base profile as-is
      return base;
  }
}
