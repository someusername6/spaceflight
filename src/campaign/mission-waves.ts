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

/** Spawn a wave of enemies */
export function spawnWave(
  world: World,
  wave: ContractWave,
  waveIndex: number,
): void {
  // Get callsign prefix for this wave (Aries, Taurus, Gemini, etc.)
  const callsignPrefix = getEnemyCallsignPrefix(waveIndex);

  wave.enemies.forEach((enemySpec, groupIndex) => {
    for (let i = 0; i < enemySpec.count; i++) {
      const angle = (Math.PI * 2 * i) / enemySpec.count + groupIndex * 0.5;
      // 1500m base distance = ~5-8 seconds approach (depends on ship speed)
      const distance = 1500 + waveIndex * 100 + groupIndex * 150;
      const x = Math.cos(angle) * distance * 0.5;
      const z = -distance;
      const y = (groupIndex - 1) * 50 + i * 20;

      createEnemyShip(
        world,
        enemySpec.archetype,
        new Vector3(x, y, z),
        undefined,
        enemySpec.skill as ProfileName,
        callsignPrefix,
      );
    }
  });
}
