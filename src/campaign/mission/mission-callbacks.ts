/**
 * Mission Callbacks - game loop callbacks for mission execution.
 */

import { logError, logWarn } from '../../core/logger';
import { createDerivedPRNG, random } from '../../core/prng';
import type { World } from '../../core/types';
import {
  type Game,
  MissionResult,
  resetMissionNotification,
  resetMissionState,
  stopGame,
} from '../../game';
import { buildReplayData } from '../../replay/replay-builder';
import { saveReplay } from '../../replay/storage';
import type { FullReplayData } from '../../replay/types';
import { stopRecording } from '../../systems/input';
import { finalizeMatchStats } from '../../systems/stats';
import { endMission, updateCampaignState } from '../../ui/common/screens';
import {
  collectDebriefData,
  enhanceDebriefWithEjections,
} from '../../ui/screens/results/debrief';
import type { CampaignController } from '../controller-types';
import {
  handleNonIronmanDefeat,
  showGameOver,
  showResults,
} from '../handlers/mission-handlers';
import { refreshRecruits } from '../recruits';
import { applySalvage, calculateSalvage } from '../salvage';
import { extractAmmoFromWorld } from '../ship-spawning';
import {
  applyAmmoUsage,
  applyMissionResults,
  applyPilotStats,
  getCommanderShip,
  isGameOver,
} from '../state';
import { autoSave, deleteCheckpoint, getActiveSlotId } from '../storage';
import type { Contract } from '../types';
import { createMissionResultOverlay } from '../utils';
import { disposeMissionRenderers } from './mission-renderer';
import type { MissionEndState, WaveState } from './mission-waves';
import { MISSION_END_DELAY, processWaveTick } from './mission-waves';

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
    controller.missionEnded = true;

    // Stop input recording and save replay
    const recorder = stopRecording();

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

    // Build replay data if we were recording (save happens after salvage calc)
    let fullReplay: FullReplayData | null = null;
    if (recorder) {
      const playerShip = getCommanderShip(screenManager.campaignState);
      const shipType = playerShip?.shipClass ?? 'fighter';

      const contractInfo: import('../../replay/replay-builder').ReplayContractInfo =
        {
          id: contract.id,
          name: contract.name,
          sector: contract.sector,
        };
      if (contract.missionType) {
        contractInfo.missionType = contract.missionType;
      }

      fullReplay = buildReplayData({
        recorder,
        world: game.world,
        contract: contractInfo,
        shipType,
        victory: missionEndState.victory,
        debriefData,
      });
    }

    // Get match stats for death/salvage processing
    const matchStats = game.world.systemState.matchStats;

    // Extract destroyed player/wingman ships from match stats
    const shipsLost: string[] = [];
    if (matchStats) {
      for (const record of matchStats.destroyedShips) {
        // Only include player faction ships with campaign IDs
        if ((record.wasPlayer || record.isWingman) && record.campaignShipId) {
          shipsLost.push(record.campaignShipId);
        }
      }
    }

    // Base reward (victory only) - salvage is now items, not credits
    // For escort missions, reward is scaled by convoy survival rate
    const rewardMultiplier = missionEndState.rewardMultiplier ?? 1;
    const baseReward = missionEndState.victory
      ? Math.round(contract.reward * rewardMultiplier)
      : 0;

    let newState = applyMissionResults(
      screenManager.campaignState,
      missionEndState.victory,
      baseReward,
      shipsLost,
      missionEndState.victory ? contract.id : undefined,
    );

    // Apply ammo usage to campaign state (persist remaining ammo)
    newState = applyAmmoUsage(newState, ammoData);

    // Apply pilot combat stats from debrief data (reuses existing extraction)
    // Map campaignShipId -> pilotId using campaign state
    const shipToPilot = new Map<string, string>();
    for (const ship of screenManager.campaignState.ships) {
      if (ship.pilot) {
        shipToPilot.set(ship.id, ship.pilot.id);
      }
    }

    const pilotStatsData = debriefData.pilots
      .filter((p) => p.campaignShipId && shipToPilot.has(p.campaignShipId))
      .map((p) => ({
        pilotId: shipToPilot.get(p.campaignShipId!)!,
        kills: p.kills,
        assists: p.assists,
        damageDealt: p.damageDealt,
        damageReceived: p.damageReceived,
      }));

    newState = applyPilotStats(newState, pilotStatsData);

    // Calculate and apply item-based salvage from all destroyed ships
    // (Convoy ships are excluded from salvage in the stats system)
    let salvageResult: ReturnType<typeof calculateSalvage> | null = null;
    if (matchStats && matchStats.salvageableShips.length > 0) {
      // Use derived PRNG for deterministic salvage (prevents save scumming)
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

    // Add salvage data to replay and save (now that salvage is calculated)
    if (fullReplay) {
      // Add salvage data (null on defeat, object on victory with salvage)
      if (salvageResult) {
        fullReplay.salvageData = {
          scrap: { ...salvageResult.scrap },
          weapons: salvageResult.weapons.map((w) => ({
            weaponType: w.weaponType,
            category: w.category,
            count: w.count,
          })),
          ammo: salvageResult.ammo.map((a) => ({
            weaponType: a.weaponType,
            count: a.count,
          })),
          totalValue: salvageResult.totalValue,
        };
      } else {
        // No salvage (defeat or no ships destroyed)
        fullReplay.salvageData = null;
      }

      // Save to IndexedDB (async, fire and forget)
      saveReplay(fullReplay).catch((err) => {
        logWarn('[Replay] Failed to save replay:', err);
      });
    }

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
    // For non-ironman game over, handleNonIronmanDefeat will load then delete
    if (!newState.settings.ironmanMode && !needsCheckpointRecovery) {
      const slotId = getActiveSlotId();
      if (slotId) {
        await deleteCheckpoint(slotId);
      }
    }

    // Transition to results or game over
    if (gameOver) {
      endMission(screenManager, missionEndState.victory);

      // Check if this is an ironman campaign
      const isIronman = newState.settings.ironmanMode;

      if (isIronman) {
        // Ironman: permadeath - show game over screen with debrief
        showGameOver(controller, game.world).catch((error) => {
          logError('Error in game over handler:', error);
        });
      } else {
        // Non-ironman: show debrief then restore from checkpoint
        handleNonIronmanDefeat(
          controller,
          setupContractsScreen,
          contract,
          game.world,
        );
      }
    } else {
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
      );
    }
  };
}

