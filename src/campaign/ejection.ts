/**
 * Ejection System - Injury and KIA outcomes for wingman pilots.
 *
 * When a wingman's ship is destroyed, they eject. Each ejection has
 * a chance of different outcomes based on ejection history:
 *
 * Outcomes:
 * - Safe: Pilot survives unharmed
 * - Injured: Pilot survives but is unavailable for 1-3 missions
 * - KIA: Pilot is killed in action (permanent removal)
 *
 * Probability curves based on ejection count (0-indexed):
 * - 1st ejection (count=0): 85% safe, 15% injured, 0% KIA
 * - 2nd ejection (count=1): 70% safe, 25% injured, 5% KIA
 * - 3rd ejection (count=2): 55% safe, 30% injured, 15% KIA
 * - 4th ejection (count=3): 40% safe, 35% injured, 25% KIA
 * - 5th+ ejection (count>=4): 30% safe, 35% injured, 35% KIA
 *
 * Note: Multiplayer player pilots are exempt from injury/KIA rolls.
 */

import { createDerivedPRNG, random } from '../core/prng';

/** Possible outcomes after a pilot ejects */
export type EjectionOutcome =
  | { type: 'safe' }
  | { type: 'injured'; missions: number }
  | { type: 'kia' };

/**
 * Probability curves based on ejection count.
 * Each row is [safeChance, injuredChance, kiaChance] - must sum to 100.
 */
const EJECTION_PROBABILITIES: readonly [number, number, number][] = [
  [85, 15, 0], // 1st ejection (count=0)
  [70, 25, 5], // 2nd ejection (count=1)
  [55, 30, 15], // 3rd ejection (count=2)
  [40, 35, 25], // 4th ejection (count=3)
  [30, 35, 35], // 5th+ ejection (count>=4)
];

/**
 * Determine the outcome of a pilot ejection.
 *
 * Uses deterministic PRNG derived from campaign state, ensuring:
 * - Same result if save-scumming (reloading same save)
 * - Different results for different pilots in same mission
 * - Consistent between debrief display and actual state update
 *
 * @param campaignSeed - The campaign's master seed
 * @param missionCount - Current mission number (before increment)
 * @param pilotId - Unique pilot identifier
 * @param ejectionCount - Pilot's ejection count BEFORE this ejection
 * @returns The ejection outcome (safe, injured, or kia)
 */
export function rollEjectionOutcome(
  campaignSeed: number,
  missionCount: number,
  pilotId: string,
  ejectionCount: number,
): EjectionOutcome {
  // Get probability table row for this ejection count
  const probIndex = Math.min(ejectionCount, EJECTION_PROBABILITIES.length - 1);
  const probs = EJECTION_PROBABILITIES[probIndex];
  if (!probs) {
    return { type: 'safe' }; // Fallback
  }
  const [safeChance, injuredChance] = probs;

  // Deterministic PRNG for outcome roll
  const prng = createDerivedPRNG(
    campaignSeed,
    'ejection',
    missionCount,
    pilotId,
  );
  const roll = random(prng) * 100;

  if (roll < safeChance) {
    return { type: 'safe' };
  } else if (roll < safeChance + injuredChance) {
    // Injured - roll duration 1-3 missions
    const durationRoll = Math.floor(random(prng) * 3) + 1;
    return { type: 'injured', missions: durationRoll };
  } else {
    return { type: 'kia' };
  }
}

/**
 * Get the probability percentages for an ejection outcome.
 * Useful for UI display showing risk levels.
 *
 * @param ejectionCount - Pilot's ejection count BEFORE this ejection
 * @returns Probability percentages for each outcome
 */
export function getEjectionProbabilities(ejectionCount: number): {
  safe: number;
  injured: number;
  kia: number;
} {
  const probIndex = Math.min(ejectionCount, EJECTION_PROBABILITIES.length - 1);
  const probs = EJECTION_PROBABILITIES[probIndex];
  if (!probs) {
    return { safe: 100, injured: 0, kia: 0 };
  }
  return {
    safe: probs[0],
    injured: probs[1],
    kia: probs[2],
  };
}
