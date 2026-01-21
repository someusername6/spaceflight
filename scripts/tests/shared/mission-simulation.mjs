/**
 * Mission Simulation Shared Utilities
 *
 * Common utilities for mission balance testing and reward calculation.
 * Used by test-sector-balance.mjs and calculate-rewards.mjs.
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { randomRange } from '../../../src/core/prng.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from './combat-utils.mjs';
import { getArchetypeValue, getPlayerShipValue } from './mission-value.mjs';
import {
  getAssaultLoadout,
  getAssaultLoadoutDescription,
  getLoadout,
  getLoadoutDescription,
  SECTOR_ASSAULT_LOADOUTS,
  SECTOR_LOADOUTS,
} from './sector-loadouts.mjs';

// Re-export loadouts for backwards compatibility
export { SECTOR_LOADOUTS, SECTOR_ASSAULT_LOADOUTS };

// ============================================================================
// Wave Delay
// ============================================================================

/**
 * Calculate wave spawn delay (matching mission-waves.ts).
 * @param delay - Fixed delay number, or [min, max] range
 * @param prng - PRNG instance for random range
 */
export function calculateWaveDelay(delay, prng) {
  if (delay === undefined) return 0;
  if (typeof delay === 'number') return delay;
  return randomRange(prng, delay[0], delay[1]);
}

// ============================================================================
// Enemy Spawning
// ============================================================================

const MIN_SPAWN_DISTANCE = 2000;

/**
 * Get positions of all allied ships.
 */