/** Create the game tick callback for wave management */
export function createTickCallback(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  waveState: WaveState,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): (world: World) => void {
  const TICK_SEC = 1 / 60;

  return (world: World) => {
    // Skip if mission already ended
    if (controller.missionEnded) return;

    // Handle mission end delay countdown
    if (missionEndState.pending) {
      missionEndState.delayRemaining -= TICK_SEC;
      if (missionEndState.delayRemaining <= 0) {
        executeMissionEnd();
      }
      return; // Don't process waves while ending
    }

    // Process wave logic (shared with replay for determinism)
    const result = processWaveTick(world, waveState, contract, TICK_SEC);

    // Live gameplay needs to reset mission state when new wave spawns
    // so missionSystem can detect Victory for this wave
    if (result.waveSpawned) {
      resetMissionState(game.world);
      resetMissionNotification(game);
    }
  };
}

/** Create the mission end callback */
export function createMissionEndCallback(
  controller: CampaignController,
  waveState: WaveState,
  missionEndState: MissionEndState,
): (result: MissionResult) => void {
  return (result: MissionResult) => {
    // For wave-based missions, only end when all waves are complete
    const allWavesComplete = waveState.currentWave >= waveState.totalWaves - 1;
    const isDefeat = result === MissionResult.Defeat;

    // Only end mission if it's a defeat OR all waves are complete
    if (!isDefeat && !allWavesComplete) return;

    // Prevent multiple calls (check both flags)
    if (controller.missionEnded || missionEndState.pending) return;

    // Start the mission end delay (game keeps running so explosions play out)
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;
    missionEndState.victory = result === MissionResult.Victory;

    // Show victory/defeat overlay immediately
    const overlay = createMissionResultOverlay(isDefeat);
    controller.missionContainer?.appendChild(overlay);
  };
}
