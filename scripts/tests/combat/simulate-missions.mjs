#!/usr/bin/env node
/**
 * Wave-Based Mission Simulation
 *
 * Simulates missions with proper wave spawning - enemies spawn in waves
 * with delays between them, matching actual game behavior.
 *
 * Usage: npx tsx scripts/tests/combat/simulate-missions.mjs [mission-id] [runs]
 *   - No args or 'all': Run all missions
 *   - 'list': Show available missions
 *   - mission-id + runs: Run specific mission
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import {
  createPRNG,
  randomRange,
  randomUnitVector,
} from '../../../src/core/prng.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  getAllMissions,
  getMissionsForSector,
} from '../../../src/ui/screens/contracts-data.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';

const MAX_SIMULATION_TIME = 300; // 5 minutes max per mission
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;
const SPAWN_DISTANCE = 2000;

/**
 * Count enemies remaining in the world
 */
function countEnemies(world) {
  let count = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction === Faction.Enemy) {
      count++;
    }
  }
  return count;
}

/**
 * Count player ships remaining
 */
function countPlayerShips(world) {
  let count = 0;
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction === Faction.Player) {
      count++;
    }
  }
  return count;
}

/**
 * Spawn a wave of enemies at distance from player ships
 */
function spawnEnemyWave(world, wave, prng) {
  // Random spawn direction
  const dir = randomUnitVector(prng);
  const spawnDirection = new Vector3(dir.x, dir.y, dir.z);

  // Calculate perpendicular axes for formation spread
  const forward = spawnDirection.clone().negate();
  const right = new Vector3();
  const up = new Vector3();

  const worldUp = new Vector3(0, 1, 0);
  if (Math.abs(forward.dot(worldUp)) > 0.99) {
    right.crossVectors(forward, new Vector3(1, 0, 0)).normalize();
  } else {
    right.crossVectors(forward, worldUp).normalize();
  }
  up.crossVectors(right, forward).normalize();

  // Facing toward origin (where players are)
  const facing = new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, -1),
    forward,
  );

  // Count total enemies in this wave
  let totalEnemies = 0;
  for (const spec of wave.enemies) {
    totalEnemies += spec.count;
  }

  // Spawn enemies in formation
  let shipIndex = 0;
  for (const spec of wave.enemies) {
    for (let i = 0; i < spec.count; i++) {
      const lateralOffset = (shipIndex - (totalEnemies - 1) / 2) * 20;
      const verticalOffset = (shipIndex % 2 === 0 ? 1 : -1) * 5;

      const position = spawnDirection
        .clone()
        .multiplyScalar(SPAWN_DISTANCE)
        .addScaledVector(right, lateralOffset)
        .addScaledVector(up, verticalOffset);

      createAIShip(
        world,
        spec.archetype,
        Faction.Enemy,
        position,
        facing,
        spec.skill,
      );
      shipIndex++;
    }
  }
}

/**
 * Calculate wave delay from contract definition
 */
function getWaveDelay(delay, prng) {
  if (!delay) return 0;
  if (typeof delay === 'number') return delay;
  return randomRange(prng, delay[0], delay[1]);
}

/**
 * Run a single mission simulation
 */
function runMission(contract, seed) {
  const world = createWorld(seed);
  initCombatStats(world);

  const prng = createPRNG(seed);

  // Spawn 4 player fighters at origin
  const playerRotation = new Quaternion();
  for (let i = 0; i < 4; i++) {
    const lateralOffset = (i - 1.5) * 20;
    const verticalOffset = (i % 2 === 0 ? 1 : -1) * 5;
    const position = new Vector3(lateralOffset, verticalOffset, 0);
    createAIShip(
      world,
      'fighter',
      Faction.Player,
      position,
      playerRotation,
      'regular',
    );
  }

  const initialPlayerCount = 4;

  // Wave state
  let currentWaveIndex = 0;
  let waveDelay = getWaveDelay(contract.waves[0]?.delay, prng);
  let waveSpawned = false;

  // Metrics
  const metrics = {
    ticks: 0,
    victory: false,
    defeat: false,
    timeout: false,
    timeToEnd: 0,
    playersRemaining: initialPlayerCount,
    wavesCompleted: 0,
  };

  // Run simulation
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const currentTime = tick / TICK_RATE;

    // Wave spawning logic
    if (currentWaveIndex < contract.waves.length) {
      if (!waveSpawned) {
        // Check if delay has passed
        if (currentTime >= waveDelay) {
          spawnEnemyWave(world, contract.waves[currentWaveIndex], prng);
          waveSpawned = true;
        }
      } else {
        // Wave was spawned, check if cleared
        if (countEnemies(world) === 0) {
          metrics.wavesCompleted++;
          currentWaveIndex++;
          waveSpawned = false;
          // Set delay for next wave
          if (currentWaveIndex < contract.waves.length) {
            waveDelay =
              currentTime +
              getWaveDelay(contract.waves[currentWaveIndex]?.delay, prng);
          }
        }
      }
    }

    // Update game time and run systems
    world.systemState.gameTime += TICK_SEC;
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    metrics.ticks = tick + 1;
    metrics.playersRemaining = countPlayerShips(world);

    // Check for defeat (all players dead)
    if (metrics.playersRemaining === 0) {
      metrics.defeat = true;
      metrics.timeToEnd = (tick + 1) / TICK_RATE;
      break;
    }

    // Check for victory (all waves completed and no enemies remain)
    if (
      currentWaveIndex >= contract.waves.length &&
      countEnemies(world) === 0
    ) {
      metrics.victory = true;
      metrics.timeToEnd = (tick + 1) / TICK_RATE;
      break;
    }
  }

  // Timeout
  if (!metrics.victory && !metrics.defeat) {
    metrics.timeout = true;
    metrics.timeToEnd = MAX_SIMULATION_TIME;
    // Consider timeout with players alive as victory
    if (metrics.playersRemaining > 0) {
      metrics.victory = true;
    }
  }

  return metrics;
}

