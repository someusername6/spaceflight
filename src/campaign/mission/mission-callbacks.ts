/**
 * Mission Callbacks - game loop callbacks for mission execution.
 *
 * Contains tick and mission end callbacks for the game loop.
 * The main executor logic is in mission-end-executor.ts.
 */

import type { World } from '../../core/types';
import {
  type Game,
  MissionResult,
  resetMissionNotification,
  resetMissionState,
} from '../../game';
import type { CampaignController } from '../controller-types';
import type { Contract } from '../types';
import { createMissionResultOverlay } from '../utils';
import type { MissionEndState, WaveState } from './mission-waves';
import { MISSION_END_DELAY, processWaveTick } from './mission-waves';

// Re-export the executor from its own module
export { createMissionEndExecutor } from './mission-end-executor';

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
    if (controller.missionEnded) {
      return;
    }

    // Handle mission end delay countdown
    if (missionEndState.pending) {
      missionEndState.delayRemaining -= TICK_SEC;
      if (missionEndState.delayRemaining <= 0) {
        executeMissionEnd().catch((err) => {
          console.error('[mission-callbacks] executeMissionEnd failed:', err);
        });
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
