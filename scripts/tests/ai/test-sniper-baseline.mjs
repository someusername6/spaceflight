/**
 * Sniper Baseline Analysis
 *
 * Systematic investigation of sniper performance.
 * Tests each aspect in isolation to identify root causes.
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { SHIP_CLASSES } from '../../../src/data/ships.ts';
import { getWeaponStats } from '../../../src/data/weapons.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('=== SNIPER BASELINE ANALYSIS ===\n');

// =============================================================================
// Part 1: Ship Stats Comparison
// =============================================================================
console.log('--- Part 1: Ship Stats Comparison ---\n');

const _sniperArchetype = SHIP_ARCHETYPES.sniper;
const _scoutArchetype = SHIP_ARCHETYPES.scout;
const _lancerArchetype = SHIP_ARCHETYPES.lancer;

// Get chassis stats
const interceptorClass = SHIP_CLASSES.interceptor;
const scoutClass = SHIP_CLASSES.scout;
const sentinelClass = SHIP_CLASSES.sentinel;

console.log('Chassis comparison:');
console.log(
  `  Scout:       speed=${scoutClass.maxSpeed}, turnRate=${scoutClass.turnRate}, hull=${scoutClass.hull}+${scoutClass.shields}`,
);
console.log(
  `  Interceptor: speed=${interceptorClass.maxSpeed}, turnRate=${interceptorClass.turnRate}, hull=${interceptorClass.hull}+${interceptorClass.shields}`,
);
console.log(
  `  Sentinel:    speed=${sentinelClass.maxSpeed}, turnRate=${sentinelClass.turnRate}, hull=${sentinelClass.hull}+${sentinelClass.shields}`,
);

console.log('\nSpeed differential:');
console.log(
  `  Scout vs Interceptor (sniper): +${scoutClass.maxSpeed - interceptorClass.maxSpeed} m/s`,
);
console.log(
  `  Scout vs Sentinel (lancer):    +${scoutClass.maxSpeed - sentinelClass.maxSpeed} m/s`,
);

// =============================================================================
// Part 2: Weapon Stats Analysis
// =============================================================================
console.log('\n--- Part 2: Weapon Stats Analysis ---\n');

const railgun = getWeaponStats('railgun');
const blueLaser = getWeaponStats('blueLaser');

console.log('Sniper weapons (railgun):');
console.log(`  Range: ${railgun.range}m`);
console.log(
  `  Damage: ${railgun.damage} x size 2 = ${railgun.damage * 2} per shot`,
);
console.log(
  `  Fire rate: ${railgun.fireRate}s (${(1 / railgun.fireRate).toFixed(1)} shots/sec)`,
);
console.log(
  `  DPS: ${((railgun.damage * 2) / railgun.fireRate).toFixed(0)} per gun`,
);

console.log('\nLancer weapons (blueLaser):');
if (blueLaser) {
  console.log(`  Range: ${blueLaser.range}m`);
  console.log(
    `  Damage: ${blueLaser.damage} x size 2 = ${blueLaser.damage * 2} per tick`,
  );
  console.log(`  Category: ${blueLaser.category} (sustained beam)`);
} else {
  console.log('  (blueLaser stats not found)');
}

// =============================================================================
// Part 3: Closing Time Analysis
// =============================================================================
console.log('\n--- Part 3: Closing Time Analysis ---\n');

const startDist = 1200;
const fleeDist = 600;
const scoutSpeed = scoutClass.maxSpeed;
const sniperSpeed = interceptorClass.maxSpeed;

// If both accelerate toward each other
const closingRate = scoutSpeed + sniperSpeed;
const timeToFlee = (startDist - fleeDist) / closingRate;
console.log('If both ships close at max speed:');
console.log(`  Closing rate: ${closingRate} m/s`);
console.log(
  `  Time until flee distance (${fleeDist}m): ${timeToFlee.toFixed(1)}s`,
);

// If sniper stationary
const timeIfSniperStationary = (startDist - fleeDist) / scoutSpeed;
console.log('If sniper stationary, scout at max speed:');
console.log(
  `  Time until flee distance: ${timeIfSniperStationary.toFixed(1)}s`,
);

// If sniper at half speed (current behavior)
const sniperCruise = sniperSpeed * 0.5;
const closingWithCruise = scoutSpeed + sniperCruise;
const timeWithCruise = (startDist - fleeDist) / closingWithCruise;
console.log('If sniper at 50% speed (current), scout at max:');
console.log(`  Closing rate: ${closingWithCruise} m/s`);
console.log(`  Time until flee distance: ${timeWithCruise.toFixed(1)}s`);

// Required time to kill scout
const scoutHP = scoutClass.hull + scoutClass.shields;
const railgunDPS = (railgun.damage * 2) / railgun.fireRate; // 2x size-2 railguns
const ttkScout = scoutHP / (railgunDPS * 2); // 2 railguns
console.log('\nTime to kill scout (if 100% hit):');
console.log(`  Scout HP: ${scoutHP}`);
console.log(`  Sniper DPS (2x railgun): ${railgunDPS * 2}`);
console.log(`  TTK: ${ttkScout.toFixed(1)}s`);

// =============================================================================
// Part 4: Engagement Window Analysis
// =============================================================================
console.log('\n--- Part 4: Engagement Window Analysis ---\n');

console.log('The core problem:');
console.log(
  `  Sniper needs ${ttkScout.toFixed(1)}s to kill scout (100% accuracy)`,
);
console.log(
  `  But only has ${timeWithCruise.toFixed(1)}s before forced to flee`,
);
console.log(
  `  Deficit: ${(ttkScout - timeWithCruise).toFixed(1)}s (not enough time!)`,
);

// What if sniper is completely stationary?
console.log('\nIf sniper stopped completely:');
console.log(`  Time until flee: ${timeIfSniperStationary.toFixed(1)}s`);
console.log(`  Margin: ${(timeIfSniperStationary - ttkScout).toFixed(1)}s`);

// =============================================================================
// Part 5: Lancer Comparison
// =============================================================================
console.log('\n--- Part 5: Why Lancer Works ---\n');

const lancerSpeed = sentinelClass.maxSpeed;
console.log('Lancer (sentinel chassis):');
console.log(`  Speed: ${lancerSpeed} m/s (vs scout ${scoutSpeed})`);
console.log(`  Speed deficit: ${scoutSpeed - lancerSpeed} m/s`);

// Lancer uses burst-disengage, not distance-flee
console.log('\nLancer behavior:');
console.log('  Uses burst-disengage (time-based), not distance-flee');
console.log('  Engages for 2s, then repositions');
console.log('  Blue laser is sustained damage, more forgiving of timing');

// =============================================================================
// Part 6: Real Combat Test
// =============================================================================
console.log('\n--- Part 6: Real Combat Stats ---\n');

function runCombatTest(attacker, defender, startDist, runs = 20) {
  let wins = 0;
  let totalDuration = 0;
  let totalEngageTime = 0;

  for (let i = 0; i < runs; i++) {
    const world = createWorld(i * 1000);
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
      new Vector3(0, 0, startDist),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      'regular',
    );

    const ai1 = getComponent(world, ship1, 'aiControlled');
    let engageFrames = 0;
    let duration = 0;

    for (let tick = 0; tick < 60 * TICK_RATE; tick++) {
      runFrame(world);
      duration = (tick + 1) / TICK_RATE;

      if (ai1 && ai1.state === AIState.Engage) {
        engageFrames++;
      }

      const t1 = getComponent(world, ship1, 'transform');
      const t2 = getComponent(world, ship2, 'transform');

      if (!t2) {
        wins++;
        break;
      }
      if (!t1) {
        break;
      }
    }

    totalDuration += duration;
    totalEngageTime += engageFrames / TICK_RATE;
  }

  return {
    winRate: (wins / runs) * 100,
    avgDuration: totalDuration / runs,
    avgEngageTime: totalEngageTime / runs,
    engagePercent: (totalEngageTime / totalDuration) * 100,
  };
}

const sniperVsScout = runCombatTest('sniper', 'scout', 1200);
const lancerVsScout = runCombatTest('lancer', 'scout', 1200);

console.log('At 1200m start distance:');
console.log(
  `  Sniper vs Scout: ${sniperVsScout.winRate.toFixed(0)}% win, ${sniperVsScout.avgEngageTime.toFixed(1)}s ENGAGE time (${sniperVsScout.engagePercent.toFixed(0)}%)`,
);
console.log(
  `  Lancer vs Scout: ${lancerVsScout.winRate.toFixed(0)}% win, ${lancerVsScout.avgEngageTime.toFixed(1)}s ENGAGE time (${lancerVsScout.engagePercent.toFixed(0)}%)`,
);

console.log('\n=== BASELINE ANALYSIS COMPLETE ===\n');
