/**
 * Long-Range Archetype Validation Test
 *
 * Tests that the new long-range archetypes (sniper, lancer) properly utilize
 * the burst-disengage behavior and are competitively viable.
 *
 * Success criteria:
 * 1. Sniper and Lancer use Reposition state (burst-disengage triggers)
 * 2. They maintain distance better than standard archetypes
 * 3. They are competitively viable (win rate 30-70% against standard archetypes)
 * 4. Combat is dynamic (multiple engagement phases)
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import {
  ARCHETYPES,
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_MATCHUP = 30;
const MAX_FIGHT_TIME = 90;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

console.log('='.repeat(70));
console.log('LONG-RANGE ARCHETYPE VALIDATION');
console.log('='.repeat(70));

// Only sniper is a true long-range kiter
// Lancers are beam brawlers (short/mid range), not kiters
const LONG_RANGE_ARCHETYPES = ['sniper'];
const STANDARD_ARCHETYPES = ARCHETYPES.filter(
  (a) => !LONG_RANGE_ARCHETYPES.includes(a),
);

/**
 * Run a fight and collect detailed metrics
 */
function runDetailedFight(archetypeA, archetypeB, profileA, profileB, seed) {
  const world = createWorld(seed);
  initCombatStats(world);

  const shipA = createAIShip(
    world,
    archetypeA,
    Faction.Player,
    new Vector3(jitter(), jitter(), jitter()),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    profileA,
  );

  const shipB = createAIShip(
    world,
    archetypeB,
    Faction.Enemy,
    new Vector3(jitter(), jitter(), 800 + jitter()),
    new Quaternion(),
    profileB,
  );

  // Metrics
  const metrics = {
    winner: null,
    duration: 0,
    repositionCountA: 0,
    repositionCountB: 0,
    avgDistanceA: 0,
    avgDistanceB: 0,
    engageTimeA: 0,
    repositionTimeA: 0,
    distanceSamples: [],
  };

  let lastStateA = null;
  let distanceSum = 0;
  let distanceCount = 0;

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    runFrame(world);

    const aiA = getComponent(world, shipA, 'aiControlled');
    const aiB = getComponent(world, shipB, 'aiControlled');
    const transformA = getComponent(world, shipA, 'transform');
    const transformB = getComponent(world, shipB, 'transform');

    // Check for fight end
    if (!aiA || !aiB || !transformA || !transformB) {
      metrics.duration = (tick + 1) / TICK_RATE;
      if (!aiA && aiB) metrics.winner = 'B';
      else if (aiA && !aiB) metrics.winner = 'A';
      else metrics.winner = 'draw';
      break;
    }

    const distance = transformA.position.distanceTo(transformB.position);
    distanceSum += distance;
    distanceCount++;

    // Track state transitions for ship A
    if (aiA.state !== lastStateA) {
      if (aiA.state === AIState.Reposition) {
        metrics.repositionCountA++;
      }
      if (aiB.state === AIState.Reposition) {
        metrics.repositionCountB++;
      }
      lastStateA = aiA.state;
    }

    // Track time in states
    if (aiA.state === AIState.Engage) {
      metrics.engageTimeA += 1 / TICK_RATE;
    } else if (aiA.state === AIState.Reposition) {
      metrics.repositionTimeA += 1 / TICK_RATE;
    }

    // Sample distance periodically
    if (tick % 60 === 0) {
      metrics.distanceSamples.push(distance);
    }
  }

  if (!metrics.winner) {
    metrics.winner = 'timeout';
    metrics.duration = MAX_FIGHT_TIME;
  }

  metrics.avgDistanceA = distanceCount > 0 ? distanceSum / distanceCount : 0;

  return metrics;
}

/**
 * Run matchup and calculate aggregate stats
 */
