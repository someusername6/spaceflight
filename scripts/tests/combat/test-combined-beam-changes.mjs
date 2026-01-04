/**
 * Combined Beam Balance Test
 *
 * Tests all proposed changes together:
 * 1. Range adjustments (red laser 500m, blue laser 30 DPS)
 * 2. Ship reassignments (Striker→green, Defender+green, Scout+red)
 * 3. preferredCombatRange values for each archetype
 *
 * Target: Increase beam damage from ~11% to ~20%
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

const ARCHETYPES = [
  'scout',
  'interceptor',
  'striker',
  'defender',
  'bomber',
  'raider',
  'sentinel',
];

const RUNS_PER_MATCHUP = 20;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

const jitter = () => (Math.random() - 0.5) * 20;

console.log(`\n${'='.repeat(70)}`);
console.log('COMBINED BEAM BALANCE TEST');
console.log('='.repeat(70));

// Store originals
const origRedRange = PRIMARY_WEAPONS['red laser'].range;
const origBlueDamage = PRIMARY_WEAPONS['blue laser'].damage;
const origArchetypes = {};
for (const name of ARCHETYPES) {
  origArchetypes[name] = JSON.parse(JSON.stringify(SHIP_ARCHETYPES[name]));
}

function restoreAll() {
  PRIMARY_WEAPONS['red laser'].range = origRedRange;
  PRIMARY_WEAPONS['blue laser'].damage = origBlueDamage;
  for (const name of ARCHETYPES) {
    Object.assign(SHIP_ARCHETYPES[name], origArchetypes[name]);
  }
}

function runCombinedTest(description, setupFn) {
  setupFn();

  const results = {
    damageByType: { projectile: 0, beam: 0, missile: 0 },
    beamBreakdown: {},
    archetypeBeam: {},
    totalDistance: 0,
    distanceSamples: 0,
  };

  // Test each archetype vs interceptor to get aggregate beam usage
  for (const archetype of ARCHETYPES) {
    results.archetypeBeam[archetype] = { beam: 0, total: 0 };

    for (let run = 0; run < RUNS_PER_MATCHUP; run++) {
      const world = createWorld(
        run * 1000 + ARCHETYPES.indexOf(archetype) * 100,
      );
      initCombatStats(world);

      const shipA = createAIShip(
        world,
        archetype,
        Faction.Player,
        new Vector3(jitter(), jitter(), jitter()),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
        'regular',
      );

      const shipB = createAIShip(
        world,
        'interceptor',
        Faction.Enemy,
        new Vector3(jitter(), jitter(), 600 + jitter()),
        new Quaternion(),
        'regular',
      );

      for (let tick = 0; tick < MAX_TICKS; tick++) {
        runFrame(world);

        // Sample distance
        if (tick % 30 === 0 && tick > 60) {
          const transformA = getComponent(world, shipA, 'transform');
          const transformB = getComponent(world, shipB, 'transform');
          if (transformA && transformB) {
            results.totalDistance += transformA.position.distanceTo(
              transformB.position,
            );
            results.distanceSamples++;
          }
        }

        const aAlive = !!getComponent(world, shipA, 'health');
        const bAlive = !!getComponent(world, shipB, 'health');
        if (!aAlive || !bAlive) break;
      }

      const cs = world.systemState.combatStats;
      let fightTotal = 0;
      let fightBeam = 0;

      for (const dmg of Object.values(cs.damageDealt)) {
        results.damageByType.projectile += dmg;
        fightTotal += dmg;
      }
      for (const [name, dmg] of Object.entries(cs.beamDamage)) {
        results.damageByType.beam += dmg;
        results.beamBreakdown[name] = (results.beamBreakdown[name] || 0) + dmg;
        fightBeam += dmg;
        fightTotal += dmg;
      }
      for (const dmg of Object.values(cs.missileDamage || {})) {
        results.damageByType.missile += dmg;
        fightTotal += dmg;
      }

      results.archetypeBeam[archetype].beam += fightBeam;
      results.archetypeBeam[archetype].total += fightTotal;
    }
  }

  restoreAll();

  const totalDamage =
    results.damageByType.projectile +
    results.damageByType.beam +
    results.damageByType.missile;
  const beamPct =
    totalDamage > 0 ? (results.damageByType.beam / totalDamage) * 100 : 0;
  const avgDistance =
    results.distanceSamples > 0
      ? results.totalDistance / results.distanceSamples
      : 0;

  console.log(`\n--- ${description} ---`);
  console.log(`Overall beam damage: ${beamPct.toFixed(1)}%`);
  console.log(`Avg combat distance: ${avgDistance.toFixed(0)}m`);
  console.log('\nBeam damage by archetype:');
  for (const archetype of ARCHETYPES) {
    const data = results.archetypeBeam[archetype];
    const pct = data.total > 0 ? (data.beam / data.total) * 100 : 0;
    console.log(`  ${archetype.padEnd(12)}: ${pct.toFixed(1)}%`);
  }
  if (Object.keys(results.beamBreakdown).length > 0) {
    console.log('\nBeam weapon breakdown:');
    for (const [name, dmg] of Object.entries(results.beamBreakdown).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${name.padEnd(14)}: ${dmg.toFixed(0)}`);
    }
  }

  return { description, beamPct, avgDistance, results };
}

const tests = [];

// TEST 1: Baseline
console.log('\n=== TEST 1: BASELINE ===');
tests.push(runCombinedTest('BASELINE', () => {}));

// TEST 2: All changes combined
console.log('\n=== TEST 2: ALL CHANGES COMBINED ===');
console.log('- Red laser: 400→500m');
console.log('- Blue laser: 25→30 DPS');
console.log('- Striker: red→green laser');
console.log('- Defender: +green laser');
console.log('- Scout: +red laser');
console.log('- preferredCombatRange for all ships');

tests.push(
  runCombinedTest('ALL CHANGES', () => {
    // Range/DPS adjustments
    PRIMARY_WEAPONS['red laser'].range = 500;
    PRIMARY_WEAPONS['blue laser'].damage = 30;

    // Ship reassignments
    SHIP_ARCHETYPES.striker.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'greenLaser', size: 2 }, // was red laser
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ];

    SHIP_ARCHETYPES.defender.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'greenLaser', size: 2 }, // added
      { name: 'pulse', size: 1 },
    ];

    SHIP_ARCHETYPES.scout.primaryWeapons = [
      { name: 'pulse', size: 1 },
      { name: 'redLaser', size: 1 }, // added
    ];

    // preferredCombatRange values
    SHIP_ARCHETYPES.scout.preferredCombatRange = 400; // Fast, red laser
    SHIP_ARCHETYPES.interceptor.preferredCombatRange = 700; // Versatile
    SHIP_ARCHETYPES.striker.preferredCombatRange = 700; // Now has green laser
    SHIP_ARCHETYPES.bomber.preferredCombatRange = 500; // Missile boat
    SHIP_ARCHETYPES.defender.preferredCombatRange = 600; // Tanky, green laser
    SHIP_ARCHETYPES.raider.preferredCombatRange = 400; // Glass cannon
    SHIP_ARCHETYPES.sentinel.preferredCombatRange = 1000; // Long range
  }),
);

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log('COMBINED BEAM BALANCE SUMMARY');
console.log('='.repeat(70));
console.log('\n| Config | Beam % | Change | Avg Distance |');
console.log('|--------|--------|--------|--------------|');
const baseline = tests[0];
for (const t of tests) {
  const delta = t.beamPct - baseline.beamPct;
  console.log(
    `| ${t.description.padEnd(16)} | ${t.beamPct.toFixed(1).padStart(5)}% | ${delta >= 0 ? '+' : ''}${delta.toFixed(1).padStart(5)}% | ${t.avgDistance.toFixed(0).padStart(11)}m |`,
  );
}

console.log('\nTarget: ~20% beam damage (from ~11%)');
console.log(`\n${'='.repeat(70)}`);
