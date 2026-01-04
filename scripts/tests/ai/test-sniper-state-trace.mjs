/**
 * Sniper State Trace - Detailed logging of state transitions
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

console.log('\n=== SNIPER STATE TRACE ===\n');

const world = createWorld(12345);
initCombatStats(world);

// Start at 1200m
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
  new Vector3(0, 0, 1200),
  new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
  'regular',
);

const sniperAI = getComponent(world, sniper, 'aiControlled');

console.log('Sniper config:');
console.log(`  fleeDistance: ${sniperAI.fleeDistance}`);
console.log(`  preferredCombatRange: ${sniperAI.preferredCombatRange}`);
console.log(`  profile.engageRange: ${sniperAI.profile.engageRange}`);
console.log(`  profile.breakOffRange: ${sniperAI.profile.breakOffRange}`);
console.log();

let lastState = null;
let _lastDistance = 0;

// Run for 15 seconds, log every state change
for (let tick = 0; tick < 15 * TICK_RATE; tick++) {
  runFrame(world);

  const sniperTransform = getComponent(world, sniper, 'transform');
  const scoutTransform = getComponent(world, scout, 'transform');
  if (!sniperTransform || !scoutTransform) {
    console.log(`t=${(tick / TICK_RATE).toFixed(2)}s: Ship died`);
    break;
  }

  const distance = sniperTransform.position.distanceTo(scoutTransform.position);

  if (sniperAI.state !== lastState) {
    console.log(
      `t=${(tick / TICK_RATE).toFixed(2)}s: ${lastState ?? 'START'} -> ${sniperAI.state} @ ${distance.toFixed(0)}m`,
    );
    lastState = sniperAI.state;
  }

  // Also log every second with current state
  if (tick % TICK_RATE === 0) {
    const sniperPhysics = getComponent(world, sniper, 'physics');
    const speed = sniperPhysics?.currentSpeed ?? 0;
    console.log(
      `  [${(tick / TICK_RATE).toFixed(0)}s] state=${sniperAI.state}, dist=${distance.toFixed(0)}m, speed=${speed.toFixed(0)}`,
    );
  }

  _lastDistance = distance;
}

console.log('\n=== TRACE COMPLETE ===\n');
