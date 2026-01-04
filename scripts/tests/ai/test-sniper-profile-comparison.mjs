/**
 * Sniper Profile Comparison
 *
 * Test if better AI profiles improve sniper effectiveness.
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('=== SNIPER PROFILE COMPARISON ===\n');

// Show profile aim stats
console.log('Profile aim characteristics:');
for (const [name, profile] of Object.entries(AI_PROFILES)) {
  console.log(
    `  ${name.padEnd(8)}: baseError=${((profile.baseAimError * 180) / Math.PI).toFixed(1)}°, angularFactor=${profile.angularVelocityFactor}`,
  );
}
console.log();

function runDuelSeries(
  attackerType,
  defenderType,
  profile,
  startDistance,
  runs = 30,
) {
  let wins = 0;
  let totalDamage = 0;

  for (let i = 0; i < runs; i++) {
    const world = createWorld(i * 1000);
    initCombatStats(world);

    const ship1 = createAIShip(
      world,
      attackerType,
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      profile,
    );
    const ship2 = createAIShip(
      world,
      defenderType,
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

    const stats = world.systemState.combatStats;
    totalDamage += stats.damageDealt.Railgun || 0;
  }

  return {
    winRate: (wins / runs) * 100,
    avgDamage: totalDamage / runs,
  };
}

const profiles = ['rookie', 'regular', 'veteran', 'ace'];
const targets = ['bomber', 'striker'];

console.log('Sniper vs slow targets with different profiles:\n');

for (const target of targets) {
  console.log(`vs ${target}:`);
  console.log('Profile  | Win% | Avg Damage');
  console.log('---------|------|----------');

  for (const profile of profiles) {
    const result = runDuelSeries('sniper', target, profile, 1200, 30);
    console.log(
      `${profile.padEnd(8)} | ${result.winRate.toFixed(0).padStart(4)}% | ${result.avgDamage.toFixed(0).padStart(10)}`,
    );
  }
  console.log();
}

console.log('=== TEST COMPLETE ===\n');
