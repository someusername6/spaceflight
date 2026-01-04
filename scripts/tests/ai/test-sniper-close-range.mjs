/**
 * Sniper Close Range Test
 *
 * Verify sniper is weak at close range (outclassed by brawlers).
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

console.log('=== SNIPER CLOSE RANGE TEST ===\n');

function runDuelSeries(attacker, defender, startDistance, runs = 100) {
  let wins = 0;

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

    for (let tick = 0; tick < 60 * TICK_RATE; tick++) {
      runFrame(world);

      const t1 = getComponent(world, ship1, 'transform');
      const t2 = getComponent(world, ship2, 'transform');

      if (!t2) {
        wins++;
        break;
      }
      if (!t1) break;
    }
  }

  return (wins / runs) * 100;
}

// Test sniper vs brawlers at close range (300m - inside flee distance)
console.log('Sniper vs brawlers at 300m (close range):\n');

const brawlers = ['scout', 'interceptor', 'striker', 'sentinel'];
console.log('Opponent     | Sniper Win%');
console.log('-------------|------------');

for (const brawler of brawlers) {
  const winRate = runDuelSeries('sniper', brawler, 300);
  console.log(`${brawler.padEnd(12)} | ${winRate.toFixed(0).padStart(10)}%`);
}

// Now test the reverse - other ships vs sniper at close range
console.log('\nOther ships vs sniper at 300m (close range):\n');
console.log('Attacker     | Win% vs Sniper');
console.log('-------------|---------------');

for (const brawler of brawlers) {
  const winRate = runDuelSeries(brawler, 'sniper', 300);
  console.log(`${brawler.padEnd(12)} | ${winRate.toFixed(0).padStart(13)}%`);
}

console.log('\n=== TEST COMPLETE ===\n');