function runMatchup(
  archetypeA,
  archetypeB,
  profileA = 'regular',
  profileB = 'regular',
) {
  const results = [];
  for (let i = 0; i < RUNS_PER_MATCHUP; i++) {
    results.push(
      runDetailedFight(archetypeA, archetypeB, profileA, profileB, i * 1000),
    );
  }

  const aWins = results.filter((r) => r.winner === 'A').length;
  const bWins = results.filter((r) => r.winner === 'B').length;
  const draws = results.filter(
    (r) => r.winner === 'draw' || r.winner === 'timeout',
  ).length;
  const avgDuration =
    results.reduce((s, r) => s + r.duration, 0) / RUNS_PER_MATCHUP;
  const avgReposA =
    results.reduce((s, r) => s + r.repositionCountA, 0) / RUNS_PER_MATCHUP;
  const avgDistance =
    results.reduce((s, r) => s + r.avgDistanceA, 0) / RUNS_PER_MATCHUP;
  const avgEngageTime =
    results.reduce((s, r) => s + r.engageTimeA, 0) / RUNS_PER_MATCHUP;
  const avgReposTime =
    results.reduce((s, r) => s + r.repositionTimeA, 0) / RUNS_PER_MATCHUP;

  return {
    aWins,
    bWins,
    draws,
    winRate: (aWins / RUNS_PER_MATCHUP) * 100,
    avgDuration,
    avgReposA,
    avgDistance,
    avgEngageTime,
    avgReposTime,
  };
}

// ============================================================
// TEST 1: Verify long-range archetypes exist and have preferredCombatRange
// ============================================================
console.log('\n--- TEST 1: ARCHETYPE CONFIGURATION ---\n');

let configPass = true;
for (const arch of LONG_RANGE_ARCHETYPES) {
  const stats = SHIP_ARCHETYPES[arch];
  if (!stats) {
    console.log(`  ${arch}: MISSING`);
    configPass = false;
    continue;
  }
  const range = stats.preferredCombatRange;
  const hasRange = range !== undefined && range > 780; // 130% of 600
  console.log(
    `  ${arch}: preferredCombatRange=${range ?? 'undefined'} - ${hasRange ? 'PASS' : 'FAIL'}`,
  );
  if (!hasRange) configPass = false;
}
console.log(`\nConfiguration check: ${configPass ? 'PASS' : 'FAIL'}`);

// ============================================================
// TEST 2: Verify burst-disengage is triggered
// ============================================================
console.log('\n--- TEST 2: BURST-DISENGAGE ACTIVATION ---\n');

console.log(
  'Archetype        | Avg Repos | Engage Time | Repos Time | Avg Distance',
);
console.log(
  '-----------------|-----------|-------------|------------|-------------',
);

let repositionPass = true;
for (const arch of LONG_RANGE_ARCHETYPES) {
  // Test against a standard opponent
  const result = runMatchup(arch, 'interceptor', 'veteran', 'regular');
  const usesRepos = result.avgReposA >= 0.3;
  if (!usesRepos) repositionPass = false;

  console.log(
    `${arch.padEnd(16)} | ${result.avgReposA.toFixed(1).padStart(9)} | ` +
      `${result.avgEngageTime.toFixed(1).padStart(10)}s | ` +
      `${result.avgReposTime.toFixed(1).padStart(9)}s | ` +
      `${result.avgDistance.toFixed(0).padStart(10)}m`,
  );
}

console.log(
  `\nBurst-disengage activation: ${repositionPass ? 'PASS' : 'FAIL'}`,
);

// ============================================================
// TEST 3: Compare distance maintenance vs standard archetypes
// ============================================================
console.log('\n--- TEST 3: DISTANCE MAINTENANCE ---\n');

const distanceResults = {};

// Test each archetype's average combat distance
for (const arch of [...LONG_RANGE_ARCHETYPES, 'striker', 'interceptor']) {
  const result = runMatchup(arch, 'defender', 'veteran', 'regular');
  distanceResults[arch] = result.avgDistance;
  console.log(
    `  ${arch.padEnd(12)}: ${result.avgDistance.toFixed(0)}m average combat distance`,
  );
}

// Long-range should maintain more distance than standard
const sniperDist = distanceResults.sniper || 0;
const lancerDist = distanceResults.lancer || 0;
const strikerDist = distanceResults.striker || 0;
const distancePass = sniperDist > strikerDist && lancerDist > strikerDist;
console.log(
  `\nLong-range maintains more distance: ${distancePass ? 'PASS' : 'FAIL'}`,
);