/**
 * Run multiple simulations for a mission
 */
function runMissionBatch(contract, runs = 30) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Mission: ${contract.name} (${contract.difficulty})`);
  console.log(`Description: ${contract.description}`);
  console.log(`Waves: ${contract.waves.length}`);
  console.log(`Running ${runs} simulations...`);
  console.log('='.repeat(60));

  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919;
    results.push(runMission(contract, seed));
  }

  // Aggregate results
  const victories = results.filter((r) => r.victory).length;
  const defeats = results.filter((r) => r.defeat).length;
  const timeouts = results.filter((r) => r.timeout).length;

  const survivalRate = (victories / runs) * 100;

  const times = results.map((r) => r.timeToEnd);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  const avgPlayersRemaining =
    results.reduce((a, r) => a + r.playersRemaining, 0) / runs;

  console.log(`\nResults:`);
  console.log(
    `  Victories: ${victories}/${runs} (${survivalRate.toFixed(1)}%)`,
  );
  console.log(`  Defeats: ${defeats}/${runs}`);
  if (timeouts > 0) console.log(`  Timeouts: ${timeouts}/${runs}`);

  console.log(`\nTime to Victory/Defeat:`);
  console.log(`  Average: ${avgTime.toFixed(1)}s`);
  console.log(`  Range: ${minTime.toFixed(1)}s - ${maxTime.toFixed(1)}s`);

  console.log(`\nAvg Players Remaining: ${avgPlayersRemaining.toFixed(1)}/4`);

  // Check against targets
  const targetSurvival = {
    easy: [70, 90],
    medium: [40, 70],
    hard: [20, 40],
  };
  const target = targetSurvival[contract.difficulty] || [0, 100];
  const survivalOk = survivalRate >= target[0] && survivalRate <= target[1];
  const timeOk = avgTime >= 90;

  console.log(`\nBalance Check:`);
  console.log(
    `  Survival: ${survivalRate.toFixed(1)}% (target: ${target[0]}-${target[1]}%) ${survivalOk ? '✓' : '✗'}`,
  );
  console.log(
    `  Time: ${avgTime.toFixed(1)}s (target: 90s+) ${timeOk ? '✓' : '✗'}`,
  );

  return {
    id: contract.id,
    name: contract.name,
    sector: contract.sector,
    tier: contract.tier,
    difficulty: contract.difficulty,
    survivalRate,
    avgTime,
    minTime,
    maxTime,
    survivalOk,
    timeOk,
  };
}

/**
 * Run all missions or missions for a specific sector
 */
function runAllMissions(runs = 30, sector = null) {
  const contracts = sector ? getMissionsForSector(sector) : getAllMissions();

  console.log('='.repeat(75));
  console.log('MISSION BALANCE SIMULATION (Wave-Based)');
  console.log(
    sector
      ? `Running ${contracts.length} missions from Sector ${sector} with ${runs} runs each`
      : `Running ALL ${contracts.length} missions with ${runs} runs each`,
  );
  console.log('='.repeat(75));

  const results = [];
  for (const contract of contracts) {
    results.push(runMissionBatch(contract, runs));
  }

  // Summary table
  console.log(`\n${'='.repeat(75)}`);
  console.log('SUMMARY');
  console.log('='.repeat(75));
  console.log(
    'Mission              | Sec | Tier | Diff   | Survival | Time   | Status',
  );
  console.log('-'.repeat(75));

  for (const r of results) {
    const name = r.name.padEnd(20).slice(0, 20);
    const sec = `${r.sector}`.padStart(3);
    const tier = (r.tier || '').padEnd(4);
    const diff = r.difficulty.padEnd(6);
    const survival = `${r.survivalRate.toFixed(0)}%`.padStart(8);
    const time = `${r.avgTime.toFixed(0)}s`.padStart(6);
    const status = r.survivalOk && r.timeOk ? '✓ OK' : '✗ FAIL';
    console.log(
      `${name} | ${sec} | ${tier} | ${diff} | ${survival} | ${time} | ${status}`,
    );
  }

  return results;
}

// Main
const args = process.argv.slice(2);
const missionArg = args[0];
const runsArg = parseInt(args[1], 10) || 30;

const contracts = getAllMissions();

if (missionArg === 'list') {
  console.log('Available missions:');
  for (const c of contracts) {
    console.log(
      `  ${c.id}: ${c.name} [S${c.sector}/${c.tier}] (${c.difficulty})`,
    );
  }
} else if (missionArg && missionArg !== 'all') {
  const contract = contracts.find((c) => c.id === missionArg);
  if (!contract) {
    console.error(`Unknown mission: ${missionArg}`);
    console.log('Available:', contracts.map((c) => c.id).join(', '));
    process.exit(1);
  }
  runMissionBatch(contract, runsArg);
} else {
  runAllMissions(runsArg);
}