export function getAlliedPositions(world) {
  const positions = [];
  for (const entity of queryEntities(world, ['faction', 'transform'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;
    const transform = getComponent(world, entity, 'transform');
    if (transform) positions.push(transform.position.clone());
  }
  return positions;
}

/**
 * Spawn a wave of enemies facing the player squadron.
 */
export function spawnWave(world, wave) {
  const allies = getAlliedPositions(world);
  const centroid = new Vector3();
  for (const pos of allies) centroid.add(pos);
  if (allies.length > 0) centroid.divideScalar(allies.length);

  const spawnCenter = centroid
    .clone()
    .add(new Vector3(0, 0, -MIN_SPAWN_DISTANCE));
  const toAllies = centroid.clone().sub(spawnCenter).normalize();
  const forward = new Vector3(0, 0, -1);
  const facing = new Quaternion().setFromUnitVectors(forward, toAllies);

  const totalEnemies = wave.enemies.reduce((sum, e) => sum + e.count, 0);
  let shipIndex = 0;
  const right = new Vector3(1, 0, 0).applyQuaternion(facing);
  const up = new Vector3(0, 1, 0).applyQuaternion(facing);

  wave.enemies.forEach((enemySpec) => {
    for (let i = 0; i < enemySpec.count; i++) {
      const lateralOffset = (shipIndex - (totalEnemies - 1) / 2) * 20;
      const verticalOffset = (shipIndex % 2 === 0 ? 1 : -1) * 5;
      const position = spawnCenter
        .clone()
        .addScaledVector(right, lateralOffset)
        .addScaledVector(up, verticalOffset);

      createAIShip(
        world,
        enemySpec.archetype,
        Faction.Enemy,
        position,
        facing,
        enemySpec.skill,
      );
      shipIndex++;
    }
  });
}

// Re-export loadout utility functions for backwards compatibility
export {
  getAssaultLoadout,
  getAssaultLoadoutDescription,
  getLoadout,
  getLoadoutDescription,
};

// ============================================================================
// Loadout Value Calculations
// ============================================================================

/**
 * Calculate average ship value for a sector loadout.
 * Includes hull + weapons + missiles + pilot.
 */
export function getLoadoutAverageShipValue(sector) {
  const loadout = getLoadout(sector);
  let totalValue = 0;

  for (const ship of loadout) {
    const value = getPlayerShipValue(ship.archetype, ship.skill);
    totalValue += value.total;
  }

  return totalValue / loadout.length;
}

/**
 * Calculate total consumable value for a loadout (missiles + ammo).
 */
export function getLoadoutConsumableValue(sector) {
  const loadout = getLoadout(sector);
  let totalValue = 0;

  for (const ship of loadout) {
    const archValue = getArchetypeValue(ship.archetype, false);
    totalValue += archValue.missiles + archValue.ammo;
  }

  return totalValue;
}

// ============================================================================
// Mission Simulation
// ============================================================================

const DEFAULT_MAX_SIMULATION_TIME = 300;

/**
 * Run a single mission simulation.
 * @param {Object} mission - Mission definition with waves
 * @param {number} seed - Random seed for determinism
 * @param {number} sector - Sector number for loadout selection
 * @param {Object} options - Optional overrides
 * @param {number} options.maxSimulationTime - Max time in seconds (default 300)
 * @returns {Object} metrics - { winner, timeToComplete, playerTeamRemaining, timeout }
 */
export function runMission(mission, seed, sector, options = {}) {
  const maxSimulationTime =
    options.maxSimulationTime ?? DEFAULT_MAX_SIMULATION_TIME;
  const maxTicks = maxSimulationTime * TICK_RATE;

  const world = createWorld(seed);
  initCombatStats(world);

  // Spawn sector-specific loadout
  const loadout = getLoadout(sector);
  loadout.forEach((ship, i) => {
    const x = (i - (loadout.length - 1) / 2) * 50;
    createAIShip(
      world,
      ship.archetype,
      Faction.Player,
      new Vector3(x, 0, 0),
      new Quaternion(),
      ship.skill,
    );
  });

  const waveState = {
    currentWave: 0,
    totalWaves: mission.waves.length,
    waveCleared: false,
    delayRemaining: 0,
  };
  if (mission.waves.length > 0) spawnWave(world, mission.waves[0], 0);

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    timeout: false,
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;
    for (const system of SYSTEMS) system(world, TICK_SEC);

    let playerTeamCount = 0,
      enemyCount = 0;
    // Only count ships (not decoys, missiles, etc. which also have faction+health)
    for (const entity of queryEntities(world, [
      'faction',
      'health',
      'shipIdentity',
    ])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Player) playerTeamCount++;
      else if (faction.faction === Faction.Enemy) enemyCount++;
    }
    metrics.playerTeamRemaining = playerTeamCount;

    // Wave management
    if (enemyCount === 0 && !waveState.waveCleared) {
      waveState.waveCleared = true;
      const nextWaveIndex = waveState.currentWave + 1;
      if (nextWaveIndex < waveState.totalWaves) {
        waveState.delayRemaining = calculateWaveDelay(
          mission.waves[nextWaveIndex].delay,
          world.prng,
        );
      }
    }

    if (
      waveState.waveCleared &&
      waveState.currentWave + 1 < waveState.totalWaves
    ) {
      if (waveState.delayRemaining > 0) waveState.delayRemaining -= TICK_SEC;
      else {
        waveState.currentWave++;
        waveState.waveCleared = false;
        spawnWave(
          world,
          mission.waves[waveState.currentWave],
          waveState.currentWave,
        );
      }
    }

    if (playerTeamCount === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }

    const allWavesSpawned = waveState.currentWave >= waveState.totalWaves - 1;
    if (enemyCount === 0 && allWavesSpawned && waveState.waveCleared) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = maxSimulationTime;
    metrics.winner = metrics.playerTeamRemaining > 0 ? 'player' : 'enemy';
  }

  return metrics;
}

/**
 * Run multiple trials of a mission and aggregate results.
 * @param {Object} mission - Mission definition with waves and id
 * @param {number} sector - Sector number for loadout selection
 * @param {number} runs - Number of trials to run
 * @param {Object} options - Optional overrides passed to runMission
 * @returns {Object} aggregated results
 */
export function runMissionTrials(mission, sector, runs, options = {}) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runMission(mission, seed, sector, options));
  }

  const wins = results.filter((r) => r.winner === 'player');
  return {
    runs,
    wins: wins.length,
    losses: results.length - wins.length,
    winRate: (wins.length / results.length) * 100,
    avgTime:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.timeToComplete, 0) / wins.length
        : 0,
    avgSurvivors:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.playerTeamRemaining, 0) / wins.length
        : 0,
    timeouts: results.filter((r) => r.timeout).length,
    results, // raw results for further analysis
  };
}
