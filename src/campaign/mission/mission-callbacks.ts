/**
 * Mission Callbacks - game loop callbacks for mission execution.
 */

import type { CombatStats } from '../../components/combat-stats';
import { getComponent, queryEntities } from '../../core/ecs';
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
import { encodeRLE } from '../../replay/compression';
import { saveReplay } from '../../replay/storage';
import type { FullReplayData, ReplayOutcome } from '../../replay/types';
import { REPLAY_VERSION } from '../../replay/types';
import { stopRecording } from '../../systems/input';
import { finalizeMatchStats } from '../../systems/stats';
import { endMission, updateCampaignState } from '../../ui/common/screens';
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

    // Save replay if we were recording
    if (recorder) {
      const replayData = recorder.getReplayData();
      const matchStats = game.world.systemState.matchStats;

      // Get player ship class from campaign state
      const playerShip = getCommanderShip(screenManager.campaignState);
      const shipType = playerShip?.shipClass ?? 'fighter';

      // Calculate stats - first try living player, then check destroyed ships
      let kills = 0;
      let damageDealt = 0;
      let damageTaken = 0;
      let foundLivingPlayer = false;

      // Query living player entity for stats (player survived)
      for (const entity of queryEntities(game.world, [
        'playerControlled',
        'combatStats',
      ])) {
        const stats = getComponent<CombatStats>(
          game.world,
          entity,
          'combatStats',
        );
        if (stats) {
          kills = stats.kills;
          damageDealt = stats.damageDealt;
          damageTaken = stats.damageReceived;
          foundLivingPlayer = true;
          break; // Only one player
        }
      }

      // If player died, get stats from destroyed ships record
      if (!foundLivingPlayer && matchStats) {
        for (const record of matchStats.destroyedShips) {
          if (record.wasPlayer) {
            kills = record.stats.kills;
            damageDealt = record.stats.damageDealt;
            damageTaken = record.stats.damageReceived;
            break;
          }
        }
      }

      // Determine outcome
      const outcome: ReplayOutcome = missionEndState.victory
        ? 'victory'
        : 'defeat';

      // RLE compress inputs
      const { data: compressedInputs, compressed } = encodeRLE(
        replayData.inputs,
      );

      // Build full replay data with deployment loadouts for deterministic reconstruction
      const playerLoadout = recorder.getPlayerLoadout();
      if (!playerLoadout) {
        logWarn('[Replay] No player loadout captured, skipping replay save');
        return;
      }

      const fullReplay: FullReplayData = {
        version: REPLAY_VERSION,
        seed: replayData.seed,
        inputs: compressedInputs,
        inputsCompressed: compressed,
        tickCount: replayData.tickCount,
        metadata: {
          id: '', // Assigned by storage
          missionId: contract.id,
          missionName: contract.name,
          sector: contract.sector,
          shipType,
          outcome,
          durationTicks: replayData.tickCount,
          recordedAt: Date.now(),
          gameVersion: __APP_VERSION__,
          stats: { kills, damageDealt, damageTaken },
        },
        playerLoadout,
        wingmen: recorder.getWingmen(),
        playerAutoaim: recorder.getPlayerAutoaim(),
      };

      // Save to IndexedDB (async, fire and forget)
      saveReplay(fullReplay).catch((err) => {
        logWarn('[Replay] Failed to save replay:', err);
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
    const baseReward = missionEndState.victory ? contract.reward : 0;

    let newState = applyMissionResults(
      screenManager.campaignState,
      missionEndState.victory,
      baseReward,
      shipsLost,
      missionEndState.victory ? contract.id : undefined,
    );

    // Apply ammo usage to campaign state (persist remaining ammo)
    newState = applyAmmoUsage(newState, ammoData);

    // Calculate and apply item-based salvage from all destroyed ships
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
