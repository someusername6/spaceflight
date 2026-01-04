/**
 * Sniper Damage Analysis
 *
 * Track whether snipers are actually hitting targets and dealing damage.
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

console.log('\n=== SNIPER DAMAGE ANALYSIS ===\n');

// Test 1: Sniper damage output at long range
console.log('--- Test 1: Sniper Damage at Long Range ---');
{
  const world = createWorld(12345);
  initCombatStats(world);

  // Sniper and scout at 1000m, both stationary initially
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
    new Vector3(0, 0, 1000),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  let scoutStartHP = 0;
  let scoutEndHP = 0;
  let sniperStartHP = 0;
  let sniperEndHP = 0;

  const scoutHealth = getComponent(world, scout, 'health');
  const scoutShields = getComponent(world, scout, 'shields');
  const sniperHealth = getComponent(world, sniper, 'health');
  const sniperShields = getComponent(world, sniper, 'shields');

  if (scoutHealth && scoutShields) {
    scoutStartHP = scoutHealth.current + scoutShields.current;
  }
  if (sniperHealth && sniperShields) {
    sniperStartHP = sniperHealth.current + sniperShields.current;
  }

  // Run for 10 seconds
  for (let tick = 0; tick < 10 * TICK_RATE; tick++) {
    runFrame(world);

    // Check if either died
    const st = getComponent(world, scout, 'transform');
    const snt = getComponent(world, sniper, 'transform');
    if (!st || !snt) break;
  }

  // Get end HP
  const scoutHealthEnd = getComponent(world, scout, 'health');
  const scoutShieldsEnd = getComponent(world, scout, 'shields');
  const sniperHealthEnd = getComponent(world, sniper, 'health');
  const sniperShieldsEnd = getComponent(world, sniper, 'shields');

  if (scoutHealthEnd && scoutShieldsEnd) {
    scoutEndHP = scoutHealthEnd.current + scoutShieldsEnd.current;
  }
  if (sniperHealthEnd && sniperShieldsEnd) {
    sniperEndHP = sniperHealthEnd.current + sniperShieldsEnd.current;
  }

  const scoutDamage = scoutStartHP - scoutEndHP;
  const sniperDamage = sniperStartHP - sniperEndHP;

  console.log(`Initial range: 1000m, duration: 10s`);
  console.log(
    `Scout took: ${scoutDamage.toFixed(0)} damage (${scoutStartHP.toFixed(0)} -> ${scoutEndHP.toFixed(0)})`,
  );
  console.log(
    `Sniper took: ${sniperDamage.toFixed(0)} damage (${sniperStartHP.toFixed(0)} -> ${sniperEndHP.toFixed(0)})`,
  );

  const combatStats = world.systemState.combatStats;
  console.log(`\nProjectile stats:`, combatStats.shotsFired);
  console.log(`Damage dealt:`, combatStats.damageDealt);
}

// Test 2: Compare DPS at different ranges (stationary targets)
console.log('\n--- Test 2: DPS Comparison (Fixed Range) ---');
{
  const ranges = [300, 600, 1000, 1500];
  const duration = 5; // seconds

  for (const range of ranges) {
    const world = createWorld(range * 1000);
    initCombatStats(world);

    const sniper = createAIShip(
      world,
      'sniper',
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    const target = createAIShip(
      world,
      'defender', // Tanky target that won't die quickly
      Faction.Enemy,
      new Vector3(0, 0, range),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    // Lock ships in place (override physics each frame)
    const sniperTransform = getComponent(world, sniper, 'transform');
    const targetTransform = getComponent(world, target, 'transform');
    const sniperPos = sniperTransform.position.clone();
    const targetPos = targetTransform.position.clone();

    // Get initial HP
    const targetHealth = getComponent(world, target, 'health');
    const targetShields = getComponent(world, target, 'shields');
    const startHP = targetHealth.current + targetShields.current;

    for (let tick = 0; tick < duration * TICK_RATE; tick++) {
      runFrame(world);

      // Lock positions
      sniperTransform.position.copy(sniperPos);
      targetTransform.position.copy(targetPos);
    }

    // Calculate damage dealt
    const endHP = targetHealth.current + targetShields.current;
    const damage = startHP - endHP;
    const dps = damage / duration;

    console.log(
      `  ${range}m: ${damage.toFixed(0)} damage in ${duration}s (${dps.toFixed(1)} DPS)`,
    );
  }
}

// Test 3: Scout weapons DPS for comparison
console.log('\n--- Test 3: Scout DPS for Comparison ---');
{
  const ranges = [300, 600];

  for (const range of ranges) {
    const world = createWorld(range * 2000);
    initCombatStats(world);

    const scout = createAIShip(
      world,
      'scout',
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    const target = createAIShip(
      world,
      'defender',
      Faction.Enemy,
      new Vector3(0, 0, range),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const scoutTransform = getComponent(world, scout, 'transform');
    const targetTransform = getComponent(world, target, 'transform');
    const scoutPos = scoutTransform.position.clone();
    const targetPos = targetTransform.position.clone();

    const targetHealth = getComponent(world, target, 'health');
    const targetShields = getComponent(world, target, 'shields');
    const startHP = targetHealth.current + targetShields.current;

    const duration = 5;
    for (let tick = 0; tick < duration * TICK_RATE; tick++) {
      runFrame(world);
      scoutTransform.position.copy(scoutPos);
      targetTransform.position.copy(targetPos);
    }

    const endHP = targetHealth.current + targetShields.current;
    const damage = startHP - endHP;
    const dps = damage / duration;

    console.log(
      `  Scout at ${range}m: ${damage.toFixed(0)} damage in ${duration}s (${dps.toFixed(1)} DPS)`,
    );
  }
}

// Test 4: Time-to-kill analysis
console.log('\n--- Test 4: Time-to-Kill (Stationary) ---');
{
  const matchups = [
    { attacker: 'sniper', defender: 'scout', range: 1000 },
    { attacker: 'scout', defender: 'sniper', range: 300 },
  ];

  for (const { attacker, defender, range } of matchups) {
    const world = createWorld(Math.random() * 10000);
    initCombatStats(world);

    const ship1 = createAIShip(
      world,
      attacker,
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    const ship2 = createAIShip(
      world,
      defender,
      Faction.Enemy,
      new Vector3(0, 0, range),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const t1 = getComponent(world, ship1, 'transform');
    const t2 = getComponent(world, ship2, 'transform');
    const p1 = t1.position.clone();
    const p2 = t2.position.clone();

    let ttk = -1;
    for (let tick = 0; tick < 60 * TICK_RATE; tick++) {
      runFrame(world);
      t1.position.copy(p1);
      t2.position.copy(p2);

      if (!getComponent(world, ship2, 'transform')) {
        ttk = tick / TICK_RATE;
        break;
      }
    }

    if (ttk >= 0) {
      console.log(
        `  ${attacker} kills ${defender} at ${range}m in ${ttk.toFixed(1)}s`,
      );
    } else {
      console.log(`  ${attacker} vs ${defender} at ${range}m: No kill in 60s`);
    }
  }
}

console.log('\n=== SNIPER DAMAGE ANALYSIS COMPLETE ===\n');
