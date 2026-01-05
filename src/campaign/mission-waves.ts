/**
 * Mission wave management - types and helpers for wave-based missions.
 */

import { Vector3 } from 'three';
import { getEnemyCallsignPrefix } from '../components/ship-identity';
import type { World } from '../core/types';
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

/** Spawn a wave of enemies in tight formation */
export function spawnWave(
  world: World,
  wave: ContractWave,
  waveIndex: number,
): void {
  // Get callsign prefix for this wave (Aries, Taurus, Gemini, etc.)
  const callsignPrefix = getEnemyCallsignPrefix(waveIndex);

  // All enemies spawn together at 2000m+ from allies (player at origin)
  // Tight formation: 20m horizontal spacing, ±5m vertical variation
  const totalEnemies = getTotalEnemies(wave);
  let shipIndex = 0;
  wave.enemies.forEach((enemySpec) => {
    for (let i = 0; i < enemySpec.count; i++) {
      // Tight horizontal spread (20m between ships, centered on x=0)
      const x = (shipIndex - (totalEnemies - 1) / 2) * 20;
      // Small vertical variation (alternating up/down)
      const y = (shipIndex % 2 === 0 ? 1 : -1) * 5;
      // All at same distance from origin (2000m minimum)
      const z = -(MIN_SPAWN_DISTANCE + waveIndex * 100);

      createEnemyShip(
        world,
        enemySpec.archetype,
        new Vector3(x, y, z),
        undefined,
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
