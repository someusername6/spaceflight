/**
 * Mission End Helpers - utility functions for mission completion.
 *
 * Extracted from mission-end-executor.ts to keep file sizes manageable.
 */

import { logError } from '../../core/logger';
import type { World } from '../../core/types';
import {
  broadcastMissionEnded,
  clearLobbyChat,
  setDebriefState,
} from '../../multiplayer/session-lifecycle';
import { endMission } from '../../ui/common/screens';
import type { collectDebriefData } from '../../ui/screens/results/debrief';
import type { CampaignController } from '../controller-types';
import { getLobbyContext } from '../handlers/lobby-context';
import { wireMessageHandlers } from '../handlers/lobby-protocol-routing';
import {
  handleNonIronmanDefeat,
  showGameOver,
  showMultiplayerResults,
} from '../handlers/mission-handlers';
import type { calculateSalvage } from '../salvage';
import { applyPilotStats } from '../state';
import type { SalaryInfo } from '../state-mission';
import type { Contract } from '../types';
import type { MissionEndState } from './mission-waves';

// Re-export replay helpers from the replay module
export {
  buildMultiplayerReplayIfRecording,
  buildReplayIfRecording,
  saveReplayWithSalvage,
} from './mission-end-replay';

// =============================================================================
// Router Cleanup
// =============================================================================

/** Re-wire router after mission cleanup */
export function rewireRouterAfterMission(): void {
  const ctx = getLobbyContext();
  if (ctx) {
    const transport = ctx.connectionFlow.getTransport();
    if (transport) {
      ctx.router.wireToTransport(undefined);
    }
    const hostPeerId = ctx.router.getHostPeerId();
    wireMessageHandlers(ctx, hostPeerId);
  }
}

// =============================================================================
// Stats Extraction
// =============================================================================

/** Extract ships lost from match stats */
export function extractShipsLost(
  matchStats: World['systemState']['matchStats'],
): string[] {
  const shipsLost: string[] = [];
  if (matchStats) {
    for (const record of matchStats.destroyedShips) {
      if ((record.wasPlayer || record.isWingman) && record.campaignShipId) {
        shipsLost.push(record.campaignShipId);
      }
    }
  }
  return shipsLost;
}

/** Apply pilot stats from debrief data */
export function applyPilotStatsFromDebrief(
  state: CampaignController['screenManager']['campaignState'],
  debriefData: ReturnType<typeof collectDebriefData>,
): CampaignController['screenManager']['campaignState'] {
  // Map campaignShipId -> pilotId using campaign state
  const shipToPilot = new Map<string, string>();
  for (const ship of state.ships) {
    if (ship.pilot) {
      shipToPilot.set(ship.id, ship.pilot.id);
    }
  }

  const pilotStatsData: Array<{
    pilotId: string;
    kills: number;
    assists: number;
    damageDealt: number;
    damageReceived: number;
  }> = [];

  for (const p of debriefData.pilots) {
    if (p.campaignShipId) {
      const pilotId = shipToPilot.get(p.campaignShipId);
      if (pilotId) {
        pilotStatsData.push({
          pilotId,
          kills: p.kills,
          assists: p.assists,
          damageDealt: p.damageDealt,
          damageReceived: p.damageReceived,
        });
      }
    }
  }

  // Get pilots who ejected and survived (for XP bonus)
  // Includes both safe ejections and injured pilots (not KIA)
  const ejectedPilotIds = new Set<string>();
  for (const pilot of debriefData.pilots) {
    if (pilot.isEjected && !pilot.isKIA && pilot.campaignShipId) {
      const pilotId = shipToPilot.get(pilot.campaignShipId);
      if (pilotId) {
        ejectedPilotIds.add(pilotId);
      }
    }
  }

  return applyPilotStats(state, pilotStatsData, ejectedPilotIds);
}

// =============================================================================
// Screen Transitions
// =============================================================================

