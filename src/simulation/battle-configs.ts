/**
 * Battle Simulation Configurations - Preset battle setups for different contexts.
 */

import type { ProfileName } from '../data/ai-profiles';

/** Configuration for one team in a battle */
export interface TeamConfig {
  /** Ship archetype name */
  archetype: string;
  /** Number of ships on this team */
  count: number;
  /** AI skill profile */
  profile: ProfileName;
  /** Callsign prefix for this team */
  callsignPrefix: string;
}

/** Full battle configuration */
export interface BattleConfig {
  /** Display name for this configuration */
  name: string;
  /** Team A (uses Player faction internally but is AI controlled) */
  teamA: TeamConfig;
  /** Team B (uses Enemy faction) */
  teamB: TeamConfig;
  /** Spawn distance from origin */
  spawnRadius: number;
  /** Random seed for reproducibility (optional) */
  seed?: number;
}

/** Default 4v4 fighter battle for title screen */
export const TITLE_SCREEN_BATTLE: BattleConfig = {
  name: 'Title Screen',
  teamA: {
    archetype: 'firefly',
    count: 4,
    profile: 'regular',
    callsignPrefix: 'Alpha',
  },
  teamB: {
    archetype: 'dragonfly',
    count: 4,
    profile: 'regular',
    callsignPrefix: 'Bandit',
  },
  spawnRadius: 800,
};
