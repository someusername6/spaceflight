/**
 * Decoy and Missile Systems Test
 *
 * Tests:
 * 1. Decoy effectiveness by skill level
 * 2. Missile hit rates by type (tracking vs dumbfire)
 *
 * Target metrics:
 * - Decoy success rate should increase with skill (faster launches)
 * - Tracking missiles should have higher hit rate than dumbfire (but be countered by decoys)
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
import { aggregateCombatStats } from './combat-reporting.mjs';

const SKILL_LEVELS = ['rookie', 'regular', 'veteran', 'ace'];

const RUNS_PER_TEST = 30;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

// Jitter for spawn positions
const jitter = () => (Math.random() - 0.5) * 20;

console.log(`\n${'='.repeat(70)}`);
console.log('DECOY AND MISSILE SYSTEMS TEST');
console.log('='.repeat(70));

// ============================================================================
// TEST 1: Decoy Effectiveness by Skill Level
// ============================================================================
console.log('\n--- TEST 1: DECOY EFFECTIVENESS BY SKILL LEVEL ---');
console.log(
  'Testing how decoy cooldown (skill) affects missile countermeasure success\n',
);

const decoyResults = {};

for (const skill of SKILL_LEVELS) {
  const results = [];

  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 1000 + SKILL_LEVELS.indexOf(skill) * 100);
    initCombatStats(world);

    // Use interceptor vs interceptor for baseline (both use missiles)
    const shipA = createAIShip(
      world,
      'interceptor',
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      skill,
    );

    const shipB = createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
      new Quaternion(),
      skill,
    );

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);
      const aAlive = !!getComponent(world, shipA, 'health');
      const bAlive = !!getComponent(world, shipB, 'health');
      if (!aAlive || !bAlive) break;
    }

    results.push({ combatStats: world.systemState.combatStats });
  }

  const agg = aggregateCombatStats(results);
  decoyResults[skill] = {
    decoysLaunched: agg.decoysLaunched / RUNS_PER_TEST,
    decoysSuccessful: agg.decoysSuccessful / RUNS_PER_TEST,
    successRate:
      agg.decoysLaunched > 0
        ? (agg.decoysSuccessful / agg.decoysLaunched) * 100
        : 0,
    missilesSeduced: agg.missilesSeduced / RUNS_PER_TEST,
    missilesFired:
      Object.values(agg.missilesFired).reduce((a, b) => a + b, 0) /
      RUNS_PER_TEST,
    missilesHit:
      Object.values(agg.missilesHit).reduce((a, b) => a + b, 0) / RUNS_PER_TEST,
  };
}

console.log('Skill      | Decoys | Success | Rate  | Missiles | Seduced | Hit');
console.log('-'.repeat(70));
for (const skill of SKILL_LEVELS) {
  const r = decoyResults[skill];
  console.log(
    `${skill.padEnd(10)} | ${r.decoysLaunched.toFixed(1).padStart(6)} | ${r.decoysSuccessful.toFixed(1).padStart(7)} | ${r.successRate.toFixed(0).padStart(4)}% | ${r.missilesFired.toFixed(1).padStart(8)} | ${r.missilesSeduced.toFixed(1).padStart(7)} | ${r.missilesHit.toFixed(1).padStart(4)}`,
  );
}

// Analysis
console.log('\nDecoy Analysis:');
const rookieDecoys = decoyResults.rookie.decoysLaunched;
const aceDecoys = decoyResults.ace.decoysLaunched;
if (aceDecoys > rookieDecoys * 1.5) {
  console.log(
    `  ✓ Ace launches ${((aceDecoys / rookieDecoys) * 100 - 100).toFixed(0)}% more decoys than Rookie`,
  );
} else {
  console.log(
    `  ⚠ Skill gap insufficient: Ace only ${((aceDecoys / rookieDecoys) * 100 - 100).toFixed(0)}% more decoys`,
  );
}

// ============================================================================
// TEST 2: Missile Hit Rates by Type
// ============================================================================
console.log('\n--- TEST 2: MISSILE HIT RATES BY TYPE ---');
console.log(
  'Comparing tracking missiles (can be decoyed) vs dumbfire (aim error only)\n',
);

const missileResults = { tracking: {}, dumbfire: {} };

// Use bomber for missiles (has torpedoes and dumbfire rockets)
for (let run = 0; run < RUNS_PER_TEST * 2; run++) {
  const world = createWorld(run * 2000);
  initCombatStats(world);

  const shipA = createAIShip(
    world,
    'bomber',
    Faction.Player,
    new Vector3(jitter(), jitter(), jitter()),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  const shipB = createAIShip(
    world,
    'interceptor',
    Faction.Enemy,
    new Vector3(jitter(), jitter(), 400 + jitter()),
    new Quaternion(),
    'regular',
  );

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    runFrame(world);
    const aAlive = !!getComponent(world, shipA, 'health');
    const bAlive = !!getComponent(world, shipB, 'health');
    if (!aAlive || !bAlive) break;
  }

  const cs = world.systemState.combatStats;
  for (const [type, count] of Object.entries(cs.missilesFired)) {
    const hit = cs.missilesHit[type] || 0;
    const damage = cs.missileDamage[type] || 0;
    const lowerType = type.toLowerCase();

    // Categorize by tracking ability (rockets are dumbfire, others track)
    const isTracking = !lowerType.includes('rocket');
    const category = isTracking ? 'tracking' : 'dumbfire';

    if (!missileResults[category][type]) {
      missileResults[category][type] = { fired: 0, hit: 0, damage: 0 };
    }
    missileResults[category][type].fired += count;
    missileResults[category][type].hit += hit;
    missileResults[category][type].damage += damage;
  }
}

console.log('TRACKING MISSILES (can be decoyed):');
console.log('Type                | Fired | Hit  | Rate  | Damage');
console.log('-'.repeat(55));
const trackingTotal = { fired: 0, hit: 0, damage: 0 };
for (const [type, data] of Object.entries(missileResults.tracking)) {
  const rate = data.fired > 0 ? (data.hit / data.fired) * 100 : 0;
  console.log(
    `${type.padEnd(19)} | ${data.fired.toString().padStart(5)} | ${data.hit.toString().padStart(4)} | ${rate.toFixed(0).padStart(4)}% | ${data.damage.toFixed(0).padStart(6)}`,
  );
  trackingTotal.fired += data.fired;
  trackingTotal.hit += data.hit;
  trackingTotal.damage += data.damage;
}
if (trackingTotal.fired > 0) {
  const trackingRate = (trackingTotal.hit / trackingTotal.fired) * 100;
  console.log('-'.repeat(55));
  console.log(
    `${'TOTAL'.padEnd(19)} | ${trackingTotal.fired.toString().padStart(5)} | ${trackingTotal.hit.toString().padStart(4)} | ${trackingRate.toFixed(0).padStart(4)}% | ${trackingTotal.damage.toFixed(0).padStart(6)}`,
  );
}

console.log('\nDUMBFIRE MISSILES (aim error only):');
console.log('Type                | Fired | Hit  | Rate  | Damage');
console.log('-'.repeat(55));
const dumbfireTotal = { fired: 0, hit: 0, damage: 0 };
for (const [type, data] of Object.entries(missileResults.dumbfire)) {
  const rate = data.fired > 0 ? (data.hit / data.fired) * 100 : 0;
  console.log(
    `${type.padEnd(19)} | ${data.fired.toString().padStart(5)} | ${data.hit.toString().padStart(4)} | ${rate.toFixed(0).padStart(4)}% | ${data.damage.toFixed(0).padStart(6)}`,
  );
  dumbfireTotal.fired += data.fired;
  dumbfireTotal.hit += data.hit;
  dumbfireTotal.damage += data.damage;
}
if (dumbfireTotal.fired > 0) {
  const dumbfireRate = (dumbfireTotal.hit / dumbfireTotal.fired) * 100;
  console.log('-'.repeat(55));
  console.log(
    `${'TOTAL'.padEnd(19)} | ${dumbfireTotal.fired.toString().padStart(5)} | ${dumbfireTotal.hit.toString().padStart(4)} | ${dumbfireRate.toFixed(0).padStart(4)}% | ${dumbfireTotal.damage.toFixed(0).padStart(6)}`,
  );
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n${'='.repeat(70)}`);
console.log('DECOY AND MISSILE SUMMARY');
console.log('='.repeat(70));

console.log('\nKey Findings:');

// Decoy effectiveness
const rookieRate = decoyResults.rookie.successRate;
const aceRate = decoyResults.ace.successRate;
console.log(
  `  Decoy success: Rookie ${rookieRate.toFixed(0)}% → Ace ${aceRate.toFixed(0)}%`,
);

// Missile hit rates
if (trackingTotal.fired > 0 && dumbfireTotal.fired > 0) {
  const trackingRate = (trackingTotal.hit / trackingTotal.fired) * 100;
  const dumbfireRate = (dumbfireTotal.hit / dumbfireTotal.fired) * 100;
  console.log(
    `  Missile hit rates: Tracking ${trackingRate.toFixed(0)}%, Dumbfire ${dumbfireRate.toFixed(0)}%`,
  );
}

console.log(`\n${'='.repeat(70)}`);
console.log('DECOY AND MISSILE TEST COMPLETE');
console.log(`${'='.repeat(70)}\n`);
