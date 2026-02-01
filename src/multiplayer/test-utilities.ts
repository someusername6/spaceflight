/**
 * Test Utilities - Exposes internal state for E2E testing.
 *
 * These utilities are used by E2E tests to access and manipulate
 * game state that isn't normally accessible via the UI.
 *
 * Only call these in development/test environments.
 */

import { getLobbyContext } from '../campaign/handlers/lobby-context';
import { getCommanderShip } from '../campaign/state';
import type { DestroyedShipRecord } from '../components/combat-stats';
import { getComponent, queryEntities } from '../core/ecs';
import { findLocalPlayer } from '../core/player-utils';
import { getActiveGame, getActiveMissionEndState } from './active-game';
import type { PauseReason } from './pause-state';
import { isSpectating } from './spectator-state';
import {
  createReplayTestUtilities,
  type ReplayTestUtilities,
} from './test-utilities-replay';

/**
 * Test utilities exposed to window for E2E tests.
 */
export interface TestUtilities extends ReplayTestUtilities {
  /** Simulate a lag report triggering auto-pause. */
  simulateLagReport: () => boolean;
  /** Request pause with a specific reason. */
  requestPause: (reason: PauseReason) => boolean;
  /** Check if currently in a multiplayer mission. */
  isInMultiplayerMission: () => boolean;
  /** Get current pause state for assertions. */
  getPauseState: () => {
    isPaused: boolean;
    reason: string | null;
    playerCount: number;
  } | null;
  /** Force mission victory for faster E2E testing. */
  forceVictory: () => boolean;
  /** Force mission defeat without killing anyone. */
  forceDefeat: () => boolean;
  /** Force commander death, triggering game over in ironman. */
  forceCommanderDeath: () => boolean;
  /** Check if the current campaign is in ironman mode. */
  isIronmanCampaign: () => boolean;
  /** Force the local player's ship to die (triggers spectator mode). */
  forceLocalPlayerDeath: () => boolean;
  /** Check if currently in spectator mode. */
  isInSpectatorMode: () => boolean;
  /** Force ALL human player deaths in a multiplayer mission. */
  forceAllHumanPlayersDeath: () => boolean;
}

/**
 * Create test utilities object.
 */
function createTestUtilities(): TestUtilities {
  const replayUtils = createReplayTestUtilities();
  return {
    ...replayUtils,

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

    forceLocalPlayerDeath(): boolean {
      const game = getActiveGame();
      if (!game) {
        return false;
      }

      const localPlayer = findLocalPlayer(game.world);
      if (localPlayer === null) {
        return false;
      }

      const health = getComponent(game.world, localPlayer, 'health');
      if (!health) {
        return false;
      }

      // Set hull to 0 to trigger death detection
      health.hull = 0;
      return true;
    },

    isInSpectatorMode(): boolean {
      return isSpectating();
    },

    forceAllHumanPlayersDeath(): boolean {
      const game = getActiveGame();
      const ctx = getLobbyContext();
      if (!game || !ctx) {
        return false;
      }

      const campaignState = ctx.screenManager.campaignState;
      if (!campaignState) {
        return false;
      }

      const missionEndState = getActiveMissionEndState();
      if (!missionEndState) {
        return false;
      }

      if (!game.world.systemState.matchStats) {
        return false;
      }

      // Build set of all human player ship IDs
      const humanShipIds = new Set<string>();
      const commanderShip = getCommanderShip(campaignState);
      if (commanderShip) {
        humanShipIds.add(commanderShip.id);
      }
      for (const player of ctx.lobbyState.players) {
        if (player.shipId) {
          humanShipIds.add(player.shipId);
        }
      }

      // Find and kill all human player entities
      let killedCount = 0;
      for (const entity of queryEntities(game.world, [
        'shipIdentity',
        'health',
        'playerControlled',
      ])) {
        const identity = getComponent(game.world, entity, 'shipIdentity');
        const health = getComponent(game.world, entity, 'health');
        if (!identity?.campaignShipId || !health) continue;

        // Check if this is a human player's ship
        if (humanShipIds.has(identity.campaignShipId)) {
          // Set hull to 0 to trigger death
          health.hull = 0;

          // Find ship info for destroyed record
          const ship = campaignState.ships.find(
            (s) => s.id === identity.campaignShipId,
          );
          if (ship?.pilot) {
            const record: DestroyedShipRecord = {
              entityId: entity,
              archetype: ship.shipClass,
              callsign: ship.pilot.name ?? 'Unknown',
              wasPlayer: true,
              isWingman: ship.pilot.id !== campaignState.commanderId,
              campaignShipId: ship.id,
              pilotId: ship.pilot.id,
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
          }
          killedCount++;
        }
      }

      // Configure mission end state to trigger immediate defeat
      missionEndState.pending = true;
      missionEndState.victory = false;
      missionEndState.delayRemaining = 0;

      return killedCount > 0;
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
