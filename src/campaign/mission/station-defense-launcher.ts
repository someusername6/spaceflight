/**
 * Station Defense Mission Launcher - Sets up station defense missions.
 *
 * Handles:
 * - Spawning the station entity
 * - Setting up wave-based enemy spawning
 * - Spawning reinforcements when triggered
 * - Mission end callbacks with reward calculation
 */

import { Quaternion, Vector3 } from 'three';
import { getComponent, queryEntities } from '../../core/ecs';
import { logDebug } from '../../core/logger';
import { randomRange } from '../../core/prng';
import type { Entity, World } from '../../core/types';
import { Faction, MissionResult } from '../../core/types';
import { getStationStats } from '../../data/stations';
import { createAIShip } from '../../factories/ship';
import { createStationEntity } from '../../factories/station';
import { type Game, TICK_SEC } from '../../game';
import {
  createStationDefenseMissionState,
  getStationHealthRatio,
  processStationDefenseMissionTick,
  type StationDefenseMissionState,
} from '../../systems/station-defense';
import type { CampaignController } from '../controller-types';
import type { Contract, ContractEnemy } from '../types';
import {
  handleMissionEndDelay,
  setFactionBehaviorMode,
  triggerMissionEnd,
} from './mission-launcher-base';
import {
  calculateWaveDelay,
  type MissionEndState,
  spawnWave,
} from './mission-waves';

/** Minimum spawn distance from station for reinforcements */
const REINFORCEMENT_SPAWN_DISTANCE = 500;

/** Maximum spawn distance from station for reinforcements */
const REINFORCEMENT_SPAWN_DISTANCE_MAX = 800;

/** Initial allies spawn closer to station */
const INITIAL_ALLY_SPAWN_DISTANCE = 150;
const INITIAL_ALLY_SPAWN_DISTANCE_MAX = 250;

/**
 * Set enemy ships behavior mode based on playerThreatRatio.
 * Some enemies attack player or player allies (standard), others attack station (station-hunter).
 *
 * @param world - Game world
 * @param playerThreatRatio - Ratio of enemies that target player/allies instead of station (0-1)
 */
export function setEnemiesToStationHunter(
  world: World,
  playerThreatRatio: number = 0,
): void {
  for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
    const faction = getComponent(world, entity, 'faction');
    if (!faction || faction.faction !== Faction.Enemy) continue;

    const ai = getComponent(world, entity, 'aiControlled');
    if (!ai) continue;
    // Only set if not already assigned (preserves existing mode)
    if (ai.behaviorMode !== undefined) continue;

    ai.behaviorMode =
      randomRange(world.prng, 0, 1) < playerThreatRatio
        ? 'standard' // Attack player or player allies
        : 'station-hunter'; // Attack station
  }
}

/**
 * Spawn an allied ship near the station.
 * Used for both initial allies and reinforcements.
 */
function spawnAllyNearStation(
  world: World,
  stationPosition: Vector3,
  spec: ContractEnemy,
  index: number,
  callsignPrefix: string,
  minDistance: number,
  maxDistance: number,
): Entity {
  // Spawn at random position around station (toward player side, +Z)
  // Full 360 degree spread for natural distribution
  const angle = randomRange(world.prng, 0, Math.PI * 2);
  const distance = randomRange(world.prng, minDistance, maxDistance);

  const spawnX = stationPosition.x + Math.sin(angle) * distance;
  const spawnZ = stationPosition.z + Math.cos(angle) * distance;
  const spawnY = randomRange(world.prng, -30, 30);

  const spawnPos = new Vector3(spawnX, spawnY, spawnZ);

  // Face toward enemies (default forward is -Z)
  const rotation = new Quaternion();

  const entity = createAIShip(
    world,
    spec.archetype,
    Faction.Player,
    spawnPos,
    rotation,
    spec.skill,
    callsignPrefix,
  );

  // Set to station-defense mode
  const ai = getComponent(world, entity, 'aiControlled');
  if (ai) {
    ai.behaviorMode = 'station-defense';
  }

  logDebug(
    `[STATION DEFENSE] ${callsignPrefix} ${index + 1} spawned: ${spec.archetype}`,
  );

  return entity;
}

