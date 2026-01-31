/**
 * Mission Type Setup - Sets up callbacks based on mission type.
 *
 * Extracted from mission-launcher.ts to keep file sizes manageable.
 */

import { logDebug } from '../../core/logger';
import type { Game } from '../../game';
import type { CampaignController } from '../controller-types';
import type { Contract } from '../types';
import {
  createAmbushMissionEndCallback,
  createAmbushTickCallback,
  setupAmbushMission,
} from './ambush-launcher';
import {
  createAttackStationMissionEndCallback,
  createAttackStationTickCallback,
} from './attack-station-callbacks';
import { setupAttackStationMission } from './attack-station-launcher';
import {
  createEscortMissionEndCallback,
  createEscortTickCallback,
  setupEscortMission,
} from './escort-launcher';
import {
  createMissionEndCallback,
  createTickCallback,
} from './mission-callbacks';
import type { MissionEndState } from './mission-waves';
import { createWaveState, initializeFirstWave } from './mission-waves';
import {
  createStationDefenseMissionEndCallback,
  createStationDefenseTickCallback,
  setupStationDefenseMission,
} from './station-defense-launcher';

/**
 * Setup mission type-specific callbacks on the game object.
 *
 * This configures onTick and onMissionEnd based on the contract's mission type.
 */
export function setupMissionTypeCallbacks(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): void {
  const missionType = contract.missionType ?? 'elimination';

  if (missionType === 'escort' && contract.escortData) {
    setupEscortCallbacks(
      controller,
      game,
      contract,
      missionEndState,
      executeMissionEnd,
    );
  } else if (missionType === 'station-defense' && contract.stationDefenseData) {
    setupStationDefenseCallbacks(
      controller,
      game,
      contract,
      missionEndState,
      executeMissionEnd,
    );
  } else if (missionType === 'attack-station' && contract.attackStationData) {
    setupAttackStationCallbacks(
      controller,
      game,
      contract,
      missionEndState,
      executeMissionEnd,
    );
  } else if (missionType === 'ambush' && contract.ambushData) {
    setupAmbushCallbacks(
      controller,
      game,
      contract,
      missionEndState,
      executeMissionEnd,
    );
  } else {
    setupEliminationCallbacks(
      controller,
      game,
      contract,
      missionEndState,
      executeMissionEnd,
    );
  }
}

function setupEscortCallbacks(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): void {
  const escortState = setupEscortMission(game.world, contract);

  game.onTick = createEscortTickCallback(
    controller,
    game,
    contract,
    escortState,
    missionEndState,
    executeMissionEnd,
  );

  game.onMissionEnd = createEscortMissionEndCallback(
    controller,
    escortState,
    missionEndState,
  );

  const { convoySize } = contract.escortData ?? { convoySize: 0 };
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] Escort mission started: ${contract.name}`,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] ${convoySize} convoy ships to protect`,
  );
}

function setupStationDefenseCallbacks(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): void {
  const stationState = setupStationDefenseMission(game.world, contract);

  game.onTick = createStationDefenseTickCallback(
    controller,
    game,
    contract,
    stationState,
    missionEndState,
    executeMissionEnd,
  );

  game.onMissionEnd = createStationDefenseMissionEndCallback(
    controller,
    game,
    stationState,
    missionEndState,
  );

  const { waves } = contract.stationDefenseData ?? { waves: [] };
  const totalEnemies = waves.reduce(
    (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
    0,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] Station defense mission started: ${contract.name}`,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] ${totalEnemies} enemies across ${waves.length} waves`,
  );
}

function setupAttackStationCallbacks(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): void {
  const attackState = setupAttackStationMission(game.world, contract);

  game.onTick = createAttackStationTickCallback(
    controller,
    game,
    contract,
    attackState,
    missionEndState,
    executeMissionEnd,
  );

  game.onMissionEnd = createAttackStationMissionEndCallback(
    controller,
    game,
    contract,
    attackState,
    missionEndState,
  );

  const { initialDefenders, reinforcementWaves } =
    contract.attackStationData ?? {
      initialDefenders: [],
      reinforcementWaves: [],
    };
  const totalDefenders = initialDefenders.reduce((sum, e) => sum + e.count, 0);
  const totalReinforcements = reinforcementWaves.reduce(
    (sum, w) => sum + w.allies.reduce((s, a) => s + a.count, 0),
    0,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] Attack station mission started: ${contract.name}`,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] ${totalDefenders} defenders, ${totalReinforcements} reinforcements`,
  );
}

function setupAmbushCallbacks(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): void {
  const ambushState = setupAmbushMission(game.world, contract);

  game.onTick = createAmbushTickCallback(
    controller,
    game,
    contract,
    ambushState,
    missionEndState,
    executeMissionEnd,
  );

  game.onMissionEnd = createAmbushMissionEndCallback(
    controller,
    game,
    ambushState,
    missionEndState,
  );

  const { escorts, convoySize } = contract.ambushData ?? {
    escorts: [],
    convoySize: 0,
  };
  const totalEscorts = escorts.reduce((sum, e) => sum + e.count, 0);
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] Ambush mission started: ${contract.name}`,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] ${convoySize} convoy targets, ${totalEscorts} escorts`,
  );
}

function setupEliminationCallbacks(
  controller: CampaignController,
  game: Game,
  contract: Contract,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): void {
  const waves = contract.waves ?? [];
  const waveState = createWaveState(waves.length);

  // Handle first wave - spawn immediately or after delay (shared with replay)
  initializeFirstWave(game.world, waveState, waves);
  if (waveState.delayRemaining > 0) {
    logDebug(
      `[WAVE ${performance.now().toFixed(0)}ms] First wave in ${waveState.delayRemaining.toFixed(1)}s`,
    );
  } else {
    logDebug(
      `[WAVE ${performance.now().toFixed(0)}ms] Wave 1/${waveState.totalWaves} spawned`,
    );
  }

  game.onTick = createTickCallback(
    controller,
    game,
    contract,
    waveState,
    missionEndState,
    executeMissionEnd,
  );

  game.onMissionEnd = createMissionEndCallback(
    controller,
    waveState,
    missionEndState,
  );

  const totalEnemies = waves.reduce(
    (sum, w) => sum + w.enemies.reduce((s, e) => s + e.count, 0),
    0,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] Mission started: ${contract.name}`,
  );
  logDebug(
    `[MISSION ${performance.now().toFixed(0)}ms] ${totalEnemies} enemies across ${waves.length} waves`,
  );
}
