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
import type { AIBehaviorMode } from '../../components/ai';
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
  getStationDefenseRewardMultiplier,
  processStationDefenseMissionTick,
  type StationDefenseMissionState,
} from '../../systems/station-defense';
import type { CampaignController } from '../controller-types';
import type { Contract, ContractEnemy } from '../types';
import { createMissionResultOverlay } from '../utils';
import {
  calculateWaveDelay,
  MISSION_END_DELAY,
  type MissionEndState,
  spawnWave,
} from './mission-waves';

/** Minimum spawn distance from station for reinforcements */
const REINFORCEMENT_SPAWN_DISTANCE = 500;

/** Maximum spawn distance from station for reinforcements */
const REINFORCEMENT_SPAWN_DISTANCE_MAX = 800;

/**
 * Set behavior mode for all ships of a faction.
 * Used to set wingmen to station-defense mode.
 */
export function setFactionBehaviorMode(
  world: World,
  faction: Faction,
  mode: AIBehaviorMode,
): void {
  for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
    const factionComp = getComponent(world, entity, 'faction');
    if (factionComp?.faction !== faction) continue;
    const ai = getComponent(world, entity, 'aiControlled');
    if (ai) {
      ai.behaviorMode = mode;
    }
  }
}

/**
 * Set all enemy ships to station-hunter mode.
 * Called after spawning waves to ensure enemies prioritize the station.
 */
export function setEnemiesToStationHunter(world: World): void {
  setFactionBehaviorMode(world, Faction.Enemy, 'station-hunter');
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

  // Spawn at random position around station (away from typical enemy spawn direction)
  // Enemies spawn away from station, so reinforcements spawn between station and enemies
  const angle = randomRange(world.prng, -Math.PI / 2, Math.PI / 2); // 180 degrees facing away from station
  const distance = randomRange(
    world.prng,
    REINFORCEMENT_SPAWN_DISTANCE,
    REINFORCEMENT_SPAWN_DISTANCE_MAX,
  );

  const spawnX = stationPosition.x + Math.sin(angle) * distance;
  const spawnZ = stationPosition.z + Math.cos(angle) * distance;
  const spawnY = randomRange(world.prng, -50, 50);

  const spawnPos = new Vector3(spawnX, spawnY, spawnZ);

  // Face toward enemies (default forward is -Z which is toward enemies)
  const rotation = new Quaternion();

  // Use reinforcement callsign prefix
  const callsignPrefix = 'Rescue';

  const entity = createAIShip(
    world,
    spec.archetype,
    Faction.Player,
    spawnPos,
    rotation,
    spec.skill,
    callsignPrefix,
  );

  // Set reinforcement to station-defense mode
  const ai = getComponent(world, entity, 'aiControlled');
  if (ai) {
    ai.behaviorMode = 'station-defense';
  }

  logDebug(
    `[STATION DEFENSE] Reinforcement ${reinforcementIndex + 1} spawned: ${spec.archetype}`,
  );

  return entity;
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
      setEnemiesToStationHunter(world);
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
  const stationDefenseData = contract.stationDefenseData!;

  return (world: World) => {
    // Skip if mission already ended
    if (controller.missionEnded) return;

    // Handle mission end delay (same as wave missions)
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
    if (missionEndState.pending) return; // Already ending

    // Victory is determined by mission result (set by processStationDefenseMissionTick)
    missionEndState.victory =
      game.world.systemState.mission.result === MissionResult.Victory;
    missionEndState.pending = true;
    missionEndState.delayRemaining = MISSION_END_DELAY;

    // Calculate reward multiplier based on station health remaining
    missionEndState.rewardMultiplier = getStationDefenseRewardMultiplier(
      game.world,
      stationState,
    );

    // Store station defense results for display
    const healthRatio = missionEndState.rewardMultiplier ?? 0;
    missionEndState.stationDefenseResults = {
      stationHealthPercent: Math.round(healthRatio * 100),
      reinforcementsArrived: stationState.reinforcementsArrived,
      reinforcementsSpawned: stationState.reinforcementsSpawned,
    };

    // Show VICTORY/DEFEAT overlay
    const isDefeat = !missionEndState.victory;
    const overlay = createMissionResultOverlay(isDefeat);
    controller.missionContainer?.appendChild(overlay);

    logDebug(
      `[STATION DEFENSE] Mission ${missionEndState.victory ? 'Victory' : 'Defeat'} - ` +
        `Station health: ${Math.round(healthRatio * 100)}%`,
    );
  };
}