/**
 * Spawn an initial ally near the station (garrison).
 */
export function spawnInitialAlly(
  world: World,
  stationPosition: Vector3,
  spec: ContractEnemy,
  index: number,
): Entity {
  return spawnAllyNearStation(
    world,
    stationPosition,
    spec,
    index,
    'Garrison',
    INITIAL_ALLY_SPAWN_DISTANCE,
    INITIAL_ALLY_SPAWN_DISTANCE_MAX,
  );
}

/**
 * Spawn a reinforcement ship near the station.
 * Exported for replay support.
 */
export function spawnReinforcementForReplay(
  world: World,
  stationPosition: Vector3,
  reinforcementPool: ContractEnemy[],
  reinforcementIndex: number,
): Entity | null {
  if (reinforcementPool.length === 0) return null;

  // Pick random archetype from pool
  const poolIndex = Math.floor(
    randomRange(world.prng, 0, reinforcementPool.length),
  );
  const spec = reinforcementPool[poolIndex] as ContractEnemy;

  return spawnAllyNearStation(
    world,
    stationPosition,
    spec,
    reinforcementIndex,
    'Rescue',
    REINFORCEMENT_SPAWN_DISTANCE,
    REINFORCEMENT_SPAWN_DISTANCE_MAX,
  );
}

/** Setup station defense mission (called from mission launcher) */
export function setupStationDefenseMission(
  world: World,
  contract: Contract,
): StationDefenseMissionState {
  const stationDefenseData = contract.stationDefenseData;
  if (!stationDefenseData) {
    throw new Error('Station defense mission requires stationDefenseData');
  }

  // Mark as station defense mission
  world.systemState.mission.missionType = 'station-defense';

  // Get station stats - use overrides from mission data or defaults from station type
  const baseStats = getStationStats(stationDefenseData.stationType);
  const stationHealth = stationDefenseData.stationHealth ?? baseStats.hull;
  const stationShields = stationDefenseData.stationShields ?? baseStats.shields;

  // Spawn station at configured distance (typically negative Z = in front of player who faces -Z)
  const stationPosition = new Vector3(0, 0, stationDefenseData.stationDistance);

  // Build station options, only including defined values
  const stationOptions: Parameters<typeof createStationEntity>[2] = {};
  if (stationDefenseData.stationType !== undefined) {
    stationOptions.stationType = stationDefenseData.stationType;
  }
  if (stationDefenseData.stationHealth !== undefined) {
    stationOptions.health = stationDefenseData.stationHealth;
  }
  if (stationDefenseData.stationShields !== undefined) {
    stationOptions.shields = stationDefenseData.stationShields;
  }

  const stationEntity = createStationEntity(
    world,
    stationPosition,
    stationOptions,
  );

  logDebug(
    `[STATION DEFENSE] Station spawned at Z=${stationDefenseData.stationDistance}`,
  );
  logDebug(
    `[STATION DEFENSE] Health: ${stationHealth}, Shields: ${stationShields}`,
  );

  // Create mission state
  const state = createStationDefenseMissionState(
    stationEntity,
    stationPosition,
    stationHealth,
    stationShields,
    stationDefenseData.waves.length,
    stationDefenseData.reinforcementTime,
    stationDefenseData.reinforcementHealthThreshold,
    stationDefenseData.reinforcementCount,
  );

  // Set wingmen to station-defense mode
  setFactionBehaviorMode(world, Faction.Player, 'station-defense');
  logDebug('[STATION DEFENSE] Set wingmen to station-defense mode');

  // Spawn initial allies (for military stations)
  const initialAllies = stationDefenseData.initialAllies ?? [];
  let allyIndex = 0;
  for (const spec of initialAllies) {
    for (let i = 0; i < spec.count; i++) {
      spawnInitialAlly(world, stationPosition, spec, allyIndex);
      allyIndex++;
    }
  }
  if (initialAllies.length > 0) {
    const totalInitial = initialAllies.reduce((sum, s) => sum + s.count, 0);
    logDebug(`[STATION DEFENSE] Spawned ${totalInitial} initial allies`);
  }

  // Handle first wave - spawn immediately or after delay
  const waves = stationDefenseData.waves;
  const firstWave = waves[0];
  if (firstWave) {
    const firstWaveDelay = calculateWaveDelay(firstWave.delay, world.prng);
    if (firstWaveDelay > 0) {
      // Set currentWave = -1 so tick callback increments to 0 when spawning
      state.currentWave = -1;
      state.waveCleared = true;
      state.delayRemaining = firstWaveDelay;
      logDebug(`[STATION DEFENSE] First wave in ${firstWaveDelay.toFixed(1)}s`);
    } else {
      // Spawn first wave immediately
      spawnWave(world, firstWave, 0);
      setEnemiesToStationHunter(
        world,
        stationDefenseData.playerThreatRatio ?? 0,
      );
      logDebug(`[STATION DEFENSE] Wave 1/${state.totalWaves} spawned`);
    }
  }

  logDebug(
    `[STATION DEFENSE] Reinforcements: ${stationDefenseData.reinforcementCount} ships ` +
      `(time: ${stationDefenseData.reinforcementTime ?? 'N/A'}s, ` +
      `health: ${(stationDefenseData.reinforcementHealthThreshold * 100).toFixed(0)}%)`,
  );

  return state;
}

