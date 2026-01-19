/**
 * Station Defense Mission System - Handles station defense mission logic.
 *
 * Tracks:
 * - Station health and survival
 * - Wave-based enemy spawning
 * - Reinforcement triggers (time or health threshold)
 * - Victory/defeat conditions
 */

import type { Vector3 } from 'three';
import {
  calculateWaveDelay,
  spawnWave,
} from '../campaign/mission/mission-waves';
import { setEnemiesToStationHunter } from '../campaign/mission/station-defense-launcher';
import type { Contract } from '../campaign/types';
import { isDead } from '../components/health';
import { getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { MissionResult } from '../core/types';
import { countLivingEnemyShips } from './mission';

/** Station defense mission runtime state */
export interface StationDefenseMissionState {
  /** Whether station defense mission logic is active */
  active: boolean;
  /** Station entity ID */
  stationEntity: Entity | null;
  /** Station position */
  stationPosition: Vector3;

  // Health tracking
  /** Initial station health (for reward calculation) */
  initialStationHealth: number;
  /** Initial station shields (for reference) */
  initialStationShields: number;

  // Wave management
  /** Current wave index (0-based) */
  currentWave: number;
  /** Total number of waves */
  totalWaves: number;
  /** Whether current wave is cleared */
  waveCleared: boolean;
  /** Delay remaining before next wave spawns */
  delayRemaining: number;

  // Reinforcement state
  /** Whether reinforcements have arrived */
  reinforcementsArrived: boolean;
  /** Time until reinforcements (seconds), null = health-based only */
  reinforcementTime: number | null;
  /** Station health threshold to trigger reinforcements (0-1) */
  reinforcementHealthThreshold: number;
  /** Number of reinforcement ships to spawn */
  reinforcementCount: number;
  /** Number of reinforcements already spawned */
  reinforcementsSpawned: number;
  /** Time elapsed since mission start (seconds) */
  timeSinceMissionStart: number;

  // End state
  /** Mission completed (prevents re-triggering) */
  completed: boolean;
}

/** Create initial station defense mission state */
export function createStationDefenseMissionState(
  stationEntity: Entity,
  stationPosition: Vector3,
  stationHealth: number,
  stationShields: number,
  totalWaves: number,
  reinforcementTime: number | null,
  reinforcementHealthThreshold: number,
  reinforcementCount: number,
): StationDefenseMissionState {
  return {
    active: true,
    stationEntity,
    stationPosition: stationPosition.clone(),
    initialStationHealth: stationHealth,
    initialStationShields: stationShields,
    currentWave: 0,
    totalWaves,
    waveCleared: false,
    delayRemaining: 0,
    reinforcementsArrived: false,
    reinforcementTime,
    reinforcementHealthThreshold,
    reinforcementCount,
    reinforcementsSpawned: 0,
    timeSinceMissionStart: 0,
    completed: false,
  };
}

/** Check if player is dead */
function isPlayerDead(world: World): boolean {
  for (const entity of queryEntities(world, ['playerControlled', 'health'])) {
    const health = getComponent(world, entity, 'health')!;
    if (!isDead(health)) return false;
  }
  return true;
}

/** Check if station is destroyed */
function isStationDestroyed(world: World, stationEntity: Entity): boolean {
  const health = getComponent(world, stationEntity, 'health');
  if (!health) return true; // Station entity no longer exists
  return isDead(health);
}

/** Get current station health ratio (0-1) */
function getStationHealthRatio(
  world: World,
  stationEntity: Entity,
  initialHealth: number,
): number {
  const health = getComponent(world, stationEntity, 'health');
  if (!health) return 0;
  return health.hull / initialHealth;
}

/**
 * Process station defense mission tick.
 *
 * @param world - Game world
 * @param state - Station defense mission state
 * @param contract - Mission contract with wave definitions
 * @param dt - Delta time in seconds
 * @param spawnReinforcement - Callback to spawn a reinforcement ship
 * @returns true if state changed (for UI updates)
 */
export function processStationDefenseMissionTick(
  world: World,
  state: StationDefenseMissionState,
  contract: Contract,
  dt: number,
  spawnReinforcement: () => Entity | null,
): boolean {
  if (!state.active || state.completed) return false;
  if (state.stationEntity === null) return false;

  let stateChanged = false;
  const stationDefenseData = contract.stationDefenseData;
  if (!stationDefenseData) return false;

  const waves = stationDefenseData.waves;

  // Update mission timer
  state.timeSinceMissionStart += dt;

  // Check defeat conditions (player dead OR station destroyed)
  if (isPlayerDead(world)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  if (isStationDestroyed(world, state.stationEntity)) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Defeat;
    return true;
  }

  // Process wave logic (before reinforcements arrive)
  const enemyCount = countLivingEnemyShips(world);
  const allWavesSpawned = state.currentWave >= state.totalWaves - 1;

  // Check if current wave is cleared
  if (enemyCount === 0 && !state.waveCleared) {
    state.waveCleared = true;
    stateChanged = true;
    const nextWaveIndex = state.currentWave + 1;

    if (nextWaveIndex < state.totalWaves) {
      // Set delay for next wave
      const nextWave = waves[nextWaveIndex];
      if (nextWave) {
        state.delayRemaining = calculateWaveDelay(nextWave.delay, world.prng);
      }
    }
  }

  // Handle wave delay and spawning (only before reinforcements arrive)
  if (
    !state.reinforcementsArrived &&
    state.waveCleared &&
    state.currentWave + 1 < state.totalWaves
  ) {
    if (state.delayRemaining > 0) {
      state.delayRemaining -= dt;
    } else {
      // Spawn next wave
      state.currentWave++;
      state.waveCleared = false;
      state.delayRemaining = 0;

      const nextWave = waves[state.currentWave];
      if (nextWave) {
        spawnWave(world, nextWave, state.currentWave);
        setEnemiesToStationHunter(
          world,
          stationDefenseData.playerThreatRatio ?? 0,
        );
        stateChanged = true;
      }
    }
  }

  // Check reinforcement trigger conditions
  // Reinforcements arrive when player is overwhelmed:
  // - All waves have spawned AND there are enemies present, OR
  // - Station health drops below threshold
  if (!state.reinforcementsArrived) {
    const healthRatio = getStationHealthRatio(
      world,
      state.stationEntity,
      state.initialStationHealth,
    );

    // Health-based trigger (emergency)
    const healthTrigger = healthRatio <= state.reinforcementHealthThreshold;

    // Final wave trigger: all waves spawned and enemies are present (player overwhelmed)
    const finalWaveTrigger = allWavesSpawned && !state.waveCleared;

    if (healthTrigger || finalWaveTrigger) {
      state.reinforcementsArrived = true;
      stateChanged = true;

      // Spawn reinforcements
      for (let i = 0; i < state.reinforcementCount; i++) {
        const entity = spawnReinforcement();
        if (entity !== null) {
          state.reinforcementsSpawned++;
        }
      }
    }
  }

  // Check victory condition: reinforcements arrived AND all enemies dead
  if (state.reinforcementsArrived && enemyCount === 0) {
    state.completed = true;
    world.systemState.mission.result = MissionResult.Victory;
    stateChanged = true;
  }

  return stateChanged;
}

/** Get reward multiplier based on station health remaining */
export function getStationDefenseRewardMultiplier(
  world: World,
  state: StationDefenseMissionState,
): number {
  if (state.stationEntity === null) return 0;
  return getStationHealthRatio(
    world,
    state.stationEntity,
    state.initialStationHealth,
  );
}
