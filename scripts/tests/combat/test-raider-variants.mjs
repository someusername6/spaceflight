/**
 * Raider Variant Testing
 *
 * Tests different raider configurations to find optimal "glass cannon alpha" balance.
 * Current issue: 66% missile-dependent, should be more gun-focused.
 *
 * Variants:
 * 1. Baseline (current)
 * 2. Reduced missiles (2+2 instead of 4+4)
 * 3. Railgun alpha (replace rockets with railgun)
 * 4. Bigger primaries (plasma size 3, autocannon size 3)
 * 5. Red laser burst (add red laser for close-range burst)
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 40;
const MAX_FIGHT_TIME = 45;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

const jitter = () => (Math.random() - 0.5) * 20;

console.log(`\n${'='.repeat(70)}`);
console.log('RAIDER VARIANT TESTING');
console.log('='.repeat(70));
console.log('Goal: "Glass cannon alpha" - high burst, gun-focused, fast kills');

// Store original raider config
const originalRaider = JSON.parse(JSON.stringify(SHIP_ARCHETYPES.raider));

function runRaiderTest(description, modifyFn) {
  // Apply modifications
  modifyFn();

  const results = {
    wins: 0,
    losses: 0,
    avgTTK: 0,
    damageByType: { projectile: 0, beam: 0, missile: 0 },
  };

  let totalTime = 0;
  let completedFights = 0;

  // Test raider vs interceptor (fair matchup)
  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const world = createWorld(run * 1000);
    initCombatStats(world);

    const raider = createAIShip(
      world,
      'raider',
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const enemy = createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
      new Quaternion(),
      'regular',
    );

    let ticks = 0;
    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);
      ticks++;
      const raiderAlive = !!getComponent(world, raider, 'health');
      const enemyAlive = !!getComponent(world, enemy, 'health');
      if (!raiderAlive || !enemyAlive) {
        if (!enemyAlive && raiderAlive) results.wins++;
        else if (!raiderAlive) results.losses++;
        totalTime += ticks / TICK_RATE;
        completedFights++;
        break;
      }
    }

    const cs = world.systemState.combatStats;
    for (const dmg of Object.values(cs.damageDealt)) {
      results.damageByType.projectile += dmg;
    }
    for (const dmg of Object.values(cs.beamDamage)) {
      results.damageByType.beam += dmg;
    }
    for (const dmg of Object.values(cs.missileDamage || {})) {
      results.damageByType.missile += dmg;
    }
  }

  // Restore original config
  Object.assign(SHIP_ARCHETYPES.raider, originalRaider);

  results.avgTTK = completedFights > 0 ? totalTime / completedFights : 0;
  const totalDmg =
    results.damageByType.projectile +
    results.damageByType.beam +
    results.damageByType.missile;
  const projPct =
    totalDmg > 0 ? (results.damageByType.projectile / totalDmg) * 100 : 0;
  const beamPct =
    totalDmg > 0 ? (results.damageByType.beam / totalDmg) * 100 : 0;
  const missilePct =
    totalDmg > 0 ? (results.damageByType.missile / totalDmg) * 100 : 0;

  console.log(`\n--- ${description} ---`);
  console.log(
    `Win rate: ${((results.wins / RUNS_PER_TEST) * 100).toFixed(0)}% | Avg TTK: ${results.avgTTK.toFixed(1)}s`,
  );
  console.log(
    `Damage mix: Projectile ${projPct.toFixed(0)}%, Beam ${beamPct.toFixed(0)}%, Missile ${missilePct.toFixed(0)}%`,
  );

  return {
    description,
    winRate: (results.wins / RUNS_PER_TEST) * 100,
    avgTTK: results.avgTTK,
    projPct,
    beamPct,
    missilePct,
  };
}

const tests = [];

// TEST 1: Baseline
console.log('\n=== TEST 1: BASELINE (Current Raider) ===');
console.log('Primary: plasma(2), autocannon(2), pulse(1), pulse(1)');
console.log('Secondary: dart(4), rocket(4), decoy(4)');
tests.push(
  runRaiderTest('BASELINE', () => {
    // No changes
  }),
);

// TEST 2: Reduced missiles
console.log('\n=== TEST 2: REDUCED MISSILES ===');
console.log('Secondary: dart(2), rocket(2), decoy(4)');
tests.push(
  runRaiderTest('REDUCED MISSILES', () => {
    SHIP_ARCHETYPES.raider.secondaryWeapons = [
      { name: 'dart', count: 2, size: 1 },
      { name: 'rocket', count: 2, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ];
  }),
);

// TEST 3: Railgun alpha
console.log('\n=== TEST 3: RAILGUN ALPHA ===');
console.log('Primary: plasma(2), autocannon(2), railgun(2)');
console.log('Secondary: dart(2), decoy(4)');
tests.push(
  runRaiderTest('RAILGUN ALPHA', () => {
    SHIP_ARCHETYPES.raider.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'railgun', size: 2 },
    ];
    SHIP_ARCHETYPES.raider.secondaryWeapons = [
      { name: 'dart', count: 2, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ];
  }),
);

// TEST 4: Bigger primaries
console.log('\n=== TEST 4: BIGGER PRIMARIES ===');
console.log('Primary: plasma(3), autocannon(3), pulse(2)');
console.log('Secondary: dart(2), rocket(2), decoy(4)');
tests.push(
  runRaiderTest('BIGGER PRIMARIES', () => {
    SHIP_ARCHETYPES.raider.primaryWeapons = [
      { name: 'plasma', size: 3 },
      { name: 'autocannon', size: 3 },
      { name: 'pulse', size: 2 },
    ];
    SHIP_ARCHETYPES.raider.secondaryWeapons = [
      { name: 'dart', count: 2, size: 1 },
      { name: 'rocket', count: 2, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ];
  }),
);

// TEST 5: Red laser burst
console.log('\n=== TEST 5: RED LASER BURST ===');
console.log('Primary: plasma(2), autocannon(2), redLaser(2)');
console.log('Secondary: dart(2), rocket(2), decoy(4)');
tests.push(
  runRaiderTest('RED LASER BURST', () => {
    SHIP_ARCHETYPES.raider.primaryWeapons = [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'redLaser', size: 2 },
    ];
    SHIP_ARCHETYPES.raider.secondaryWeapons = [
      { name: 'dart', count: 2, size: 1 },
      { name: 'rocket', count: 2, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ];
  }),
);

// TEST 6: All guns, no missiles
console.log('\n=== TEST 6: ALL GUNS ===');
console.log('Primary: plasma(3), autocannon(3), pulse(2), pulse(2)');
console.log('Secondary: decoy(6) only');
tests.push(
  runRaiderTest('ALL GUNS', () => {
    SHIP_ARCHETYPES.raider.primaryWeapons = [
      { name: 'plasma', size: 3 },
      { name: 'autocannon', size: 3 },
      { name: 'pulse', size: 2 },
      { name: 'pulse', size: 2 },
    ];
    SHIP_ARCHETYPES.raider.secondaryWeapons = [
      { name: 'decoy', count: 6, size: 1 },
    ];
  }),
);

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log('RAIDER VARIANT SUMMARY');
console.log('='.repeat(70));
console.log('\n| Variant | Win% | TTK | Proj% | Beam% | Missile% |');
console.log('|---------|------|-----|-------|-------|----------|');
for (const t of tests) {
  console.log(
    `| ${t.description.padEnd(18)} | ${t.winRate.toFixed(0).padStart(3)}% | ${t.avgTTK.toFixed(1).padStart(4)}s | ${t.projPct.toFixed(0).padStart(4)}% | ${t.beamPct.toFixed(0).padStart(4)}% | ${t.missilePct.toFixed(0).padStart(7)}% |`,
  );
}

console.log('\nRecommendation criteria:');
console.log('- Glass cannon: Should win fast (low TTK) or die fast');
console.log('- Alpha strike: High burst, decisive engagements');
console.log('- Gun-focused: Missile% should be <50%');
console.log(`\n${'='.repeat(70)}`);
