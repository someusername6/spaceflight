/**
 * Mission wave management - types and helpers for wave-based missions.
 */

import { Quaternion, Vector3 } from 'three';
import { getEnemyCallsignPrefix } from '../../components/ship-identity';
import { getComponent, isShip, queryEntities } from '../../core/ecs';
import type { PRNGState } from '../../core/prng';
import { randomRange, randomUnitVector } from '../../core/prng';
import { Faction, type World } from '../../core/types';
import type { ProfileName } from '../../data/ai-profiles';
import { createEnemyShip } from '../../factories/ship';
import { countLivingEnemyShips } from '../../systems/mission';
import type { Contract, ContractWave } from '../types';

/** Wave state for tracking mission progress */
export interface WaveState {
  currentWave: number;
  totalWaves: number;
  waveCleared: boolean;
  delayRemaining: number;
}

/** Mission end state for delayed transition */
export interface MissionEndState {
  pending: boolean;
  delayRemaining: number;
  victory: boolean;
}

/** Delay before transitioning to results screen (seconds) */
export const MISSION_END_DELAY = 5;

/** Create initial wave state for a mission */
export function createWaveState(totalWaves: number): WaveState {
  return {
    currentWave: 0,
    totalWaves,
    waveCleared: false,
    delayRemaining: 0,
  };
}

/** Create initial mission end state */
export function createMissionEndState(): MissionEndState {
  return {
    pending: false,
    delayRemaining: 0,
    victory: false,
  };
}

/**
 * Calculate wave delay from a number or [min, max] range.
 * If a range is provided, returns a random value in that range using PRNG.
 */
export function calculateWaveDelay(
  delay: number | [number, number] | undefined,
  prng: PRNGState,
): number {
  if (delay === undefined) return 0;
  if (typeof delay === 'number') return delay;
  // Range: [min, max]
  return randomRange(prng, delay[0], delay[1]);
}

/** Minimum spawn distance from allied ships */
const MIN_SPAWN_DISTANCE = 2000;

/** Get positions of all allied (player faction) ships */
function getAlliedPositions(world: World): Vector3[] {
  const positions: Vector3[] = [];
  for (const entity of queryEntities(world, ['faction', 'transform'])) {
    if (!isShip(world, entity)) continue;
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;
    const transform = getComponent(world, entity, 'transform');
    if (transform) {
      positions.push(transform.position.clone());
    }
  }
  return positions;
}

/** Calculate spawn center: MIN_SPAWN_DISTANCE from furthest ally in random direction */
function calculateSpawnCenter(world: World, allies: Vector3[]): Vector3 {
  // Fallback to origin if no allies (shouldn't happen)
  if (allies.length === 0) {
    return new Vector3(0, 0, -MIN_SPAWN_DISTANCE);
  }

  // Pick random direction on unit sphere
  const dir = randomUnitVector(world.prng);
  const direction = new Vector3(dir.x, dir.y, dir.z);

  // Find ally furthest along this direction (max dot product)
  let maxProjection = -Infinity;
  let furthestAlly = allies[0] as Vector3;
  for (const pos of allies) {
    const projection = pos.dot(direction);
    if (projection > maxProjection) {
      maxProjection = projection;
      furthestAlly = pos;
    }
  }

  // Spawn MIN_SPAWN_DISTANCE beyond that ally in the chosen direction
  return furthestAlly.clone().addScaledVector(direction, MIN_SPAWN_DISTANCE);
}

/** Calculate rotation to face from spawn point toward allied centroid */
function calculateFacingRotation(
  spawnCenter: Vector3,
  allies: Vector3[],
): Quaternion {
  // Calculate centroid of allies
  const centroid = new Vector3();
  for (const pos of allies) {
    centroid.add(pos);
  }
  centroid.divideScalar(allies.length);

  // Direction from spawn to centroid
  const toAllies = centroid.clone().sub(spawnCenter).normalize();

  // Default forward is -Z, rotate to face allies
  const forward = new Vector3(0, 0, -1);
  return new Quaternion().setFromUnitVectors(forward, toAllies);
}

