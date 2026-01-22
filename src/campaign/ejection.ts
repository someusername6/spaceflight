/**
 * Ejection System - Probability-based retirement for wingman pilots.
 *
 * When a wingman's ship is destroyed, they eject and survive. Each ejection
 * has an increasing chance of causing retirement (permanent removal from roster).
 * If they don't retire, they're injured for 1 mission.
 *
 * Retirement chance curve (based on ejection count BEFORE current ejection):
 * - 1st ejection (count=0): 0% - always survives
 * - 2nd ejection (count=1): 15%
 * - 3rd ejection (count=2): 30%
 * - 4th ejection (count=3): 45%
 * - 5th+ ejection (count>=4): 50% (capped)
 *
 * The 50% cap means pilots can theoretically survive many ejections,
 * creating memorable "legendary survivor" stories.
 */

import { createDerivedPRNG, random } from '../core/prng';

/**
 * Calculate retirement chance based on ejection count (BEFORE this ejection).
 * Returns probability in range [0, 0.5].
 */
export function getRetirementChance(ejectionCount: number): number {
  if (ejectionCount <= 0) return 0;
  if (ejectionCount >= 4) return 0.5;
  // Linear: 15% per ejection after first, capped at 50%
  return Math.min(0.15 * ejectionCount, 0.5);
}

/**
 * Determine if a pilot retires after ejection.
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
 * @returns true if pilot retires, false if they survive (injured)
 */
export function rollForRetirement(
  campaignSeed: number,
  missionCount: number,
  pilotId: string,
  ejectionCount: number,
): boolean {
  const retirementChance = getRetirementChance(ejectionCount);
  if (retirementChance <= 0) return false;

  const prng = createDerivedPRNG(
    campaignSeed,
    'retirement',
    missionCount,
    pilotId,
  );
  return random(prng) < retirementChance;
}
