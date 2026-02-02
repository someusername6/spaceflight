/**
 * Attack Station Mission Callbacks - Tick and mission end callbacks.
 */

import type { World } from '../../core/types';
import { MissionResult } from '../../core/types';
import { type Game, TICK_SEC } from '../../game';
import type { CampaignController } from '../controller-types';
import type { Contract } from '../types';
import type { AttackStationMissionState } from './attack-station-launcher';
import {
  getStationHealthRatio,
  processAttackStationMissionTick,
} from './attack-station-launcher';
import {
  handleMissionEndDelay,
  triggerMissionEnd,
} from './mission-launcher-base';
import type { MissionEndState } from './mission-waves';

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
    if (controller.missionEnded) return;
    if (handleMissionEndDelay(missionEndState, executeMissionEnd)) return;

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
    if (missionEndState.pending) return;

    // Victory is determined by mission result
    const victory =
      game.world.systemState.mission.result === MissionResult.Victory;

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
      stationDestroyed: victory,
      stationDamagePercent: damagePercent,
      reinforcementsReceived: attackState.nextReinforcementWave,
      totalReinforcements:
        game.world.systemState.mission.missionType === 'attack-station'
          ? (contract.attackStationData?.reinforcementWaves.length ?? 0)
          : 0,
      overwhelmed: attackState.overwhelmingSpawned,
    };

    triggerMissionEnd({
      missionEndState,
      controller,
      victory,
      rewardMultiplier: victory ? 1.0 : 0,
      logPrefix: 'ATTACK STATION',
      logDetails: `Station damage: ${damagePercent}%`,
    });
  };
}