/** Handle game over transition */
export function handleGameOver(
  controller: CampaignController,
  world: World,
  newState: CampaignController['screenManager']['campaignState'],
  isMultiplayer: boolean,
  lobbyCtx: ReturnType<typeof getLobbyContext>,
  debriefData: ReturnType<typeof collectDebriefData>,
  shipsLost: string[],
  setupContractsScreen: (controller: CampaignController) => void,
  contract: Contract,
  missionEndState: MissionEndState,
): void {
  const { screenManager } = controller;
  endMission(screenManager, missionEndState.victory);

  const isIronman = newState.settings.ironmanMode;

  if (isIronman) {
    // Ironman: permadeath - show game over screen with debrief
    showGameOver(controller, world).catch((error) => {
      logError('Error in game over handler:', error);
    });
  } else {
    // Non-ironman: show debrief then restore from checkpoint
    if (isMultiplayer && lobbyCtx?.isHost) {
      const outcomeData = buildOutcomeData(
        false,
        0,
        shipsLost,
        debriefData,
        lobbyCtx,
      );
      broadcastMissionEnded(lobbyCtx, outcomeData);
      clearLobbyChat(lobbyCtx);
      setDebriefState(lobbyCtx, outcomeData);
    }

    handleNonIronmanDefeat(controller, setupContractsScreen, contract, world);
  }
}

/** Handle multiplayer results transition */
export function handleMultiplayerResults(
  controller: CampaignController,
  world: World,
  lobbyCtx: NonNullable<ReturnType<typeof getLobbyContext>>,
  debriefData: ReturnType<typeof collectDebriefData>,
  baseReward: number,
  shipsLost: string[],
  missionEndState: MissionEndState,
  contract: Contract,
  setupContractsScreen: (controller: CampaignController) => void,
  salvageResult: ReturnType<typeof calculateSalvage> | null,
  salaryInfo?: SalaryInfo,
): void {
  const { screenManager } = controller;

  console.log('[EXECUTOR] Multiplayer path, showing results');
  endMission(screenManager, missionEndState.victory);

  const outcomeData = buildOutcomeData(
    missionEndState.victory,
    baseReward,
    shipsLost,
    debriefData,
    lobbyCtx,
  );

  if (lobbyCtx.isHost) {
    broadcastMissionEnded(lobbyCtx, outcomeData);
  }

  clearLobbyChat(lobbyCtx);
  setDebriefState(lobbyCtx, outcomeData);

  showMultiplayerResults(
    controller,
    missionEndState.victory,
    contract,
    setupContractsScreen,
    world,
    salvageResult,
    baseReward,
    missionEndState.escortResults,
    missionEndState.ambushResults,
    missionEndState.stationDefenseResults,
    missionEndState.attackStationResults,
    salaryInfo,
  );
}

// =============================================================================
// Outcome Building
// =============================================================================

/** Build outcome data for multiplayer broadcast */
export function buildOutcomeData(
  victory: boolean,
  creditsEarned: number,
  shipsLost: string[],
  debriefData: ReturnType<typeof collectDebriefData>,
  lobbyCtx: NonNullable<ReturnType<typeof getLobbyContext>>,
): {
  victory: boolean;
  creditsEarned: number;
  shipsLost: string[];
  kills: Record<string, number>;
  assists: Record<string, number>;
  damageDealt: Record<string, number>;
} {
  const outcomeData = {
    victory,
    creditsEarned,
    shipsLost,
    kills: {} as Record<string, number>,
    assists: {} as Record<string, number>,
    damageDealt: {} as Record<string, number>,
  };

  for (const pilot of debriefData.pilots) {
    if (pilot.campaignShipId) {
      const player = lobbyCtx.lobbyState.players.find(
        (p) => p.shipId === pilot.campaignShipId,
      );
      if (player) {
        outcomeData.kills[player.playerId] = pilot.kills;
        outcomeData.assists[player.playerId] = pilot.assists;
        outcomeData.damageDealt[player.playerId] = pilot.damageDealt;
      }
    }
  }

  return outcomeData;
}