/** Spawn a wave of enemies in tight formation */
export function spawnWave(
  world: World,
  wave: ContractWave,
  waveIndex: number,
): void {
  // Get callsign prefix for this wave (Aries, Taurus, Gemini, etc.)
  const callsignPrefix = getEnemyCallsignPrefix(waveIndex);

  // Get allied positions and calculate spawn center
  const allies = getAlliedPositions(world);
  const spawnCenter = calculateSpawnCenter(world, allies);
  const facing =
    allies.length > 0
      ? calculateFacingRotation(spawnCenter, allies)
      : undefined;

  // Spawn enemies in tight formation around spawn center
  // 20m spacing perpendicular to facing direction, ±5m vertical variation
  const totalEnemies = getTotalEnemies(wave);
  let shipIndex = 0;

  // Get perpendicular axes for formation spread
  const right = new Vector3(1, 0, 0);
  const up = new Vector3(0, 1, 0);
  if (facing) {
    right.applyQuaternion(facing);
    up.applyQuaternion(facing);
  }

  wave.enemies.forEach((enemySpec) => {
    for (let i = 0; i < enemySpec.count; i++) {
      // Tight spread perpendicular to facing (20m between ships, centered)
      const lateralOffset = (shipIndex - (totalEnemies - 1) / 2) * 20;
      // Small vertical variation (alternating up/down)
      const verticalOffset = (shipIndex % 2 === 0 ? 1 : -1) * 5;

      const position = spawnCenter
        .clone()
        .addScaledVector(right, lateralOffset)
        .addScaledVector(up, verticalOffset);

      createEnemyShip(
        world,
        enemySpec.archetype,
        position,
        facing,
        enemySpec.skill as ProfileName,
        callsignPrefix,
      );
      shipIndex++;
    }
  });
}

/** Count total enemies in a wave */
function getTotalEnemies(wave: ContractWave): number {
  return wave.enemies.reduce((sum, spec) => sum + spec.count, 0);
}

/**
 * Initialize wave state and spawn or schedule first wave.
 * Shared between live gameplay and replay to ensure identical behavior.
 */
export function initializeFirstWave(
  world: World,
  waveState: WaveState,
  waves: ContractWave[],
): void {
  const firstWave = waves[0];
  if (!firstWave) return;

  const firstWaveDelay = calculateWaveDelay(firstWave.delay, world.prng);
  if (firstWaveDelay > 0) {
    // Set currentWave = -1 so tick callback increments to 0 when spawning
    waveState.currentWave = -1;
    waveState.waveCleared = true;
    waveState.delayRemaining = firstWaveDelay;
  } else {
    // Spawn first wave immediately
    spawnWave(world, firstWave, 0);
  }
}

/**
 * Result of processing a wave tick.
 * Used to communicate state changes to the caller.
 */
export interface WaveTickResult {
  /** True if a new wave was spawned this tick */
  waveSpawned: boolean;
  /** Index of spawned wave (if waveSpawned is true) */
  spawnedWaveIndex?: number;
}

/**
 * Process wave logic for a single tick.
 * Shared between live gameplay and replay to ensure identical behavior.
 *
 * @param world - The game world
 * @param waveState - Mutable wave state
 * @param mission - Mission contract with wave definitions
 * @param dt - Delta time in seconds
 * @returns Result indicating if a wave was spawned
 */
export function processWaveTick(
  world: World,
  waveState: WaveState,
  mission: Contract,
  dt: number,
): WaveTickResult {
  const result: WaveTickResult = { waveSpawned: false };
  const enemyCount = countLivingEnemyShips(world);

  // Check if current wave is cleared
  if (enemyCount === 0 && !waveState.waveCleared) {
    waveState.waveCleared = true;
    const nextWaveIndex = waveState.currentWave + 1;

    if (nextWaveIndex < waveState.totalWaves) {
      // Set delay for next wave
      const nextWave = mission.waves[nextWaveIndex];
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
      waveState.delayRemaining -= dt;
    } else {
      // Spawn next wave
      waveState.currentWave++;
      waveState.waveCleared = false;
      waveState.delayRemaining = 0;

      const nextWave = mission.waves[waveState.currentWave];
      if (nextWave) {
        spawnWave(world, nextWave, waveState.currentWave);
        result.waveSpawned = true;
        result.spawnedWaveIndex = waveState.currentWave;
      }
    }
  }

  return result;
}
