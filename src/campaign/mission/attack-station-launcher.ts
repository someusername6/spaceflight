/**
 * Attack Station Mission Launcher - Sets up attack station missions.
 *
 * Player attacks an enemy station while enemy defenders protect it.
 * Friendly reinforcements arrive in waves over time.
 * An overwhelming enemy wave spawns after a timer as a soft time limit.
 *
 * Victory: Station destroyed
 * Defeat: Player dies
 */

import { Vector3 } from 'three';
import type { AIBehaviorMode } from '../../components/ai';
import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import { logDebug } from '../../core/logger';
import type { Entity, World } from '../../core/types';
import { Faction, MissionResult } from '../../core/types';
import { getStationStats } from '../../data/stations';
import { createStationEntity } from '../../factories/station';
import { isHighDpsShip } from '../../systems/ai/ai-dps-utils';
import type { Contract } from '../types';
import { spawnDefender, spawnReinforcement } from './attack-station-spawning';

/** Attack station mission runtime state */
export interface AttackStationMissionState {
  /** Whether attack station mission logic is active */
  active: boolean;
  /** Station entity ID */
  stationEntity: Entity | null;
  /** Station position */
  stationPosition: Vector3;
  /** Initial station health (for tracking) */
  initialStationHealth: number;

  /** Reinforcement wave timers (time until each wave spawns) */
  reinforcementTimers: number[];
  /** Index of next reinforcement wave to spawn */
  nextReinforcementWave: number;
  /** Total reinforcements spawned */
  reinforcementsSpawned: number;

  /** Time until overwhelming wave spawns */
  overwhelmingTimer: number;
  /** Whether overwhelming wave has spawned */
  overwhelmingSpawned: boolean;

  /** Time since mission start (seconds) */
  timeSinceMissionStart: number;
  /** Mission completed (prevents re-triggering) */
  completed: boolean;
}

/** Create initial attack station mission state */
export function createAttackStationMissionState(
  stationEntity: Entity,
  stationPosition: Vector3,
  stationHealth: number,
  reinforcementDelays: number[],
  overwhelmingSpawnTime: number,
): AttackStationMissionState {
  return {
    active: true,
    stationEntity,
    stationPosition: stationPosition.clone(),
    initialStationHealth: stationHealth,
    reinforcementTimers: reinforcementDelays.map((d) => d),
    nextReinforcementWave: 0,
    reinforcementsSpawned: 0,
    overwhelmingTimer: overwhelmingSpawnTime,
    overwhelmingSpawned: false,
    timeSinceMissionStart: 0,
    completed: false,
  };
}

/** Check if player is dead */
function isPlayerDead(world: World): boolean {
  for (const entity of queryEntities(world, ['playerControlled', 'health'])) {
    const health = getComponent(world, entity, 'health');
    if (health && !isDead(health)) return false;
  }
  return true;
}

/** Check if enemy station is destroyed */
function isEnemyStationDestroyed(world: World, stationEntity: Entity): boolean {
  const health = getComponent(world, stationEntity, 'health');
  if (!health) return true;
  return isDead(health);
}

/** Get current station health ratio (0-1) */
export function getStationHealthRatio(
  world: World,
  stationEntity: Entity,
  initialHealth: number,
): number {
  const health = getComponent(world, stationEntity, 'health');
  if (!health) return 0;
  return health.hull / initialHealth;
}

/**
 * Set behavior mode for player faction ships based on DPS threshold.
 * High DPS ships attack station, low DPS ships attack defenders.
 */
export function assignDpsBasedBehavior(
  world: World,
  dpsThreshold: number,
): void {
  for (const entity of queryEntities(world, ['aiControlled', 'faction'])) {
    const factionComp = getComponent(world, entity, 'faction');
    if (factionComp?.faction !== Faction.Player) continue;

    const ai = getComponent(world, entity, 'aiControlled');
    if (!ai) continue;

    // Assign behavior based on DPS
    const mode: AIBehaviorMode = isHighDpsShip(world, entity, dpsThreshold)
      ? 'station-assault-high-dps'
      : 'station-assault-low-dps';
    ai.behaviorMode = mode;
  }
}

/** Get player position for reinforcement spawning */
function getPlayerPosition(world: World): Vector3 {
  for (const entity of queryEntities(world, [
    'playerControlled',
    'transform',
  ])) {
    const transform = getComponent(world, entity, 'transform');
    if (transform) {
      return transform.position.clone();
    }
  }
  return new Vector3(0, 0, 0);
}

