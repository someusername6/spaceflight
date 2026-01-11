/**
 * Contract/Mission Data - Helper functions for mission access.
 *
 * Mission definitions are split by sector in ./missions/ directory.
 *
 * Balance targets by DIFFICULTY (vs sector-specific loadout, 90s+ avg time):
 * - Easy: 60-80% win rate
 * - Medium: 40-60% win rate
 * - Hard: 20-40% win rate
 *
 * Each sector has all three difficulties. "Tier" (low/mid/high) determines
 * reward amount, not difficulty. See ECONOMY.md for sector test loadouts.
 */

import type { Contract, MissionTier } from '../../campaign/types';
import { createDerivedPRNG, shuffle } from '../../core/prng';
import { ALL_MISSIONS } from './missions';

/**
 * Get all missions for a specific sector.
 */
export function getMissionsForSector(sector: number): Contract[] {
  return ALL_MISSIONS.filter((m) => m.sector === sector);
}

/**
 * Get missions filtered by sector and optionally by tier.
 */
export function getMissions(sector: number, tier?: MissionTier): Contract[] {
  return ALL_MISSIONS.filter(
    (m) => m.sector === sector && (tier === undefined || m.tier === tier),
  );
}

/**
 * Generate contracts for the contracts screen.
 * Returns a selection of missions from the current sector, mixing tiers.
 *
 * @param sector - Current campaign sector (1-5)
 * @param seed - Campaign seed for deterministic selection
 * @param sectorMissionsCompleted - Missions completed in current sector (for variation)
 * @param count - Number of contracts to show (default 4)
 * @param completedIds - IDs of already completed missions to exclude
 */
export function generateContracts(
  sector: number,
  seed: number,
  sectorMissionsCompleted: number,
  count = 4,
  completedIds: string[] = [],
): Contract[] {
  // Get all missions for this sector that haven't been completed
  const available = getMissionsForSector(sector).filter(
    (m) => !completedIds.includes(m.id),
  );

  if (available.length === 0) {
    // All missions completed - allow replaying any mission from this sector
    return getMissionsForSector(sector).slice(0, count);
  }

  // Use derived PRNG for deterministic selection (prevents save scumming)
  const prng = createDerivedPRNG(
    seed,
    'contracts',
    sector,
    sectorMissionsCompleted,
  );

  // Try to get a mix of tiers
  const lowTier = available.filter((m) => m.tier === 'low');
  const midTier = available.filter((m) => m.tier === 'mid');
  const highTier = available.filter((m) => m.tier === 'high');

  const selected: Contract[] = [];

  // Pick 1-2 from each tier if available, prioritizing variety
  const pickFrom = (arr: Contract[], max: number) => {
    const shuffled = shuffle(prng, [...arr]);
    return shuffled.slice(0, max);
  };

  // Aim for 2 low, 1 mid, 1 high (or adjust based on availability)
  selected.push(...pickFrom(lowTier, 2));
  selected.push(...pickFrom(midTier, 1));
  selected.push(...pickFrom(highTier, 1));

  // If we don't have enough, fill from any tier
  if (selected.length < count) {
    const remaining = available.filter((m) => !selected.includes(m));
    selected.push(...pickFrom(remaining, count - selected.length));
  }

  // Sort by reward (ascending)
  return selected.sort((a, b) => a.reward - b.reward).slice(0, count);
}

/**
 * Get total mission count for a sector.
 */
export function getMissionCount(sector: number): number {
  return getMissionsForSector(sector).length;
}

/**
 * Get all defined missions (for testing/debugging).
 */
export function getAllMissions(): Contract[] {
  return [...ALL_MISSIONS];
}
