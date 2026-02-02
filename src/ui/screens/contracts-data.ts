/**
 * Contract/Mission Data - Helper functions for mission access.
 *
 * Mission definitions are split by sector in ./missions/ directory.
 *
 * Balance targets by DIFFICULTY (vs sector-specific loadout, 90s+ avg time):
 * - Easy: 80-90% win rate
 * - Medium: 70-80% win rate
 * - Hard: 60-70% win rate
 *
 * Each sector has all three difficulties. See ECONOMY.md for sector test loadouts.
 */

import { ALL_MISSIONS } from '../../campaign/contracts';
import type { Contract } from '../../campaign/types';
import { createDerivedPRNG, shuffle } from '../../core/prng';

/** Number of contracts shown on the contracts screen */
export const CONTRACTS_PER_SCREEN = 5;

/** Result of contract generation with metadata */
export interface GeneratedContracts {
  /** The contracts available to the player */
  contracts: Contract[];
  /** True if all missions completed and these are replays (50% reward) */
  isReplayMode: boolean;
}

/**
 * Get all missions for a specific sector.
 */
export function getMissionsForSector(sector: number): Contract[] {
  return ALL_MISSIONS.filter((m) => m.sector === sector);
}

/** Replay mode reward multiplier (50% of normal reward) */
const REPLAY_REWARD_MULTIPLIER = 0.5;

/**
 * Generate contracts for the contracts screen.
 * Returns a selection of missions from the current sector, mixing difficulties.
 *
 * @param sector - Current campaign sector (1-5)
 * @param seed - Campaign seed for deterministic selection
 * @param sectorMissionsCompleted - Missions completed in current sector (for variation)
 * @param count - Number of contracts to show (default 4)
 * @param completedIds - IDs of already completed missions to exclude
 * @param refreshCount - Number of times contracts have been refreshed (for variation)
 * @param excludeIds - IDs of contracts to exclude (e.g., currently shown contracts during refresh)
 */
export function generateContracts(
  sector: number,
  seed: number,
  sectorMissionsCompleted: number,
  count = 4,
  completedIds: string[] = [],
  refreshCount = 0,
  excludeIds: string[] = [],
): GeneratedContracts {
  // Get all missions for this sector that haven't been completed
  const allSectorMissions = getMissionsForSector(sector);
  const available = allSectorMissions.filter(
    (m) => !completedIds.includes(m.id),
  );

  const isReplayMode = available.length === 0;

  // Use full pool if in replay mode, otherwise use available missions
  // Also exclude any specified IDs (e.g., currently shown contracts during refresh)
  const basePool = isReplayMode ? allSectorMissions : available;
  const filteredPool = basePool.filter((m) => !excludeIds.includes(m.id));
  // Fall back to basePool if exclusions leave nothing (edge case: sector has exactly `count` missions)
  const pool = filteredPool.length > 0 ? filteredPool : basePool;

  // Use derived PRNG for deterministic selection (prevents save scumming)
  // Include refreshCount in seed so refreshing gives different results
  const prng = createDerivedPRNG(
    seed,
    'contracts',
    sector,
    sectorMissionsCompleted,
    refreshCount,
  );

  // Try to get a mix of difficulties
  const easyMissions = pool.filter((m) => m.difficulty === 'easy');
  const mediumMissions = pool.filter((m) => m.difficulty === 'medium');
  const hardMissions = pool.filter((m) => m.difficulty === 'hard');

  const selected: Contract[] = [];

  // Pick 1-2 from each difficulty if available, prioritizing variety
  const pickFrom = (arr: Contract[], max: number) => {
    const shuffled = shuffle(prng, [...arr]);
    return shuffled.slice(0, max);
  };

  // Aim for 2 easy, 1 medium, 1 hard (or adjust based on availability)
  selected.push(...pickFrom(easyMissions, 2));
  selected.push(...pickFrom(mediumMissions, 1));
  selected.push(...pickFrom(hardMissions, 1));

  // If we don't have enough, fill from any difficulty
  if (selected.length < count) {
    const remaining = pool.filter((m) => !selected.includes(m));
    selected.push(...pickFrom(remaining, count - selected.length));
  }

  // Sort by reward (ascending)
  let contracts = selected.sort((a, b) => a.reward - b.reward).slice(0, count);

  // In replay mode, halve all rewards (except in sector 5 - final sector has no penalty)
  if (isReplayMode && sector < 5) {
    contracts = contracts.map((c) => ({
      ...c,
      reward: Math.floor(c.reward * REPLAY_REWARD_MULTIPLIER),
    }));
  }

  return { contracts, isReplayMode };
}

/**
 * Get all defined missions (for testing/debugging).
 */
export function getAllMissions(): Contract[] {
  return [...ALL_MISSIONS];
}
