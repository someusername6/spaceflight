/**
 * Mission Callbacks - game loop callbacks for mission execution.
 */

import { createDerivedPRNG, random } from '../../core/prng';
import type { World } from '../../core/types';
import {
  countLivingEnemyShips,
  type Game,
  MissionResult,
  resetMissionNotification,
  resetMissionState,
  stopGame,
} from '../../game';
import { finalizeMatchStats } from '../../systems/stats';
import { endMission, updateCampaignState } from '../../ui/common/screens';
import type { CampaignController } from '../controller-types';
import { showGameOver, showResults } from '../handlers/mission-handlers';
import { refreshRecruits } from '../recruits';
import { applySalvage, calculateSalvage } from '../salvage';
import { extractAmmoFromWorld } from '../ship-spawning';
import { applyAmmoUsage, applyMissionResults, isGameOver } from '../state';
import type { Contract } from '../types';
import { createMissionResultOverlay } from '../utils';
import type { MissionEndState, WaveState } from './mission-waves';
import {
  calculateWaveDelay,
  MISSION_END_DELAY,
  spawnWave,
} from './mission-waves';

/** Create the mission end execution callback */
export function createMissionEndExecutor(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  setupContractsScreen: (controller: CampaignController) => void,
): () => void {
  const { screenManager } = controller;

  return () => {
    controller.missionEnded = true;

    // Finalize match stats before stopping
    finalizeMatchStats(game.world);

    // Extract remaining ammo from all player ships before stopping
    const ammoData = extractAmmoFromWorld(game.world);

    // Stop the game loop
    stopGame(game);

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

    // Update campaign state
    updateCampaignState(screenManager, newState);

    // Transition to results or game over
    if (isGameOver(newState)) {
      endMission(screenManager, missionEndState.victory);
      showGameOver(controller, setupContractsScreen);
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
  executeMissionEnd: () => void,
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

    const enemyCount = countLivingEnemyShips(world);

    // Check if current wave is cleared
    if (enemyCount === 0 && !waveState.waveCleared) {
      waveState.waveCleared = true;
      const nextWaveIndex = waveState.currentWave + 1;

      if (nextWaveIndex < waveState.totalWaves) {
        // Set delay for next wave
        const nextWave = contract.waves[nextWaveIndex];
        if (nextWave) {
          waveState.delayRemaining = calculateWaveDelay(
            nextWave.delay,
            world.prng,
          );
        }
      }
    }

    // Handle wave delay and spawning
    if (
      waveState.waveCleared &&
      waveState.currentWave + 1 < waveState.totalWaves
    ) {
      if (waveState.delayRemaining > 0) {
        waveState.delayRemaining -= TICK_SEC;
      } else {
        // Spawn next wave
        waveState.currentWave++;
        waveState.waveCleared = false;
        const nextWave = contract.waves[waveState.currentWave];
        if (nextWave) {
          // Reset mission state so missionSystem can detect Victory for this wave
          resetMissionState(game.world);
          // Reset notification tracking so we get notified when this wave clears
          resetMissionNotification(game);

          spawnWave(world, nextWave, waveState.currentWave);
        }
      }
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
