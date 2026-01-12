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

/** Result of contract generation with metadata */
export interface GeneratedContracts {
  /** The contracts available to the player */
  contracts: Contract[];
  /** True if all missions completed and these are replays (50% reward) */
  isReplayMode: boolean;
  /** Number of uncompleted missions remaining in sector */
  remainingCount: number;
}

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

/** Replay mode reward multiplier (50% of normal reward) */
const REPLAY_REWARD_MULTIPLIER = 0.5;

/**
 * Generate contracts for the contracts screen.
 * Returns a selection of missions from the current sector, mixing tiers.
 *
 * @param sector - Current campaign sector (1-5)
 * @param seed - Campaign seed for deterministic selection
 * @param sectorMissionsCompleted - Missions completed in current sector (for variation)
 * @param count - Number of contracts to show (default 4)
 * @param completedIds - IDs of already completed missions to exclude
 * @param refreshCount - Number of times contracts have been refreshed (for variation)
 */
export function generateContracts(
  sector: number,
  seed: number,
  sectorMissionsCompleted: number,
  count = 4,
  completedIds: string[] = [],
  refreshCount = 0,
): GeneratedContracts {
  // Get all missions for this sector that haven't been completed
  const allSectorMissions = getMissionsForSector(sector);
  const available = allSectorMissions.filter(
    (m) => !completedIds.includes(m.id),
  );

  const isReplayMode = available.length === 0;
  const remainingCount = available.length;

  // Use full pool if in replay mode, otherwise use available missions
  const pool = isReplayMode ? allSectorMissions : available;

  // Use derived PRNG for deterministic selection (prevents save scumming)
  // Include refreshCount in seed so refreshing gives different results
  const prng = createDerivedPRNG(
    seed,
    'contracts',
    sector,
    sectorMissionsCompleted,
    refreshCount,
  );

  // Try to get a mix of tiers
  const lowTier = pool.filter((m) => m.tier === 'low');
  const midTier = pool.filter((m) => m.tier === 'mid');
  const highTier = pool.filter((m) => m.tier === 'high');

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
    const remaining = pool.filter((m) => !selected.includes(m));
    selected.push(...pickFrom(remaining, count - selected.length));
  }

  // Sort by reward (ascending)
  let contracts = selected.sort((a, b) => a.reward - b.reward).slice(0, count);

  // In replay mode, halve all rewards
  if (isReplayMode) {
    contracts = contracts.map((c) => ({
      ...c,
      reward: Math.floor(c.reward * REPLAY_REWARD_MULTIPLIER),
    }));
  }

  return { contracts, isReplayMode, remainingCount };
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
