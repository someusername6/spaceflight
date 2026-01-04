/**
 * Engagement Range and Beam Effectiveness Testing
 *
 * Tests how different configurations affect:
 * 1. Actual combat distances (not just engage range)
 * 2. Beam weapon usage
 * 3. Short-range weapon effectiveness
 *
 * Configurations tested:
 * A. Baseline (current)
 * B. Range adjustments only (red laser 500m, blue DPS 30)
 * C. Ship reassignments (Striker→green, Defender+green, Scout+red)
 * D. AI logic (preferredCombatRange per ship)
 * E. Combined (B + C + D)
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import {
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 25;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

console.log(`\n${'='.repeat(70)}`);
console.log('ENGAGEMENT RANGE & BEAM EFFECTIVENESS TESTING');
console.log('='.repeat(70));

// Store original values
const originals = {
  redLaserRange: PRIMARY_WEAPONS['red laser'].range,
  blueLaserDamage: PRIMARY_WEAPONS['blue laser'].damage,
  striker: JSON.parse(JSON.stringify(SHIP_ARCHETYPES.striker)),
  defender: JSON.parse(JSON.stringify(SHIP_ARCHETYPES.defender)),
  scout: JSON.parse(JSON.stringify(SHIP_ARCHETYPES.scout)),
  sentinel: JSON.parse(JSON.stringify(SHIP_ARCHETYPES.sentinel)),
};

function restoreOriginals() {
  PRIMARY_WEAPONS['red laser'].range = originals.redLaserRange;
  PRIMARY_WEAPONS['blue laser'].damage = originals.blueLaserDamage;
  Object.assign(SHIP_ARCHETYPES.striker, originals.striker);
  Object.assign(SHIP_ARCHETYPES.defender, originals.defender);
  Object.assign(SHIP_ARCHETYPES.scout, originals.scout);
  Object.assign(SHIP_ARCHETYPES.sentinel, originals.sentinel);
}

/**
 * Run test and measure engagement distances + beam usage
 */
