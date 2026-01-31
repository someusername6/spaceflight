/**
 * Test Utilities - Exposes internal state for E2E testing.
 *
 * These utilities are used by E2E tests to access and manipulate
 * game state that isn't normally accessible via the UI.
 *
 * Only call these in development/test environments.
 */

import { getLobbyContext } from '../campaign/handlers/lobby-context';
import type { PauseReason } from './pause-state';

/**
 * Test utilities exposed to window for E2E tests.
 */
export interface TestUtilities {
  /**
   * Simulate a lag report triggering auto-pause.
   * This mimics what happens when rollback-netcode detects a lagging player.
   */
  simulateLagReport: () => boolean;

  /**
   * Request pause with a specific reason.
   * Returns true if pause was triggered, false if already paused or not in mission.
   */
  requestPause: (reason: PauseReason) => boolean;

  /**
   * Check if currently in a multiplayer mission.
   */
  isInMultiplayerMission: () => boolean;

  /**
   * Get current pause state for assertions.
   */
  getPauseState: () => {
    isPaused: boolean;
    reason: string | null;
    playerCount: number;
  } | null;
}

/**
 * Create test utilities object.
 */
function createTestUtilities(): TestUtilities {
  return {
    simulateLagReport(): boolean {
      const ctx = getLobbyContext();
      if (!ctx?.pauseCoordinator) {
        return false;
      }
      if (ctx.pauseCoordinator.isPaused()) {
        return false;
      }
      ctx.pauseCoordinator.requestPause('lag-detected');
      return true;
    },

    requestPause(reason: PauseReason): boolean {
      const ctx = getLobbyContext();
      if (!ctx?.pauseCoordinator) {
        return false;
      }
      if (ctx.pauseCoordinator.isPaused()) {
        return false;
      }
      ctx.pauseCoordinator.requestPause(reason);
      return true;
    },

    isInMultiplayerMission(): boolean {
      const ctx = getLobbyContext();
      return ctx?.pauseCoordinator !== undefined;
    },

    getPauseState() {
      const ctx = getLobbyContext();
      if (!ctx?.pauseCoordinator) {
        return null;
      }
      const state = ctx.pauseCoordinator.getPauseState();
      if (!state) {
        return {
          isPaused: false,
          reason: null,
          playerCount: 0,
        };
      }
      return {
        isPaused: true,
        reason: state.reason,
        playerCount: state.players.length,
      };
    },
  };
}

/**
 * Install test utilities on window object.
 * Call this once at app startup.
 */
export function installTestUtilities(): void {
  if (typeof window !== 'undefined') {
    (window as Window & { __TEST__?: TestUtilities }).__TEST__ =
      createTestUtilities();
  }
}
