/**
 * Mission End Executor - handles mission completion logic.
 *
 * Processes everything that happens when a mission ends:
 * - Replay recording
 * - Stats finalization
 * - Salvage calculation
 * - Campaign state updates
 * - Screen transitions
 *
 * Helper functions are in mission-end-helpers.ts.
 */

import { createDerivedPRNG, random } from '../../core/prng';
import { type Game, stopGame } from '../../game';
import { clearActiveGame } from '../../multiplayer/active-game';
import { cleanupSpectatorInput } from '../../multiplayer/spectator-input';
import { clearSpectatorState } from '../../multiplayer/spectator-state';
import { stopRecording } from '../../systems/input';
import { finalizeMatchStats } from '../../systems/stats';
import { endMission, updateCampaignState } from '../../ui/common/screens';
import {
  collectDebriefData,
  enhanceDebriefWithEjections,
} from '../../ui/screens/results/debrief';
import type { CampaignController } from '../controller-types';
import { getLobbyContext } from '../handlers/lobby-context';
import { showResults } from '../handlers/mission-handlers';
import { cleanupMultiplayerPause } from '../handlers/multiplayer-pause-handler';
import { refreshRecruits } from '../recruits';
import { applySalvage, calculateSalvage } from '../salvage';
import { extractAmmoFromWorld } from '../ship-spawning';
import { applyAmmoUsage, applyMissionResults, isGameOver } from '../state';
import { calculateMissionSalaries } from '../state-mission';
import { autoSave, deleteCheckpoint, getActiveSlotId } from '../storage';
import type { Contract } from '../types';
import {
  applyPilotStatsFromDebrief,
  buildMultiplayerReplayIfRecording,
  buildReplayIfRecording,
  extractShipsLost,
  handleGameOver,
  handleMultiplayerResults,
  rewireRouterAfterMission,
  saveReplayWithSalvage,
} from './mission-end-helpers';
import { disposeMissionRenderers } from './mission-renderer';
import type { MissionEndState } from './mission-waves';

/** Create the mission end execution callback */
export function createMissionEndExecutor(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  setupContractsScreen: (controller: CampaignController) => void,
): () => Promise<void> {
  const { screenManager } = controller;

  return async () => {
    console.log('[EXECUTOR] Starting mission end');
    controller.missionEnded = true;

    // Stop input recording and save replay
    const recorder = stopRecording(game.world);

    // Finalize match stats before stopping
    finalizeMatchStats(game.world);

    // Collect debrief data while world is still available
    // Enhance with ejection info using PRE-mission campaign state
    const rawDebriefData = collectDebriefData(game.world);
    const debriefData = enhanceDebriefWithEjections(
      rawDebriefData,
      screenManager.campaignState,
    );

    // Extract remaining ammo from all player ships before stopping
    const ammoData = extractAmmoFromWorld(game.world);

    // Stop the game loop
    stopGame(game);

    // Clean up mission resources (WebGL contexts, etc.)
    if (controller.missionRenderers) {
      disposeMissionRenderers(controller.missionRenderers);
      controller.missionRenderers = null;
    }
    controller.game = null;

    // Clear active game reference (for test utilities)
    clearActiveGame();

    // Re-wire router after mission cleanup
    rewireRouterAfterMission();

    // Clean up spectator mode if active
    cleanupSpectatorInput();
    clearSpectatorState();

    // Clean up multiplayer pause coordination
    cleanupMultiplayerPause();

    // Build replay data if we were recording (save happens after salvage calc)
    // Use multiplayer replay builder for multiplayer sessions
    const lobbyCtx = getLobbyContext();
    const fullReplay = lobbyCtx
      ? buildMultiplayerReplayIfRecording(
          controller,
          contract,
          screenManager.campaignState,
          missionEndState,
          debriefData,
        )
      : buildReplayIfRecording(
          recorder,
          game.world,
          contract,
          screenManager.campaignState,
          missionEndState,
          debriefData,
        );

    // Get match stats for death/salvage processing
    const matchStats = game.world.systemState.matchStats;

    // Extract destroyed player/wingman ships from match stats
    const shipsLost = extractShipsLost(matchStats);

    // Base reward (victory only) - salvage is now items, not credits
    const rewardMultiplier = missionEndState.rewardMultiplier ?? 1;
    const baseReward = missionEndState.victory
      ? Math.round(contract.reward * rewardMultiplier)
      : 0;

    // Calculate pilot salaries (before applying results to get correct ship state)
    const salaryInfo = calculateMissionSalaries(
      screenManager.campaignState,
      shipsLost,
    );

    // Apply mission results to campaign state (including salary deduction)
    let newState = applyMissionResults(
      screenManager.campaignState,
      missionEndState.victory,
      baseReward,
      shipsLost,
      missionEndState.victory ? contract.id : undefined,
      salaryInfo.total,
    );

    // Apply ammo usage to campaign state (persist remaining ammo)
    newState = applyAmmoUsage(newState, ammoData);

    // Apply pilot combat stats from debrief data
    newState = applyPilotStatsFromDebrief(newState, debriefData);

    // Calculate and apply item-based salvage from all destroyed ships
    let salvageResult: ReturnType<typeof calculateSalvage> | null = null;
    if (matchStats && matchStats.salvageableShips.length > 0) {
      const salvageRng = createDerivedPRNG(
        newState.seed,
        'salvage',
        newState.missionCount,
      );
      salvageResult = calculateSalvage(matchStats.salvageableShips, () =>
        random(salvageRng),
      );
      newState = applySalvage(newState, salvageResult);
    }

    // Add salvage data to replay and save
    saveReplayWithSalvage(fullReplay, salvageResult);

    // Refresh available recruits after each mission (derived PRNG for determinism)
    const recruitRng = createDerivedPRNG(
      newState.seed,
      'recruits',
      newState.missionCount,
    );
    newState = refreshRecruits(newState, () => random(recruitRng));

    // Update campaign state and save before transitioning screens
    updateCampaignState(screenManager, newState);
    await autoSave(newState, 'mission-complete');

    // Determine if we need the checkpoint for recovery
    const gameOver = isGameOver(newState);
    const needsCheckpointRecovery = !newState.settings.ironmanMode && gameOver;

    // Clean up checkpoint after mission (only if not needed for recovery)
    if (!newState.settings.ironmanMode && !needsCheckpointRecovery) {
      const slotId = getActiveSlotId();
      if (slotId) {
        await deleteCheckpoint(slotId);
      }
    }

    // Transition to appropriate screen
    const isMultiplayer = lobbyCtx !== null;

    if (gameOver) {
      handleGameOver(
        controller,
        game.world,
        newState,
        isMultiplayer,
        lobbyCtx,
        debriefData,
        shipsLost,
        setupContractsScreen,
        contract,
        missionEndState,
      );
    } else if (isMultiplayer && lobbyCtx) {
      handleMultiplayerResults(
        controller,
        game.world,
        lobbyCtx,
        debriefData,
        baseReward,
        shipsLost,
        missionEndState,
        contract,
        setupContractsScreen,
        salvageResult,
        salaryInfo,
      );
    } else {
      // Singleplayer path: show normal results
      endMission(screenManager, missionEndState.victory);
      showResults(
        controller,
        missionEndState.victory,
        contract,
        setupContractsScreen,
        game.world,
        salvageResult,
        baseReward,
        missionEndState.escortResults,
        missionEndState.ambushResults,
        missionEndState.stationDefenseResults,
        missionEndState.attackStationResults,
        salaryInfo,
      );
    }
  };
}
