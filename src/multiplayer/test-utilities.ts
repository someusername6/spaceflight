/**
 * Test Utilities - Exposes internal state for E2E testing.
 *
 * These utilities are used by E2E tests to access and manipulate
 * game state that isn't normally accessible via the UI.
 *
 * Only call these in development/test environments.
 */

import { getLobbyContext } from '../campaign/handlers/lobby-context';
import type { DestroyedShipRecord } from '../components/combat-stats';
import { listReplays, loadReplay } from '../replay/storage';
import {
  type FullReplayData,
  isMultiplayerReplay,
  type MultiplayerReplayData,
} from '../replay/types';
import { getActiveGame, getActiveMissionEndState } from './active-game';
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

  /**
   * Force mission victory for faster E2E testing.
   * Configures the mission end state to trigger immediate victory.
   * Returns true if successful, false if no mission is running.
   */
  forceVictory: () => boolean;

  /**
   * Force mission defeat for E2E testing.
   * Ends the mission as a loss without killing anyone.
   * Use this for testing non-elimination defeat scenarios (e.g., convoy escapes).
   * Returns true if successful, false if no mission is running.
   */
  forceDefeat: () => boolean;

  /**
   * Force commander death for E2E testing.
   * Records the commander's ship as destroyed, triggering game over in ironman.
   * This is different from forceDefeat - it specifically kills the commander.
   * Returns true if successful, false if no mission is running.
   */
  forceCommanderDeath: () => boolean;

  /**
   * Check if the current campaign is in ironman mode.
   * Returns true if ironman, false otherwise or if no campaign is loaded.
   */
  isIronmanCampaign: () => boolean;

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

    forceVictory(): boolean {
      const missionEndState = getActiveMissionEndState();
      if (!missionEndState) {
        return false;
      }

      // Configure mission end state to trigger immediate victory
      // The normal tick callback will call executeMissionEnd() on the next tick
      missionEndState.pending = true;
      missionEndState.victory = true;
      missionEndState.delayRemaining = 0;

      return true;
    },

    forceDefeat(): boolean {
      const missionEndState = getActiveMissionEndState();
      if (!missionEndState) {
        return false;
      }

      // Configure mission end state to trigger immediate defeat
      // Commander survives - this is just a mission loss (e.g., convoy escaped)
      missionEndState.pending = true;
      missionEndState.victory = false;
      missionEndState.delayRemaining = 0;

      return true;
    },

    forceCommanderDeath(): boolean {
      const missionEndState = getActiveMissionEndState();
      if (!missionEndState) {
        return false;
      }

      const game = getActiveGame();
      if (!game) {
        return false;
      }

      const ctx = getLobbyContext();
      const campaignState = ctx?.screenManager.campaignState;
      if (!campaignState) {
        return false;
      }

      // Find the commander's ship and add it to destroyedShips
      // This is needed so applyMissionResults recognizes the commander died
      const commanderShip = campaignState.ships.find(
        (s) => s.pilot?.id === campaignState.commanderId,
      );

      if (!commanderShip || !commanderShip.pilot) {
        return false;
      }

      if (!game.world.systemState.matchStats) {
        return false;
      }

      const record: DestroyedShipRecord = {
        entityId: 0,
        archetype: commanderShip.shipClass,
        callsign: commanderShip.pilot.name ?? 'Commander',
        wasPlayer: true,
        isWingman: false,
        campaignShipId: commanderShip.id,
        pilotId: commanderShip.pilot.id,
        stats: {
          kills: 0,
          assists: 0,
          damageDealt: 0,
          damageReceived: 0,
          weaponStats: [],
        },
        hullMax: 100,
        timeOfDeath: game.world.systemState.gameTime,
      };
      game.world.systemState.matchStats.destroyedShips.push(record);

      // Configure mission end state to trigger immediate defeat
      missionEndState.pending = true;
      missionEndState.victory = false;
      missionEndState.delayRemaining = 0;

      return true;
    },

    isIronmanCampaign(): boolean {
      const ctx = getLobbyContext();
      if (!ctx?.screenManager.campaignState) {
        return false;
      }
      return ctx.screenManager.campaignState.settings.ironmanMode;
    },

    async getMostRecentReplay(): Promise<
      FullReplayData | MultiplayerReplayData | null
    > {
      const replays = await listReplays();
      // Replays are sorted newest first
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
