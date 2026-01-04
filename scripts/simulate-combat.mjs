#!/usr/bin/env node
/**
 * Headless Combat Simulation Runner
 *
 * Runs AI vs AI combat to gather balance data. No rendering - pure game logic.
 *
 * Usage: npx tsx scripts/simulate-combat.mjs [scenario] [runs] [--debug]
 *   - No args or 'all': Run all scenarios
 *   - 'list': Show available scenarios
 *   - scenario name + runs: Run specific scenario
 *
 * See combat-scenarios.mjs for scenario definitions.
 */

import { Quaternion, Vector3 } from 'three';
import {
  countEntities,
  createWorld,
  getComponent,
  queryEntities,
} from '../src/core/ecs.ts';
import { Faction } from '../src/core/types.ts';
import { createAIShip } from '../src/factories/ship.ts';
import { aiSystem } from '../src/systems/ai/ai.ts';
import { aimErrorSystem } from '../src/systems/aim-error.ts';
import { beamSystem } from '../src/systems/beams.ts';
import { cleanupSystem } from '../src/systems/cleanup.ts';
import { collisionSystem } from '../src/systems/collision.ts';
import { damageSystem } from '../src/systems/damage.ts';
import { decoySystem } from '../src/systems/decoys.ts';
import { explosionSystem } from '../src/systems/explosions.ts';
import { heatSystem } from '../src/systems/heat.ts';
import { missileSystem } from '../src/systems/missiles.ts';
import { physicsSystem } from '../src/systems/physics.ts';
import { projectileSystem } from '../src/systems/projectiles.ts';
import { shieldSystem } from '../src/systems/shields.ts';
import { targetingSystem } from '../src/systems/targeting.ts';
import { weaponSystem } from '../src/systems/weapons.ts';
import {
  aggregateCombatStats,
  printDecoyStats,
  printFirstStrikeStats,
  printMissileStats,
  printSpawnOrderAnalysis,
  printSummaryTable,
  printWeaponStats,
} from './combat-reporting.mjs';
import { SCENARIOS } from './combat-scenarios.mjs';

// Constants
const TICK_RATE = 60;
const TICK_SEC = 1 / TICK_RATE;
const MAX_SIMULATION_TIME = 120; // 2 minutes max per fight
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;

// Debug flag
const DEBUG = process.argv.includes('--debug');

// Systems to run (no input system - all AI)
const SYSTEMS = [
  targetingSystem,
  aiSystem,
  aimErrorSystem,
  weaponSystem,
  beamSystem,
  physicsSystem,
  projectileSystem,
  missileSystem,
  decoySystem,
  collisionSystem,
  damageSystem,
  shieldSystem,
  heatSystem,
  cleanupSystem,
  explosionSystem,
];

/**
 * Run a single simulation
 */
function runSimulation(scenario, seed) {
  const world = createWorld(seed);

  // Initialize combat stats tracking
  world.systemState.combatStats = {
    shotsFired: {},
    damageDealt: {},
    missilesFired: {},
    missilesHit: {},
    missileDamage: {},
    missilesExpired: 0,
    missilesHitOwner: 0,
    missilesSeduced: 0,
    missilesInFlight: 0,
    beamDamage: {},
    decoysLaunched: 0,
    decoysSuccessful: 0,
  };

  // Spawn teams facing each other with slight positional jitter
  // This breaks pure determinism so identical ships have varied outcomes
  const facingPosZ = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  const jitter = () => (Math.random() - 0.5) * 20; // ±10m random offset
  const startDistance = scenario.startDistance ?? 500;

  // Alternate spawn order each run to eliminate entity ID bias
  const spawnAFirst = Math.random() > 0.5;

  const spawnTeamA = () => {
    const teamASpacing = 50;
    scenario.teamA.forEach((ship, i) => {
      const x = (i - (scenario.teamA.length - 1) / 2) * teamASpacing;
      createAIShip(
        world,
        ship.archetype,
        Faction.Player,
        new Vector3(x + jitter(), jitter(), jitter()),
        facingPosZ,
        ship.profile,
      );
    });
  };

  const spawnTeamB = () => {
    const teamBSpacing = 50;
    const facingNegZ = new Quaternion(); // Identity = facing -Z
    scenario.teamB.forEach((ship, i) => {
      const x = (i - (scenario.teamB.length - 1) / 2) * teamBSpacing;
      createAIShip(
        world,
        ship.archetype,
        Faction.Enemy,
        new Vector3(x + jitter(), jitter(), startDistance + jitter()),
        facingNegZ,
        ship.profile,
      );
    });
  };

  if (spawnAFirst) {
    spawnTeamA();
    spawnTeamB();
  } else {
    spawnTeamB();
    spawnTeamA();
  }

  // Track initial health for damage tracking
  const initialHealth = new Map();
  const entityTeams = new Map();

  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    const shields = getComponent(world, entity, 'shields');
    initialHealth.set(entity, {
      hull: health.current,
      shields: shields ? shields.current : 0,
    });
    entityTeams.set(entity, faction.faction === Faction.Player ? 'A' : 'B');
  }

  // Metrics tracking
  const metrics = {
    ticks: 0,
    winner: null,
    timeToVictory: 0,
    teamARemaining: scenario.teamA.length,
    teamBRemaining: scenario.teamB.length,
    timeout: false,
    firstDamageTime: null,
    firstDamageTeam: null,
    firstKillTime: null,
    firstKillTeam: null,
    teamADamageDealt: 0,
    teamBDamageDealt: 0,
    spawnAFirst, // Track spawn order for bias analysis
  };

  // Run simulation
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    // Update game time
    world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    metrics.ticks = tick + 1;
    const currentTime = (tick + 1) / TICK_RATE;

    // Track damage dealt this tick and count remaining
    let teamACount = 0;
    let teamBCount = 0;
    const currentEntities = new Set();

    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');

      currentEntities.add(entity);

      if (faction.faction === Faction.Player) {
        teamACount++;
      } else if (faction.faction === Faction.Enemy) {
        teamBCount++;
      }

      // Note: First damage tracking is unreliable because cleanupSystem
      // removes dead entities before we can check their final health state.
      // First kill tracking works and is more meaningful.
    }

    // Check for kills (entities that disappeared)
    for (const [entity, team] of entityTeams) {
      if (!currentEntities.has(entity) && metrics.firstKillTime === null) {
        metrics.firstKillTime = currentTime;
        // Entity from team X died, so the OTHER team got the kill
        metrics.firstKillTeam = team === 'A' ? 'B' : 'A';
        if (DEBUG) {
          console.log(
            `  First kill at ${currentTime.toFixed(1)}s by team ${metrics.firstKillTeam}`,
          );
        }
      }
    }

    metrics.teamARemaining = teamACount;
    metrics.teamBRemaining = teamBCount;

    // Check for victory (check mutual destruction first to avoid bias)
    if (teamACount === 0 && teamBCount === 0) {
      // Both teams eliminated on same tick - true draw
      metrics.winner = 'draw';
      metrics.timeToVictory = (tick + 1) / TICK_RATE;
      break;
    }
    if (teamACount === 0) {
      metrics.winner = 'B';
      metrics.timeToVictory = (tick + 1) / TICK_RATE;
      break;
    }
    if (teamBCount === 0) {
      metrics.winner = 'A';
      metrics.timeToVictory = (tick + 1) / TICK_RATE;
      break;
    }
  }

  // Timeout - no winner
  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToVictory = MAX_SIMULATION_TIME;
    // Declare winner by remaining ships, then by EHP
    if (metrics.teamARemaining > metrics.teamBRemaining) {
      metrics.winner = 'A';
    } else if (metrics.teamBRemaining > metrics.teamARemaining) {
      metrics.winner = 'B';
    } else {
      metrics.winner = 'draw';
    }
  }

  // Count missiles still in flight at end of battle
  const missilesInFlight = countEntities(world, ['missile']);
  if (world.systemState.combatStats) {
    world.systemState.combatStats.missilesInFlight = missilesInFlight;
  }

  // Include combat stats in metrics
  metrics.combatStats = world.systemState.combatStats;

  return metrics;
}

