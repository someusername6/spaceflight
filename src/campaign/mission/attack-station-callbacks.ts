/**
 * Attack Station Mission Callbacks - Tick and mission end callbacks.
 */

import { logDebug } from '../../core/logger';
import type { World } from '../../core/types';
import { MissionResult } from '../../core/types';
import type { Game } from '../../game';
import { TICK_SEC } from '../../game';
import type { CampaignController } from '../controller-types';
import type { Contract } from '../types';
import { createMissionResultOverlay } from '../utils';
import type { AttackStationMissionState } from './attack-station-launcher';
import {
  getStationHealthRatio,
  processAttackStationMissionTick,
} from './attack-station-launcher';
import type { MissionEndState } from './mission-waves';
import { MISSION_END_DELAY } from './mission-waves';

/** Create tick callback for attack station mission */
export function createAttackStationTickCallback(
  controller: CampaignController,
  _game: Game,
  contract: Contract,
  attackState: AttackStationMissionState,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): (world: World) => void {
  return (world: World) => {
    // Skip if mission already ended
    if (controller.missionEnded) return;

    // Handle mission end delay
    if (missionEndState.pending) {
      missionEndState.delayRemaining -= TICK_SEC;
      if (missionEndState.delayRemaining <= 0) {
        missionEndState.pending = false;
        executeMissionEnd().catch((e) => {
          throw e;
        });
      }
      return;
    }

    // Process attack station mission logic
    processAttackStationMissionTick(world, attackState, contract, TICK_SEC);
  };
}

/** Create mission end callback for attack station mission */
export function createAttackStationMissionEndCallback(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  attackState: AttackStationMissionState,
  missionEndState: MissionEndState,
): () => void {
  return () => {
    if (missionEndState.pending) return; // Already ending

    // Victory is determined by mission result
    missionEndState.victory =
      game.world.systemState.mission.result === MissionResult.Victory;
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;

    // Reward multiplier is always 1.0 on victory (no scaling)
    missionEndState.rewardMultiplier = missionEndState.victory ? 1.0 : 0;

    // Calculate station damage for results display
    const healthRatio = attackState.stationEntity
      ? getStationHealthRatio(
          game.world,
          attackState.stationEntity,
          attackState.initialStationHealth,
        )
      : 0;
    const damagePercent = Math.round((1 - healthRatio) * 100);

    // Store attack station results for display
    missionEndState.attackStationResults = {
      stationDestroyed: missionEndState.victory,
      stationDamagePercent: damagePercent,
      reinforcementsReceived: attackState.nextReinforcementWave,
      totalReinforcements:
        game.world.systemState.mission.missionType === 'attack-station'
          ? (contract.attackStationData?.reinforcementWaves.length ?? 0)
          : 0,
      overwhelmed: attackState.overwhelmingSpawned,
    };

    // Show VICTORY/DEFEAT overlay
    const isDefeat = !missionEndState.victory;
    const overlay = createMissionResultOverlay(isDefeat);
    controller.missionContainer?.appendChild(overlay);

    logDebug(
      `[ATTACK STATION] Mission ${missionEndState.victory ? 'Victory' : 'Defeat'} - ` +
        `Station damage: ${damagePercent}%`,
    );
  };
}