/** Setup attack station mission (called from mission launcher) */
export function setupAttackStationMission(
  world: World,
  contract: Contract,
): AttackStationMissionState {
  const attackData = contract.attackStationData;
  if (!attackData) {
    throw new Error('Attack station mission requires attackStationData');
  }

  // Mark as attack-station mission
  world.systemState.mission.missionType = 'attack-station';

  // Get station stats from station type (default to mining)
  const stationType = attackData.stationType ?? 'mining';
  const baseStats = getStationStats(stationType);
  const stationHealth = baseStats.hull;

  // Spawn enemy station at configured distance (negative Z = in front of player)
  const stationPosition = new Vector3(0, 0, attackData.stationDistance);

  const stationEntity = createStationEntity(world, stationPosition, {
    stationType,
    faction: Faction.Enemy,
  });

  logDebug(
    `[ATTACK STATION] Enemy station spawned at Z=${attackData.stationDistance}`,
  );
  logDebug(`[ATTACK STATION] Health: ${stationHealth}`);

  // Spawn initial enemy defenders
  let defenderIndex = 0;
  for (const spec of attackData.initialDefenders) {
    for (let i = 0; i < spec.count; i++) {
      spawnDefender(world, stationPosition, spec, defenderIndex);
      defenderIndex++;
    }
  }
  const totalDefenders = attackData.initialDefenders.reduce(
    (sum, s) => sum + s.count,
    0,
  );
  logDebug(`[ATTACK STATION] Spawned ${totalDefenders} initial defenders`);

  // Assign DPS-based behavior to player faction ships
  assignDpsBasedBehavior(world, attackData.stationAttackDpsThreshold);
  logDebug(
    `[ATTACK STATION] Assigned DPS-based behavior (threshold: ${attackData.stationAttackDpsThreshold})`,
  );

  // Create mission state with reinforcement delays
  const reinforcementDelays = attackData.reinforcementWaves.map((w) => w.delay);
  const state = createAttackStationMissionState(
    stationEntity,
    stationPosition,
    stationHealth,
    reinforcementDelays,
    attackData.overwhelmingSpawnTime,
  );

  logDebug(
    `[ATTACK STATION] ${attackData.reinforcementWaves.length} reinforcement waves scheduled`,
  );
  logDebug(
    `[ATTACK STATION] Overwhelming wave at ${attackData.overwhelmingSpawnTime}s`,
  );

  return state;
}

/**
 * Process attack station mission tick.
 */
export function processAttackStationMissionTick(
  world: World,
  state: AttackStationMissionState,
  contract: Contract,
  dt: number,
): boolean {
  if (!state.active || state.completed) return false;
  if (state.stationEntity === null) return false;

  const attackData = contract.attackStationData;
  if (!attackData) return false;

  let stateChanged = false;

  // Update mission timer
  state.timeSinceMissionStart += dt;

  // Check defeat condition (player dead)
  if (isPlayerDead(world)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Check victory condition (station destroyed)
  if (isEnemyStationDestroyed(world, state.stationEntity)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Victory;
    return true;
  }

  // Process reinforcement waves
  const playerPos = getPlayerPosition(world);
  while (state.nextReinforcementWave < attackData.reinforcementWaves.length) {
    const waveIndex = state.nextReinforcementWave;
    const wave = attackData.reinforcementWaves[waveIndex];
    if (!wave) break;

    // Check if this wave should spawn (time elapsed >= wave delay)
    if (state.timeSinceMissionStart >= wave.delay) {
      // Spawn this wave
      for (const spec of wave.allies) {
        for (let i = 0; i < spec.count; i++) {
          spawnReinforcement(
            world,
            playerPos,
            spec,
            state.reinforcementsSpawned,
            attackData.stationAttackDpsThreshold,
          );
          state.reinforcementsSpawned++;
        }
      }
      state.nextReinforcementWave++;
      stateChanged = true;
      logDebug(`[ATTACK STATION] Reinforcement wave ${waveIndex + 1} spawned`);
    } else {
      break; // Wait for next wave
    }
  }

  // Process overwhelming wave (soft time limit)
  if (
    !state.overwhelmingSpawned &&
    state.timeSinceMissionStart >= state.overwhelmingTimer
  ) {
    state.overwhelmingSpawned = true;
    stateChanged = true;

    // Spawn overwhelming enemies near station
    let enemyIndex = 0;
    for (const spec of attackData.overwhelmingWave) {
      for (let i = 0; i < spec.count; i++) {
        spawnDefender(world, state.stationPosition, spec, enemyIndex);
        enemyIndex++;
      }
    }
    logDebug(
      `[ATTACK STATION] Overwhelming wave spawned (${enemyIndex} enemies)`,
    );
  }

  return stateChanged;
}

/** Get reward multiplier for attack station mission (100% on victory) */
export function getAttackStationRewardMultiplier(
  _world: World,
  state: AttackStationMissionState,
): number {
  // Full reward on victory (station destroyed)
  return state.completed ? 1.0 : 0;
}
