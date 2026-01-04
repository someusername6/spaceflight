/**
 * AI Closing Behavior Test
 *
 * Tests the preferredCombatRange system to ensure ships with
 * short-range weapons actively close distance during combat.
 *
 * Compares:
 * 1. Baseline (no preferredCombatRange)
 * 2. With preferredCombatRange values for each archetype
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 25;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

const jitter = () => (Math.random() - 0.5) * 20;

console.log(`\n${'='.repeat(70)}`);
console.log('AI CLOSING BEHAVIOR TEST');
console.log('='.repeat(70));

// Store originals
const originals = {};
for (const [name, stats] of Object.entries(SHIP_ARCHETYPES)) {
  originals[name] = { ...stats };
}

function restoreOriginals() {
  for (const [name, stats] of Object.entries(originals)) {
    SHIP_ARCHETYPES[name].preferredCombatRange = stats.preferredCombatRange;
  }
}

function runClosingTest(description, setupFn) {
  setupFn();

  const results = {
    totalDistance: 0,
    distanceSamples: 0,
    minDistance: Infinity,
    beamDamage: 0,
    totalDamage: 0,
  };

  // Test striker (has red laser) vs interceptor
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 1000);
    initCombatStats(world);

    const striker = createAIShip(
      world,
      'striker',
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const enemy = createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 600 + jitter()),
      new Quaternion(),
      'regular',
    );

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);

      // Sample distance every 0.5 seconds
      if (tick % 30 === 0 && tick > 60) {
        // Skip first second (approach)
        const transformA = getComponent(world, striker, 'transform');
        const transformB = getComponent(world, enemy, 'transform');
        if (transformA && transformB) {
          const dist = transformA.position.distanceTo(transformB.position);
          results.totalDistance += dist;
          results.distanceSamples++;
          results.minDistance = Math.min(results.minDistance, dist);
        }
      }

      const aAlive = !!getComponent(world, striker, 'health');
      const bAlive = !!getComponent(world, enemy, 'health');
      if (!aAlive || !bAlive) break;
    }

    const cs = world.systemState.combatStats;
    for (const dmg of Object.values(cs.damageDealt)) {
      results.totalDamage += dmg;
    }
    for (const dmg of Object.values(cs.beamDamage)) {
      results.beamDamage += dmg;
      results.totalDamage += dmg;
    }
    for (const dmg of Object.values(cs.missileDamage || {})) {
      results.totalDamage += dmg;
    }
  }

  restoreOriginals();

  const avgDistance =
    results.distanceSamples > 0
      ? results.totalDistance / results.distanceSamples
      : 0;
  const beamPct =
    results.totalDamage > 0
      ? (results.beamDamage / results.totalDamage) * 100
      : 0;

  console.log(`\n--- ${description} ---`);
  console.log(
    `Avg combat distance: ${avgDistance.toFixed(0)}m (min: ${results.minDistance.toFixed(0)}m)`,
  );
  console.log(`Beam damage: ${beamPct.toFixed(1)}% of total`);

  return {
    description,
    avgDistance,
    minDistance: results.minDistance,
    beamPct,
  };
}

const tests = [];

// TEST 1: Baseline (no preferredCombatRange)
console.log('\n=== TEST 1: BASELINE (No preferredCombatRange) ===');
tests.push(
  runClosingTest('BASELINE', () => {
    // Clear any existing preferredCombatRange
    for (const name of Object.keys(SHIP_ARCHETYPES)) {
      delete SHIP_ARCHETYPES[name].preferredCombatRange;
    }
  }),
);

// TEST 2: With preferredCombatRange values
console.log('\n=== TEST 2: WITH preferredCombatRange ===');
console.log('Striker: 400m (for red laser at 400m range)');
tests.push(
  runClosingTest('WITH PREFERRED RANGE', () => {
    // Set preferred ranges based on weapon loadouts
    SHIP_ARCHETYPES.scout.preferredCombatRange = 350; // Fast, close-range
    SHIP_ARCHETYPES.interceptor.preferredCombatRange = 700; // Versatile
    SHIP_ARCHETYPES.striker.preferredCombatRange = 400; // Red laser range
    SHIP_ARCHETYPES.bomber.preferredCombatRange = 500; // Missile boat
    SHIP_ARCHETYPES.defender.preferredCombatRange = 600; // Tanky
    SHIP_ARCHETYPES.raider.preferredCombatRange = 400; // Glass cannon close
    SHIP_ARCHETYPES.sentinel.preferredCombatRange = 1000; // Long range
  }),
);

// TEST 3: With increased red laser range (500m) + preferredCombatRange
console.log('\n=== TEST 3: RED LASER 500m + preferredCombatRange ===');
const origRedRange = PRIMARY_WEAPONS['red laser'].range;
tests.push(
  runClosingTest('RED 500m + PREFERRED', () => {
    PRIMARY_WEAPONS['red laser'].range = 500;
    SHIP_ARCHETYPES.striker.preferredCombatRange = 450; // Just inside new range
  }),
);
PRIMARY_WEAPONS['red laser'].range = origRedRange;

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log('AI CLOSING BEHAVIOR SUMMARY');
console.log('='.repeat(70));
console.log('\n| Config | Avg Distance | Min Distance | Beam % |');
console.log('|--------|--------------|--------------|--------|');
for (const t of tests) {
  console.log(
    `| ${t.description.padEnd(20)} | ${t.avgDistance.toFixed(0).padStart(10)}m | ${t.minDistance.toFixed(0).padStart(11)}m | ${t.beamPct.toFixed(1).padStart(5)}% |`,
  );
}

const improvement = tests[0].avgDistance - tests[1].avgDistance;
console.log(
  `\nDistance improvement with preferredCombatRange: ${improvement.toFixed(0)}m closer`,
);
console.log(`\n${'='.repeat(70)}`);