function runEngagementTest(description, setupFn) {
  setupFn();

  const results = {
    totalDistance: 0,
    distanceSamples: 0,
    minDistance: Infinity,
    maxDistance: 0,
    damageByType: { projectile: 0, beam: 0, missile: 0 },
    beamBreakdown: {},
    wins: { striker: 0, sentinel: 0, scout: 0 },
    fights: 0,
  };

  // Test ships with beams: Striker, Sentinel, Scout (if given beam), Interceptor
  const testPairs = [
    ['striker', 'interceptor'],
    ['sentinel', 'interceptor'],
    ['scout', 'interceptor'],
    ['defender', 'interceptor'],
  ];

  for (const [shipA, shipB] of testPairs) {
    for (let run = 0; run < RUNS_PER_TEST; run++) {
      const world = createWorld(
        run * 1000 + testPairs.indexOf([shipA, shipB]) * 100,
      );
      initCombatStats(world);

      // Track engagement distances
      const distanceLog = [];

      const entityA = createAIShip(
        world,
        shipA,
        Faction.Player,
        new Vector3(jitter(), jitter(), jitter()),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
        'regular',
      );

      const entityB = createAIShip(
        world,
        shipB,
        Faction.Enemy,
        new Vector3(jitter(), jitter(), 600 + jitter()),
        new Quaternion(),
        'regular',
      );

      for (let tick = 0; tick < MAX_TICKS; tick++) {
        runFrame(world);

        // Sample distance every 0.5 seconds during combat
        if (tick % 30 === 0) {
          const transformA = getComponent(world, entityA, 'transform');
          const transformB = getComponent(world, entityB, 'transform');
          if (transformA && transformB) {
            const dist = transformA.position.distanceTo(transformB.position);
            distanceLog.push(dist);
          }
        }

        const aAlive = !!getComponent(world, entityA, 'health');
        const bAlive = !!getComponent(world, entityB, 'health');
        if (!aAlive || !bAlive) {
          if (!bAlive && aAlive) {
            results.wins[shipA] = (results.wins[shipA] || 0) + 1;
          }
          results.fights++;
          break;
        }
      }

      // Aggregate distances (skip first few samples - approach phase)
      const combatDistances = distanceLog.slice(3);
      for (const d of combatDistances) {
        results.totalDistance += d;
        results.distanceSamples++;
        results.minDistance = Math.min(results.minDistance, d);
        results.maxDistance = Math.max(results.maxDistance, d);
      }

      // Aggregate damage
      const cs = world.systemState.combatStats;
      for (const dmg of Object.values(cs.damageDealt)) {
        results.damageByType.projectile += dmg;
      }
      for (const [name, dmg] of Object.entries(cs.beamDamage)) {
        results.damageByType.beam += dmg;
        results.beamBreakdown[name] = (results.beamBreakdown[name] || 0) + dmg;
      }
      for (const dmg of Object.values(cs.missileDamage || {})) {
        results.damageByType.missile += dmg;
      }
    }
  }

  restoreOriginals();

  // Calculate summary stats
  const avgDistance =
    results.distanceSamples > 0
      ? results.totalDistance / results.distanceSamples
      : 0;
  const totalDamage =
    results.damageByType.projectile +
    results.damageByType.beam +
    results.damageByType.missile;
  const beamPct =
    totalDamage > 0 ? (results.damageByType.beam / totalDamage) * 100 : 0;

  console.log(`\n--- ${description} ---`);
  console.log(
    `Avg combat distance: ${avgDistance.toFixed(0)}m (range: ${results.minDistance.toFixed(0)}-${results.maxDistance.toFixed(0)}m)`,
  );
  console.log(`Beam damage: ${beamPct.toFixed(1)}% of total`);

  if (Object.keys(results.beamBreakdown).length > 0) {
    console.log('Beam breakdown:');
    for (const [name, dmg] of Object.entries(results.beamBreakdown).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${name}: ${dmg.toFixed(0)}`);
    }
  }

  return { description, avgDistance, beamPct, results };
}

const tests = [];

// CONFIG A: Baseline
console.log('\n=== CONFIG A: BASELINE ===');
console.log('Current weapon ranges and ship loadouts');
tests.push(runEngagementTest('BASELINE', () => {}));

// CONFIG B: Range/DPS adjustments only
console.log('\n=== CONFIG B: RANGE/DPS ADJUSTMENTS ===');
console.log('Red laser: 400→500m, Blue laser: 25→30 DPS');
tests.push(
  runEngagementTest('RANGE/DPS ADJ', () => {
    PRIMARY_WEAPONS['red laser'].range = 500;
    PRIMARY_WEAPONS['blue laser'].damage = 30;
  }),
);

// CONFIG C: Ship reassignments
console.log('\n=== CONFIG C: SHIP REASSIGNMENTS ===');
console.log('Striker: red→green laser');
console.log('Defender: add green laser');
console.log('Scout: add red laser');
tests.push(
  runEngagementTest('SHIP REASSIGN', () => {
    // Striker: replace red laser with green laser
    SHIP_ARCHETYPES.striker.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'greenLaser', size: 2 }, // was red laser
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ];

    // Defender: add green laser
    SHIP_ARCHETYPES.defender.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'greenLaser', size: 2 }, // added
      { name: 'pulse', size: 1 },
    ];

    // Scout: add red laser
    SHIP_ARCHETYPES.scout.primaryWeapons = [
      { name: 'pulse', size: 1 },
      { name: 'redLaser', size: 1 }, // added (replaces one pulse)
    ];
  }),
);

// CONFIG D: Range + Reassignments
console.log('\n=== CONFIG D: RANGE + REASSIGNMENTS ===');
tests.push(
  runEngagementTest('RANGE + REASSIGN', () => {
    PRIMARY_WEAPONS['red laser'].range = 500;
    PRIMARY_WEAPONS['blue laser'].damage = 30;

    SHIP_ARCHETYPES.striker.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'greenLaser', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ];

    SHIP_ARCHETYPES.defender.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'greenLaser', size: 2 },
      { name: 'pulse', size: 1 },
    ];

    SHIP_ARCHETYPES.scout.primaryWeapons = [
      { name: 'pulse', size: 1 },
      { name: 'redLaser', size: 1 },
    ];
  }),
);

// CONFIG E: More aggressive - higher beam DPS
console.log('\n=== CONFIG E: AGGRESSIVE BEAM BUFF ===');
console.log('Red: 500m, Blue: 35 DPS, Green: 45 DPS');
tests.push(
  runEngagementTest('AGGRESSIVE BUFF', () => {
    PRIMARY_WEAPONS['red laser'].range = 500;
    PRIMARY_WEAPONS['blue laser'].damage = 35;
    PRIMARY_WEAPONS['green laser'].damage = 45;

    SHIP_ARCHETYPES.striker.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'greenLaser', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ];

    SHIP_ARCHETYPES.defender.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'greenLaser', size: 2 },
      { name: 'pulse', size: 1 },
    ];

    SHIP_ARCHETYPES.scout.primaryWeapons = [
      { name: 'pulse', size: 1 },
      { name: 'redLaser', size: 1 },
    ];
  }),
);

// Restore green laser damage for next test
PRIMARY_WEAPONS['green laser'].damage = 40;

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log('ENGAGEMENT RANGE SUMMARY');
console.log('='.repeat(70));
console.log('\n| Config | Avg Distance | Beam % | Change |');
console.log('|--------|--------------|--------|--------|');
const baseline = tests[0];
for (const t of tests) {
  const _distDelta = t.avgDistance - baseline.avgDistance;
  const beamDelta = t.beamPct - baseline.beamPct;
  console.log(
    `| ${t.description.padEnd(16)} | ${t.avgDistance.toFixed(0).padStart(10)}m | ${t.beamPct.toFixed(1).padStart(5)}% | ${beamDelta >= 0 ? '+' : ''}${beamDelta.toFixed(1)}% |`,
  );
}

console.log('\nKey insights:');
console.log('- Baseline avg distance shows where combat actually happens');
console.log('- Beam % shows how much beams contribute to damage');
console.log('- Ship reassignments add beams to more ships (more exposure)');
console.log('- Range adjustments make short-range beams usable');

console.log(`\n${'='.repeat(70)}`);