/**
 * Run multiple simulations and aggregate results
 */
function runScenario(scenarioKey, runs = 50) {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioKey}`);
    console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`Running ${runs} simulations...`);
  console.log('='.repeat(60));

  const results = [];
  for (let i = 0; i < runs; i++) {
    // Use more varied seeds: base + (run * large prime) + random offset
    const seed = 12345 + i * 7919 + Math.floor(i / 10) * 104729;
    results.push(runSimulation(scenario, seed));
  }

  // Aggregate results
  const teamAWins = results.filter((r) => r.winner === 'A').length;
  const teamBWins = results.filter((r) => r.winner === 'B').length;
  const draws = results.filter((r) => r.winner === 'draw').length;
  const timeouts = results.filter((r) => r.timeout).length;

  const times = results.map((r) => r.timeToVictory);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const stdDev = Math.sqrt(
    times.reduce((sum, t) => sum + (t - avgTime) ** 2, 0) / times.length,
  );

  console.log(`\nResults:`);
  console.log(
    `  Team A wins: ${teamAWins}/${runs} (${((teamAWins / runs) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  Team B wins: ${teamBWins}/${runs} (${((teamBWins / runs) * 100).toFixed(1)}%)`,
  );
  if (draws > 0) console.log(`  Draws: ${draws}/${runs}`);
  if (timeouts > 0) console.log(`  Timeouts: ${timeouts}/${runs}`);

  printFirstStrikeStats(results, runs);
  printSpawnOrderAnalysis(results);

  console.log(`\nTime to Victory:`);
  console.log(`  Average: ${avgTime.toFixed(1)}s (σ=${stdDev.toFixed(1)}s)`);
  console.log(`  Range: ${minTime.toFixed(1)}s - ${maxTime.toFixed(1)}s`);

  // Aggregate and display combat stats
  const aggregatedStats = aggregateCombatStats(results);
  printWeaponStats(aggregatedStats, runs, avgTime);
  printMissileStats(aggregatedStats, runs, avgTime);
  printDecoyStats(aggregatedStats, runs);

  return {
    scenario: scenarioKey,
    name: scenario.name,
    runs,
    teamAWins,
    teamBWins,
    draws,
    timeouts,
    avgTime,
    stdDev,
    minTime,
    maxTime,
  };
}

/**
 * Run all scenarios
 */
function runAllScenarios(runs = 50) {
  console.log('='.repeat(60));
  console.log('COMBAT BALANCE SIMULATION');
  console.log(
    `Running all ${Object.keys(SCENARIOS).length} scenarios with ${runs} runs each`,
  );
  console.log('='.repeat(60));

  const allResults = [];

  for (const scenarioKey of Object.keys(SCENARIOS)) {
    allResults.push(runScenario(scenarioKey, runs));
  }

  printSummaryTable(allResults);
  return allResults;
}

// Main
const args = process.argv.slice(2);
const scenarioArg = args[0];
const runsArg = parseInt(args[1], 10) || 50;

if (scenarioArg === 'all' || !scenarioArg) {
  runAllScenarios(runsArg);
} else if (scenarioArg === 'list') {
  console.log('Available scenarios:');
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    console.log(`  ${key}: ${scenario.name}`);
  }
} else {
  runScenario(scenarioArg, runsArg);
}
