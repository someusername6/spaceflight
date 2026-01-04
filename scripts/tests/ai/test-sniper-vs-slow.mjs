/**
 * Sniper vs Slow Targets
 *
 * Test if railgun is effective against slower ships where
 * lead calculation is more accurate.
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { SHIP_CLASSES } from '../../../src/data/ships.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('=== SNIPER VS SLOW TARGETS ===\n');

// Show target speeds
console.log('Target speeds:');
console.log(`  Scout:     ${SHIP_CLASSES.scout.maxSpeed} m/s (fast)`);
console.log(
  `  Raider:    ${SHIP_CLASSES.raider.maxSpeed} m/s (sniper chassis)`,
);
console.log(`  Interceptor: ${SHIP_CLASSES.interceptor.maxSpeed} m/s`);
console.log(`  Sentinel:  ${SHIP_CLASSES.sentinel.maxSpeed} m/s`);
console.log(`  Defender:  ${SHIP_CLASSES.defender.maxSpeed} m/s`);
console.log(`  Bomber:    ${SHIP_CLASSES.bomber.maxSpeed} m/s (slow)`);
console.log();

function runDuelSeries(attacker, defender, startDistance, runs = 200) {
  let wins = 0;
  let totalDuration = 0;
  let totalEngageTime = 0;
  let totalDamageDealt = 0;

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
      new Vector3(0, 0, startDistance),
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

    // Get damage stats
    const stats = world.systemState.combatStats;
    const railgunDmg = stats.damageDealt.Railgun || 0;
    totalDamageDealt += railgunDmg;
  }

  return {
    winRate: (wins / runs) * 100,
    avgDuration: totalDuration / runs,
    avgEngageTime: totalEngageTime / runs,
    avgDamage: totalDamageDealt / runs,
  };
}

// Test against each target type
const targets = [
  'scout',
  'interceptor',
  'striker',
  'sentinel',
  'defender',
  'bomber',
];

console.log('Sniper win rate at 900m vs different targets:\n');
console.log('Target       | Speed | Win% | Engage | Railgun Dmg');
console.log('-------------|-------|------|--------|------------');

for (const target of targets) {
  const speed = SHIP_CLASSES[target.split('-')[0]]?.maxSpeed ?? '?';
  const result = runDuelSeries('sniper', target, 900);

  console.log(
    `${target.padEnd(12)} | ${String(speed).padStart(5)} | ${result.winRate.toFixed(0).padStart(4)}% | ${result.avgEngageTime.toFixed(1).padStart(6)}s | ${result.avgDamage.toFixed(0).padStart(10)}`,
  );
}

console.log('\n=== TEST COMPLETE ===\n');
