/**
 * Replay Test Utilities - Replay-related test utilities for E2E testing.
 */

import { listReplays, loadReplay } from '../replay/storage';
import {
  type FullReplayData,
  isMultiplayerReplay,
  type MultiplayerReplayData,
} from '../replay/types';

export interface ReplayTestUtilities {
  /**
   * Get the most recently saved replay.
   * Returns the full replay data or null if no replays exist.
   */
  getMostRecentReplay: () => Promise<
    FullReplayData | MultiplayerReplayData | null
  >;

  /**
   * Get the number of saved replays.
   */
  getReplayCount: () => Promise<number>;

  /**
   * Check if a replay is a multiplayer replay.
   * Takes a replay ID and returns true if multiplayer, false otherwise.
   */
  isMultiplayerReplay: (replayId: string) => Promise<boolean>;

  /**
   * Get player count from the most recent replay (multiplayer only).
   * Returns 0 if not a multiplayer replay or no replays exist.
   */
  getMostRecentReplayPlayerCount: () => Promise<number>;
}

/**
 * Create replay test utilities.
 */
export function createReplayTestUtilities(): ReplayTestUtilities {
  return {
    async getMostRecentReplay(): Promise<
      FullReplayData | MultiplayerReplayData | null
    > {
      const replays = await listReplays();
      const mostRecent = replays[0];
      if (!mostRecent) return null;
      return loadReplay(mostRecent.id);
    },

    async getReplayCount(): Promise<number> {
      const replays = await listReplays();
      return replays.length;
    },

    async isMultiplayerReplay(replayId: string): Promise<boolean> {
      const replay = await loadReplay(replayId);
      if (!replay) return false;
      return isMultiplayerReplay(replay);
    },

    async getMostRecentReplayPlayerCount(): Promise<number> {
      const replay = await this.getMostRecentReplay();
      if (!replay) return 0;
      if (!isMultiplayerReplay(replay)) return 0;
      return replay.players.length;
    },
  };
}
