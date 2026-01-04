/**
 * Beam Weapon Balance Testing
 *
 * Tests different beam configurations to find optimal balance.
 * Measures beam damage contribution with various changes.
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 30;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

const jitter = () => (Math.random() - 0.5) * 20;

console.log(`\n${'='.repeat(70)}`);
console.log('BEAM WEAPON BALANCE TESTING');
console.log('='.repeat(70));

// Store original values
const originalRedLaserRange = PRIMARY_WEAPONS['red laser'].range;
const originalBlueLaserDamage = PRIMARY_WEAPONS['blue laser'].damage;
const originalGreenLaserDamage = PRIMARY_WEAPONS['green laser'].damage;

function runBeamTest(description, setupFn, cleanupFn) {
  setupFn();

  const damageByType = { projectile: 0, beam: 0, missile: 0 };
  const beamBreakdown = {};

  // Test sentinel (beam-focused) vs interceptor
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 1000);
    initCombatStats(world);

    const shipA = createAIShip(
      world,
      'sentinel',
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const shipB = createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
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
    for (const dmg of Object.values(cs.damageDealt)) {
      damageByType.projectile += dmg;
    }
    for (const [name, dmg] of Object.entries(cs.beamDamage)) {
      damageByType.beam += dmg;
      beamBreakdown[name] = (beamBreakdown[name] || 0) + dmg;
    }
    for (const dmg of Object.values(cs.missileDamage || {})) {
      damageByType.missile += dmg;
    }
  }

  // Also test striker (has red laser) vs interceptor
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 2000);
    initCombatStats(world);

    const shipA = createAIShip(
      world,
      'striker',
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const shipB = createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
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
    for (const dmg of Object.values(cs.damageDealt)) {
      damageByType.projectile += dmg;
    }
    for (const [name, dmg] of Object.entries(cs.beamDamage)) {
      damageByType.beam += dmg;
      beamBreakdown[name] = (beamBreakdown[name] || 0) + dmg;
    }
    for (const dmg of Object.values(cs.missileDamage || {})) {
      damageByType.missile += dmg;
    }
  }

  cleanupFn();

  const total =
    damageByType.projectile + damageByType.beam + damageByType.missile;
  const beamPct = total > 0 ? (damageByType.beam / total) * 100 : 0;

  console.log(`\n--- ${description} ---`);
  console.log(`Beam damage: ${beamPct.toFixed(1)}% of total`);
  console.log('Beam breakdown:');
  for (const [name, dmg] of Object.entries(beamBreakdown).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${name}: ${dmg.toFixed(0)} total damage`);
  }

  return { beamPct, beamBreakdown, damageByType };
}

// TEST 1: Baseline (current values)
console.log('\n=== TEST 1: BASELINE (Current Values) ===');
console.log('Red laser: 60 DPS, 400m range');
console.log('Blue laser: 25 DPS, 1200m range');
console.log('Green laser: 40 DPS, 800m range');

const baseline = runBeamTest(
  'BASELINE',
  () => {},
  () => {},
);

// TEST 2: Increase red laser range to 600m
console.log('\n=== TEST 2: Red Laser Range 400→600m ===');
console.log(
  'Hypothesis: Red laser currently out of range at typical engagement',
);

const redRangeTest = runBeamTest(
  'RED LASER RANGE 600m',
  () => {
    PRIMARY_WEAPONS['red laser'].range = 600;
  },
  () => {
    PRIMARY_WEAPONS['red laser'].range = originalRedLaserRange;
  },
);

// TEST 3: Increase blue laser DPS from 25 to 40
console.log('\n=== TEST 3: Blue Laser DPS 25→40 ===');
console.log('Hypothesis: Blue laser too weak compared to projectiles');

const blueDpsTest = runBeamTest(
  'BLUE LASER DPS 40',
  () => {
    PRIMARY_WEAPONS['blue laser'].damage = 40;
  },
  () => {
    PRIMARY_WEAPONS['blue laser'].damage = originalBlueLaserDamage;
  },
);

// TEST 4: Combined: Red range + Blue DPS
console.log('\n=== TEST 4: Combined (Red Range + Blue DPS) ===');

const combinedTest = runBeamTest(
  'COMBINED CHANGES',
  () => {
    PRIMARY_WEAPONS['red laser'].range = 600;
    PRIMARY_WEAPONS['blue laser'].damage = 40;
  },
  () => {
    PRIMARY_WEAPONS['red laser'].range = originalRedLaserRange;
    PRIMARY_WEAPONS['blue laser'].damage = originalBlueLaserDamage;
  },
);

// TEST 5: More aggressive - Red range 700m, Blue DPS 45, Green DPS 50
console.log('\n=== TEST 5: Aggressive Beam Buff ===');
console.log('Red laser: 700m range');
console.log('Blue laser: 45 DPS');
console.log('Green laser: 50 DPS');

const aggressiveTest = runBeamTest(
  'AGGRESSIVE BEAM BUFF',
  () => {
    PRIMARY_WEAPONS['red laser'].range = 700;
    PRIMARY_WEAPONS['blue laser'].damage = 45;
    PRIMARY_WEAPONS['green laser'].damage = 50;
  },
  () => {
    PRIMARY_WEAPONS['red laser'].range = originalRedLaserRange;
    PRIMARY_WEAPONS['blue laser'].damage = originalBlueLaserDamage;
    PRIMARY_WEAPONS['green laser'].damage = originalGreenLaserDamage;
  },
);

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log('BEAM BALANCE SUMMARY');
console.log('='.repeat(70));
console.log('\n| Test | Beam % | Change |');
console.log('|------|--------|--------|');
console.log(`| Baseline | ${baseline.beamPct.toFixed(1)}% | - |`);
const redDelta = (redRangeTest.beamPct - baseline.beamPct).toFixed(1);
console.log(
  `| Red Range 600m | ${redRangeTest.beamPct.toFixed(1)}% | ${redDelta > 0 ? '+' : ''}${redDelta}% |`,
);
const blueDelta = (blueDpsTest.beamPct - baseline.beamPct).toFixed(1);
console.log(
  `| Blue DPS 40 | ${blueDpsTest.beamPct.toFixed(1)}% | ${blueDelta > 0 ? '+' : ''}${blueDelta}% |`,
);
const combDelta = (combinedTest.beamPct - baseline.beamPct).toFixed(1);
console.log(
  `| Combined | ${combinedTest.beamPct.toFixed(1)}% | ${combDelta > 0 ? '+' : ''}${combDelta}% |`,
);
const aggDelta = (aggressiveTest.beamPct - baseline.beamPct).toFixed(1);
console.log(
  `| Aggressive | ${aggressiveTest.beamPct.toFixed(1)}% | ${aggDelta > 0 ? '+' : ''}${aggDelta}% |`,
);

console.log('\nTarget: ~20-30% beam damage (currently at 11%)');
console.log(`\n${'='.repeat(70)}`);