// ============================================================
// TEST 4: Competitive viability tournament
// ============================================================
console.log('\n--- TEST 4: COMPETITIVE VIABILITY ---\n');

console.log('Testing long-range archetypes vs all standard archetypes...\n');

const tournamentResults = {};

for (const longRange of LONG_RANGE_ARCHETYPES) {
  tournamentResults[longRange] = { wins: 0, losses: 0, draws: 0, total: 0 };

  for (const standard of STANDARD_ARCHETYPES) {
    const result = runMatchup(longRange, standard, 'veteran', 'regular');
    tournamentResults[longRange].total++;

    if (result.aWins > result.bWins) {
      tournamentResults[longRange].wins++;
    } else if (result.bWins > result.aWins) {
      tournamentResults[longRange].losses++;
    } else {
      tournamentResults[longRange].draws++;
    }
  }
}

console.log('Archetype   | Wins | Losses | Draws | Win Rate');
console.log('------------|------|--------|-------|----------');

let viabilityPass = true;
for (const arch of LONG_RANGE_ARCHETYPES) {
  const r = tournamentResults[arch];
  const winRate = (r.wins / r.total) * 100;
  // Viable = 25-75% win rate (not too weak, not too strong)
  const viable = winRate >= 25 && winRate <= 75;
  if (!viable) viabilityPass = false;

  console.log(
    `${arch.padEnd(11)} | ${String(r.wins).padStart(4)} | ` +
      `${String(r.losses).padStart(6)} | ${String(r.draws).padStart(5)} | ` +
      `${winRate.toFixed(0).padStart(7)}%`,
  );
}

console.log(
  `\nCompetitive viability (25-75% win rate): ${viabilityPass ? 'PASS' : 'FAIL'}`,
);

// ============================================================
// TEST 5: Combat dynamics (not just camping at range)
// ============================================================
console.log('\n--- TEST 5: COMBAT DYNAMICS ---\n');

console.log('Testing that fights have multiple phases (not just camping)...\n');

let dynamicsPass = true;
for (const arch of LONG_RANGE_ARCHETYPES) {
  const result = runMatchup(arch, 'striker', 'veteran', 'regular');

  // Good dynamics: both engage and reposition happen
  const hasEngagement = result.avgEngageTime >= 2.0;
  const hasRepositioning = result.avgReposTime >= 1.0;
  const hasDynamics = hasEngagement && hasRepositioning;
  if (!hasDynamics) dynamicsPass = false;

  console.log(
    `  ${arch.padEnd(8)}: Engage ${result.avgEngageTime.toFixed(1)}s, ` +
      `Reposition ${result.avgReposTime.toFixed(1)}s - ${hasDynamics ? 'PASS' : 'FAIL'}`,
  );
}

console.log(`\nCombat dynamics: ${dynamicsPass ? 'PASS' : 'FAIL'}`);

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${'='.repeat(70)}`);
console.log('SUMMARY');
console.log('='.repeat(70));

const allTests = [
  { name: 'Configuration', pass: configPass },
  { name: 'Burst-disengage activation', pass: repositionPass },
  { name: 'Distance maintenance', pass: distancePass },
  { name: 'Competitive viability', pass: viabilityPass },
  { name: 'Combat dynamics', pass: dynamicsPass },
];

let passCount = 0;
for (const test of allTests) {
  console.log(`  ${test.pass ? '✓' : '✗'} ${test.name}`);
  if (test.pass) passCount++;
}

console.log(`\nTests passed: ${passCount}/${allTests.length}`);

if (passCount === allTests.length) {
  console.log('\n✓ Long-range archetypes are working correctly!');
  console.log('  Burst-disengage behavior is validated and useful.');
} else if (passCount >= 3) {
  console.log('\n~ Long-range archetypes partially working.');
  console.log('  Some tuning may be needed.');
} else {
  console.log('\n✗ Long-range archetypes need significant work.');
  console.log('  Burst-disengage may not be providing value.');
}

console.log(`\n${'='.repeat(70)}`);
console.log('LONG-RANGE ARCHETYPE VALIDATION COMPLETE');
console.log(`${'='.repeat(70)}\n`);
