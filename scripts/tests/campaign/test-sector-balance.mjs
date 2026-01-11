#!/usr/bin/env node
/**
 * Sector Mission Balance Test
 *
 * Tests missions for a single sector. Pass sector number as argument.
 * Usage: npx tsx scripts/tests/campaign/test-sector-balance.mjs 1
 *
 * Balance targets by difficulty:
 * - Easy: 60-80% win rate
 * - Medium: 40-60% win rate
 * - Hard: 20-40% win rate
 * - All: 90-180s average victory time
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { getMissionsForSector } from '../../../src/ui/screens/contracts-data.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';
import {
  calculateWaveDelay,
  getLoadout,
  getLoadoutDescription,
  spawnWave,
} from './mission-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

const SECTOR = parseInt(process.argv[2]) || 1;
const MAX_SIMULATION_TIME = 300;
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;
const RUNS_PER_MISSION = 30;

// Balance targets by DIFFICULTY per ECONOMY.md:
// - Easy: 60-80% win rate
// - Medium: 40-60% win rate
// - Hard: 20-40% win rate
// - All with 90s+ average victory time
const BALANCE_TARGETS = {
  easy: { min: 60, max: 80 },
  medium: { min: 40, max: 60 },
  hard: { min: 20, max: 40 },
};
const MIN_AVG_TIME = 90; // seconds
const MAX_AVG_TIME = 180; // seconds

// ============================================================================
// Mission Simulation
// ============================================================================

function runMission(mission, seed) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Spawn sector-specific loadout
  const loadout = getLoadout(SECTOR);
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

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;
    for (const system of SYSTEMS) system(world, TICK_SEC);

    let playerTeamCount = 0,
      enemyCount = 0;
    for (const entity of queryEntities(world, ['faction', 'health'])) {
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
    metrics.timeToComplete = MAX_SIMULATION_TIME;
    metrics.winner = metrics.playerTeamRemaining > 0 ? 'player' : 'enemy';
  }

  return metrics;
}

function runMissionTests(mission) {
  const results = [];
  for (let i = 0; i < RUNS_PER_MISSION; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runMission(mission, seed));
  }

  const wins = results.filter((r) => r.winner === 'player');
  return {
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
  };
}

// ============================================================================
// Main
// ============================================================================

const missions = getMissionsForSector(SECTOR);
if (missions.length === 0) {
  console.log(`No missions found for sector ${SECTOR}`);
  process.exit(1);
}

const loadoutDesc = getLoadoutDescription(SECTOR);

console.log('='.repeat(90));
console.log(
  `SECTOR ${SECTOR} BALANCE TEST (${missions.length} missions, ${RUNS_PER_MISSION} runs each)`,
);
console.log(`Loadout: ${loadoutDesc}`);
console.log(
  `Targets: Easy 60-80%, Medium 40-60%, Hard 20-40%, all 90-180s avg time`,
);
console.log('='.repeat(90));
console.log(
  'Mission'.padEnd(22) +
    'Diff'.padEnd(8) +
    'WinRate'.padEnd(9) +
    'Target'.padEnd(11) +
    'Status'.padEnd(12) +
    'Time'.padEnd(8) +
    'Surv'.padEnd(6) +
    'T/O',
);
console.log('─'.repeat(90));

const results = [];
for (const mission of missions) {
  process.stdout.write(
    `Testing ${mission.name.substring(0, 18)}...`.padEnd(30) + '\r',
  );
  const result = runMissionTests(mission);
  const target = BALANCE_TARGETS[mission.difficulty];

  let status = 'OK';
  if (result.winRate < target.min) status = 'TOO HARD';
  else if (result.winRate > target.max) status = 'TOO EASY';
  else if (result.avgTime < MIN_AVG_TIME && result.winRate > 0)
    status = 'TOO SHORT';
  else if (result.avgTime > MAX_AVG_TIME && result.winRate > 0)
    status = 'TOO LONG';

  results.push({ ...result, mission, target, status });

  console.log(
    mission.name.substring(0, 21).padEnd(22) +
      mission.difficulty.padEnd(8) +
      `${result.winRate.toFixed(0)}%`.padEnd(9) +
      `${target.min}-${target.max}%`.padEnd(11) +
      status.padEnd(12) +
      `${result.avgTime.toFixed(0)}s`.padEnd(8) +
      `${result.avgSurvivors.toFixed(1)}`.padEnd(6) +
      result.timeouts,
  );
}

// Summary
console.log('─'.repeat(90));
const ok = results.filter((r) => r.status === 'OK').length;
const hard = results.filter((r) => r.status === 'TOO HARD').length;
const easy = results.filter((r) => r.status === 'TOO EASY').length;
const short = results.filter((r) => r.status === 'TOO SHORT').length;
const long = results.filter((r) => r.status === 'TOO LONG').length;
console.log(
  `Results: ${ok} OK, ${hard} TOO HARD, ${easy} TOO EASY, ${short} TOO SHORT, ${long} TOO LONG`,
);

if (hard + easy + short + long > 0) process.exit(1);
