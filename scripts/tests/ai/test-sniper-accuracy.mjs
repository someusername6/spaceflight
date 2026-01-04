/**
 * Sniper Accuracy Analysis
 *
 * Test if railgun projectiles are being fired and hitting.
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('=== SNIPER ACCURACY ANALYSIS ===\n');

// Run a fight and track projectile stats
const world = createWorld(12345);
initCombatStats(world);

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

const sniperAI = getComponent(world, sniper, 'aiControlled');

// Get initial HP
const scoutHealth = getComponent(world, scout, 'health');
const scoutShields = getComponent(world, scout, 'shields');
const initialHP = (scoutHealth?.current ?? 0) + (scoutShields?.current ?? 0);

console.log(`Initial scout HP: ${initialHP}`);
console.log(`Starting distance: 1000m`);
console.log();

let totalEngageTime = 0;
const _railgunShots = 0;
let lastShotCount = 0;

// Run for 15 seconds
for (let tick = 0; tick < 15 * TICK_RATE; tick++) {
  runFrame(world);

  const t1 = getComponent(world, sniper, 'transform');
  const t2 = getComponent(world, scout, 'transform');

  if (!t2) {
    console.log(`Scout died at t=${(tick / TICK_RATE).toFixed(1)}s`);
    break;
  }
  if (!t1) {
    console.log(`Sniper died at t=${(tick / TICK_RATE).toFixed(1)}s`);
    break;
  }

  if (sniperAI.state === AIState.Engage) {
    totalEngageTime += 1 / TICK_RATE;
  }

  // Check shot counts
  const stats = world.systemState.combatStats;
  const currentShots = stats.shotsFired.Railgun || 0;
  if (currentShots > lastShotCount) {
    const distance = t1.position.distanceTo(t2.position);
    console.log(
      `t=${(tick / TICK_RATE).toFixed(1)}s: Railgun fired @ ${distance.toFixed(0)}m (state=${sniperAI.state})`,
    );
    lastShotCount = currentShots;
  }
}

// Get final stats
const stats = world.systemState.combatStats;
console.log('\n--- Final Stats ---');
console.log('Shots fired:', stats.shotsFired);
console.log('Damage dealt:', stats.damageDealt);

// Check final HP
const finalHealth = getComponent(world, scout, 'health');
const finalShields = getComponent(world, scout, 'shields');
if (finalHealth && finalShields) {
  const finalHP = finalHealth.current + finalShields.current;
  const damageDealt = initialHP - finalHP;
  console.log(`\nScout HP: ${initialHP} -> ${finalHP} (${damageDealt} damage)`);
}

console.log(`\nTotal ENGAGE time: ${totalEngageTime.toFixed(1)}s`);
console.log(`Railgun shots: ${stats.shotsFired.Railgun || 0}`);
console.log(
  `Expected shots (1/sec per gun, 2 guns): ${Math.floor(totalEngageTime * 2)}`,
);

console.log('\n=== ANALYSIS COMPLETE ===\n');