/** Create tick callback for station defense mission */
export function createStationDefenseTickCallback(
  controller: CampaignController,
  _game: Game,
  contract: Contract,
  stationState: StationDefenseMissionState,
  missionEndState: MissionEndState,
  executeMissionEnd: () => Promise<void>,
): (world: World) => void {
  const stationDefenseData = contract.stationDefenseData;
  if (!stationDefenseData) {
    throw new Error('Station defense mission requires stationDefenseData');
  }

  return (world: World) => {
    if (controller.missionEnded) return;
    if (handleMissionEndDelay(missionEndState, executeMissionEnd)) return;

    // Process station defense mission logic
    processStationDefenseMissionTick(
      world,
      stationState,
      contract,
      TICK_SEC,
      () =>
        spawnReinforcementForReplay(
          world,
          stationState.stationPosition,
          stationDefenseData.reinforcementPool,
          stationState.reinforcementsSpawned,
        ),
    );
  };
}

/** Create mission end callback for station defense mission */
export function createStationDefenseMissionEndCallback(
  controller: CampaignController,
  game: Game,
  stationState: StationDefenseMissionState,
  missionEndState: MissionEndState,
): () => void {
  return () => {
    if (missionEndState.pending) return;

    // Victory is determined by mission result (set by processStationDefenseMissionTick)
    const victory =
      game.world.systemState.mission.result === MissionResult.Victory;

    // Get station health for display (flat reward, not scaled by health)
    const healthRatio =
      stationState.stationEntity !== null
        ? getStationHealthRatio(
            game.world,
            stationState.stationEntity,
            stationState.initialStationHealth,
          )
        : 0;

    // Store station defense results for display
    missionEndState.stationDefenseResults = {
      stationHealthPercent: Math.round(healthRatio * 100),
      reinforcementsArrived: stationState.reinforcementsArrived,
      reinforcementsSpawned: stationState.reinforcementsSpawned,
    };

    triggerMissionEnd({
      missionEndState,
      controller,
      victory,
      logPrefix: 'STATION DEFENSE',
      logDetails: `Station health: ${Math.round(healthRatio * 100)}%`,
    });
  };
}
