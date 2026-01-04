/**
 * Sniper Effectiveness Test
 *
 * Validates that snipers are:
 * 1. Effective at long range (win rate advantage at 1200m)
 * 2. Outclassed at short range (lose to brawlers at 300m)
 * 3. Successfully kite (maintain distance over time)
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('\n=== SNIPER EFFECTIVENESS ANALYSIS ===\n');

/**
 * Run a duel and return the result
 */
function runDuel(
  archetype1,
  archetype2,
  startDistance,
  maxTime = 60,
  seed = 0,
) {
  const world = createWorld(seed);
  initCombatStats(world);

  const ship1 = createAIShip(
    world,
    archetype1,
    Faction.Player,
    new Vector3(0, 0, 0),
    new Quaternion(),
    'regular',
  );
  const ship2 = createAIShip(
    world,
    archetype2,
    Faction.Enemy,
    new Vector3(0, 0, startDistance),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  // Track distance over time
  const distanceHistory = [];
  let ship1Alive = true;
  let ship2Alive = true;
  let ticksRun = 0;

  for (let tick = 0; tick < maxTime * TICK_RATE; tick++) {
    runFrame(world);
    ticksRun++;

    const t1 = getComponent(world, ship1, 'transform');
    const t2 = getComponent(world, ship2, 'transform');

    if (!t1) {
      ship1Alive = false;
      break;
    }
    if (!t2) {
      ship2Alive = false;
      break;
    }

    // Sample distance every 0.5s
    if (tick % (TICK_RATE / 2) === 0) {
      distanceHistory.push(t1.position.distanceTo(t2.position));
    }
  }

  const duration = ticksRun / TICK_RATE;
  const avgDistance =
    distanceHistory.length > 0
      ? distanceHistory.reduce((a, b) => a + b, 0) / distanceHistory.length
      : startDistance;

  return {
    winner: ship1Alive ? (ship2Alive ? 'draw' : archetype1) : archetype2,
    duration,
    avgDistance,
    distanceHistory,
  };
}

/**
 * Run multiple duels and aggregate results
 */
function runDuelSeries(archetype1, archetype2, startDistance, runs = 30) {
  let wins1 = 0;
  let wins2 = 0;
  let draws = 0;
  let totalDuration = 0;
  let totalAvgDistance = 0;

  for (let i = 0; i < runs; i++) {
    const result = runDuel(archetype1, archetype2, startDistance, 60, i * 1000);
    if (result.winner === archetype1) wins1++;
    else if (result.winner === archetype2) wins2++;
    else draws++;
    totalDuration += result.duration;
    totalAvgDistance += result.avgDistance;
  }

  return {
    archetype1,
    archetype2,
    startDistance,
    wins1,
    wins2,
    draws,
    winRate1: (wins1 / runs) * 100,
    avgDuration: totalDuration / runs,
    avgDistance: totalAvgDistance / runs,
  };
}

// =============================================================================
// Test 1: Sniper vs Scout at different ranges
// =============================================================================
console.log('--- Test 1: Sniper vs Scout (Range Comparison) ---');
console.log('Scout is a fast close-range brawler. Sniper should:');
console.log('  - Lose at close range (300m)');
console.log('  - Win at long range (1200m)\n');

{
  const closeRange = runDuelSeries('sniper', 'scout', 300, 30);
  const longRange = runDuelSeries('sniper', 'scout', 1200, 30);

  console.log(
    `At 300m (close): Sniper ${closeRange.winRate1.toFixed(0)}% win rate`,
  );
  console.log(
    `  Avg distance: ${closeRange.avgDistance.toFixed(0)}m, duration: ${closeRange.avgDuration.toFixed(1)}s`,
  );
  console.log(
    `At 1200m (long): Sniper ${longRange.winRate1.toFixed(0)}% win rate`,
  );
  console.log(
    `  Avg distance: ${longRange.avgDistance.toFixed(0)}m, duration: ${longRange.avgDuration.toFixed(1)}s`,
  );

  const rangeAdvantage = longRange.winRate1 - closeRange.winRate1;
  console.log(
    `\nRange advantage: ${rangeAdvantage > 0 ? '+' : ''}${rangeAdvantage.toFixed(0)}% at long range`,
  );

  const closePass = closeRange.winRate1 < 50; // Should lose close range
  const longPass = longRange.winRate1 > 50; // Should win long range
  console.log(
    `Close-range vulnerability: ${closePass ? 'PASS' : 'FAIL'} (expected <50%)`,
  );
  console.log(
    `Long-range effectiveness: ${longPass ? 'PASS' : 'FAIL'} (expected >50%)`,
  );
}

// =============================================================================
// Test 2: Sniper vs Interceptor at different ranges
// =============================================================================
console.log('\n--- Test 2: Sniper vs Interceptor (Range Comparison) ---');
console.log('Interceptor is a balanced fighter. Range should matter.\n');

{
  const closeRange = runDuelSeries('sniper', 'interceptor', 300, 30);
  const longRange = runDuelSeries('sniper', 'interceptor', 1200, 30);

  console.log(
    `At 300m (close): Sniper ${closeRange.winRate1.toFixed(0)}% win rate`,
  );
  console.log(
    `  Avg distance: ${closeRange.avgDistance.toFixed(0)}m, duration: ${closeRange.avgDuration.toFixed(1)}s`,
  );
  console.log(
    `At 1200m (long): Sniper ${longRange.winRate1.toFixed(0)}% win rate`,
  );
  console.log(
    `  Avg distance: ${longRange.avgDistance.toFixed(0)}m, duration: ${longRange.avgDuration.toFixed(1)}s`,
  );

  const rangeAdvantage = longRange.winRate1 - closeRange.winRate1;
  console.log(
    `\nRange advantage: ${rangeAdvantage > 0 ? '+' : ''}${rangeAdvantage.toFixed(0)}% at long range`,
  );
}

// =============================================================================
// Test 3: Kiting behavior analysis
// =============================================================================
console.log('\n--- Test 3: Kiting Behavior Analysis ---');
console.log('Track sniper distance maintenance against pursuing scout.\n');

{
  // Run a long fight and analyze distance distribution
  const world = createWorld(99999);
  initCombatStats(world);

  const sniper = createAIShip(
    world,
    'sniper',
    Faction.Player,
    new Vector3(0, 0, 0),
    new Quaternion(),
    'regular',
  );
  const scout = createAIShip(
    world,
    'scout',
    Faction.Enemy,
    new Vector3(0, 0, 800),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  const distances = [];
  const states = [];
  const sniperAI = getComponent(world, sniper, 'aiControlled');

  for (let tick = 0; tick < 30 * TICK_RATE; tick++) {
    runFrame(world);

    const t1 = getComponent(world, sniper, 'transform');
    const t2 = getComponent(world, scout, 'transform');
    if (!t1 || !t2) break;

    distances.push(t1.position.distanceTo(t2.position));
    states.push(sniperAI.state);
  }

  // Analyze distance distribution
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);

  // Count time in different range bands
  const closeTime = distances.filter((d) => d < 600).length / distances.length;
  const midTime =
    distances.filter((d) => d >= 600 && d < 1000).length / distances.length;
  const longTime = distances.filter((d) => d >= 1000).length / distances.length;

  // Count state distribution
  const evadeTime = states.filter((s) => s === 'evade').length / states.length;
  const engageTime =
    states.filter((s) => s === 'engage').length / states.length;
  const pursueTime =
    states.filter((s) => s === 'pursue').length / states.length;

  console.log('Distance statistics (30s fight):');
  console.log(
    `  Min: ${minDist.toFixed(0)}m, Avg: ${avgDist.toFixed(0)}m, Max: ${maxDist.toFixed(0)}m`,
  );
  console.log(`\nTime spent in range bands:`);
  console.log(`  Close (<600m):  ${(closeTime * 100).toFixed(0)}%`);
  console.log(`  Medium (600-1000m): ${(midTime * 100).toFixed(0)}%`);
  console.log(`  Long (>1000m):  ${(longTime * 100).toFixed(0)}%`);
  console.log(`\nState distribution:`);
  console.log(`  EVADE:  ${(evadeTime * 100).toFixed(0)}%`);
  console.log(`  ENGAGE: ${(engageTime * 100).toFixed(0)}%`);
  console.log(`  PURSUE: ${(pursueTime * 100).toFixed(0)}%`);

  // Success criteria: sniper should spend meaningful time at long range
  const kitingSuccess = longTime > 0.2 || avgDist > 700;
  console.log(
    `\nKiting success: ${kitingSuccess ? 'PASS' : 'FAIL'} (expected >20% at long range or avg >700m)`,
  );
}

// =============================================================================
// Test 4: Cross-archetype comparison at close range
// =============================================================================
console.log('\n--- Test 4: Sniper Close-Range Performance ---');
console.log('Sniper should underperform against all archetypes at 300m.\n');

{
  const opponents = ['scout', 'interceptor', 'striker', 'defender'];
  console.log('Sniper win rate at 300m (should be <50% for most):');

  for (const opponent of opponents) {
    const result = runDuelSeries('sniper', opponent, 300, 20);
    const status = result.winRate1 < 50 ? 'OK' : 'HIGH';
    console.log(
      `  vs ${opponent.padEnd(12)}: ${result.winRate1.toFixed(0)}% [${status}]`,
    );
  }
}

// =============================================================================
// Test 5: Sniper vs Lancer (both long-range)
// =============================================================================
console.log('\n--- Test 5: Sniper vs Lancer (Long-Range Duel) ---');
console.log('Both are long-range specialists. Compare kiting strategies.\n');

{
  const result = runDuelSeries('sniper', 'lancer', 1000, 30);
  console.log(
    `Win rate at 1000m: Sniper ${result.winRate1.toFixed(0)}%, Lancer ${(100 - result.winRate1 - (result.draws / 30) * 100).toFixed(0)}%`,
  );
  console.log(
    `  Avg distance: ${result.avgDistance.toFixed(0)}m, duration: ${result.avgDuration.toFixed(1)}s`,
  );
  console.log(`  Draws: ${result.draws}`);
}

console.log('\n=== SNIPER EFFECTIVENESS ANALYSIS COMPLETE ===\n');
