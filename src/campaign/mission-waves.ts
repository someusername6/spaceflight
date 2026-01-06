/**
 * Mission wave management - types and helpers for wave-based missions.
 */

import { Quaternion, Vector3 } from 'three';
import type { FactionComponent } from '../components/faction';
import { getEnemyCallsignPrefix } from '../components/ship-identity';
import type { Transform } from '../components/transform';
import { getComponent, isShip, queryEntities } from '../core/ecs';
import { randomUnitVector } from '../core/prng';
import { Faction, type World } from '../core/types';
import type { ProfileName } from '../data/ai-profiles';
import { createEnemyShip } from '../factories/ship';
import type { ContractWave } from './types';

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

/** Minimum spawn distance from allied ships */
const MIN_SPAWN_DISTANCE = 2000;

/** Get positions of all allied (player faction) ships */
function getAlliedPositions(world: World): Vector3[] {
  const positions: Vector3[] = [];
  for (const entity of queryEntities(world, ['faction', 'transform'])) {
    if (!isShip(world, entity)) continue;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;
    const transform = getComponent<Transform>(world, entity, 'transform');
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
