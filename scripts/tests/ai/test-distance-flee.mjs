/**
 * Distance-Flee Test - Validates kiting behavior for sniper-type ships.
 *
 * Tests that ships with fleeDistance:
 * 1. Enter EVADE when enemy closes within fleeDistance
 * 2. Return to ENGAGE when distance exceeds preferredCombatRange
 * 3. Maintain kiting distance over time
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

console.log('\n=== DISTANCE-FLEE BEHAVIOR TEST ===\n');

// Test 1: AI enters EVADE when enemy within fleeDistance
console.log('--- Test 1: EVADE Trigger at fleeDistance ---');
{
  const world = createWorld(12345);
  initCombatStats(world);

  // Sniper facing away from enemy, 500m apart (within fleeDistance of 600m)
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  const sniper = createAIShip(
    world,
    'sniper',
    Faction.Player,
    new Vector3(0, 0, 0),
    facingAway,
    'regular',
  );
  const chaser = createAIShip(
    world,
    'scout',
    Faction.Enemy,
    new Vector3(0, 0, 500),
    new Quaternion(),
    'regular',
  );

  const sniperAI = getComponent(world, sniper, 'aiControlled');
  sniperAI.state = AIState.Engage;
  sniperAI.target = chaser;

  // Verify fleeDistance is set
  console.log(`  Sniper fleeDistance: ${sniperAI.fleeDistance}`);
  console.log(
    `  Sniper preferredCombatRange: ${sniperAI.preferredCombatRange}`,
  );

  // Run one frame - should trigger EVADE
  runFrame(world);

  const newState = sniperAI.state;
  const passed = newState === AIState.Evade;
  console.log(`  Initial state: Engage`);
  console.log(`  After frame (500m < 600m flee): ${newState}`);
  console.log(`  Result: ${passed ? 'PASS' : 'FAIL'} (expected EVADE)`);
}

// Test 2: AI returns to ENGAGE when distance exceeds preferredCombatRange
console.log('\n--- Test 2: Return to ENGAGE at preferredCombatRange ---');
{
  const world = createWorld(23456);
  initCombatStats(world);

  // Sniper facing away, 1300m from enemy (beyond preferredCombatRange of 1200m)
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  const sniper = createAIShip(
    world,
    'sniper',
    Faction.Player,
    new Vector3(0, 0, 0),
    facingAway,
    'regular',
  );
  const enemy = createAIShip(
    world,
    'scout',
    Faction.Enemy,
    new Vector3(0, 0, 1300),
    new Quaternion(),
    'regular',
  );

  const sniperAI = getComponent(world, sniper, 'aiControlled');
  sniperAI.state = AIState.Evade;
  sniperAI.target = enemy;
  sniperAI.stateTimer = 1.0; // Some time elapsed

  // Run one frame - should return to ENGAGE
  runFrame(world);

  const newState = sniperAI.state;
  const passed = newState === AIState.Engage;
  console.log(`  Initial state: Evade`);
  console.log(`  Distance: 1300m (> 1200m * 0.95 = 1140m)`);
  console.log(`  After frame: ${newState}`);
  console.log(`  Result: ${passed ? 'PASS' : 'FAIL'} (expected ENGAGE)`);
}

// Test 3: Kiting behavior over time - sniper maintains distance
console.log('\n--- Test 3: Kiting Behavior Over Time ---');
{
  const world = createWorld(34567);
  initCombatStats(world);

  // Start at 800m - sniper should enter evade and flee
  const sniper = createAIShip(
    world,
    'sniper',
    Faction.Player,
    new Vector3(0, 0, 0),
    new Quaternion(),
    'regular',
  );
  const chaser = createAIShip(
    world,
    'scout',
    Faction.Enemy,
    new Vector3(0, 0, 800),
    new Quaternion(),
    'regular',
  );

  const sniperAI = getComponent(world, sniper, 'aiControlled');
  const chaserAI = getComponent(world, chaser, 'aiControlled');
  sniperAI.state = AIState.Engage;
  sniperAI.target = chaser;
  chaserAI.state = AIState.Pursue;
  chaserAI.target = sniper;

  const stateChanges = [];
  let lastState = sniperAI.state;
  let evadeCount = 0;
  let engageCount = 0;

  // Run for 20 seconds
  for (let tick = 0; tick < 20 * TICK_RATE; tick++) {
    runFrame(world);

    const sniperTransform = getComponent(world, sniper, 'transform');
    const chaserTransform = getComponent(world, chaser, 'transform');
    if (!sniperTransform || !chaserTransform) break;

    if (sniperAI.state !== lastState) {
      const distance = sniperTransform.position.distanceTo(
        chaserTransform.position,
      );
      stateChanges.push({
        tick,
        from: lastState,
        to: sniperAI.state,
        distance: Math.round(distance),
      });
      if (sniperAI.state === AIState.Evade) evadeCount++;
      if (sniperAI.state === AIState.Engage) engageCount++;
      lastState = sniperAI.state;
    }
  }

  console.log(`  State changes over 20s:`);
  for (const change of stateChanges.slice(0, 10)) {
    console.log(
      `    t=${(change.tick / TICK_RATE).toFixed(1)}s: ${change.from} -> ${change.to} @ ${change.distance}m`,
    );
  }
  if (stateChanges.length > 10) {
    console.log(`    ... and ${stateChanges.length - 10} more`);
  }
  console.log(`  EVADE count: ${evadeCount}, ENGAGE count: ${engageCount}`);

  const kiting = evadeCount > 0 && engageCount > 0;
  console.log(
    `  Result: ${kiting ? 'PASS' : 'FAIL'} (expected multiple state transitions)`,
  );
}

// Test 4: Non-sniper ships don't flee based on distance
console.log('\n--- Test 4: Normal Ships Ignore fleeDistance ---');
{
  const world = createWorld(45678);
  initCombatStats(world);

  // Interceptor at close range - should NOT flee (no fleeDistance)
  const interceptor = createAIShip(
    world,
    'interceptor',
    Faction.Player,
    new Vector3(0, 0, 0),
    new Quaternion(),
    'regular',
  );
  const enemy = createAIShip(
    world,
    'scout',
    Faction.Enemy,
    new Vector3(0, 0, 300),
    new Quaternion(),
    'regular',
  );

  const interceptorAI = getComponent(world, interceptor, 'aiControlled');
  interceptorAI.state = AIState.Engage;
  interceptorAI.target = enemy;

  console.log(`  Interceptor fleeDistance: ${interceptorAI.fleeDistance}`);

  // Run several frames
  for (let tick = 0; tick < 60; tick++) {
    runFrame(world);
  }

  // Check interceptor stays in combat state (not evading due to distance)
  const inCombat =
    interceptorAI.state === AIState.Engage ||
    interceptorAI.state === AIState.Pursue;
  console.log(`  State after 1s at 300m: ${interceptorAI.state}`);
  console.log(
    `  Result: ${inCombat ? 'PASS' : 'FAIL'} (expected combat state, not distance-flee)`,
  );
}

console.log('\n=== DISTANCE-FLEE TEST COMPLETE ===\n');
