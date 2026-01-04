/**
 * AI Combat Behavior Diagnostic Tests - Part 1
 *
 * Verifies that flee, evade, pursuit, and range behaviors work in practice.
 * Tests: State transitions, escape viability, distance patterns
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { Faction } from '../../../src/components/faction.ts';
import {
  countEntities,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('\n=== AI COMBAT BEHAVIOR DIAGNOSTICS (Part 1) ===\n');

// Test 1: Do ships ever enter Evade/Regroup states?
console.log('--- Test 1: State Transition Tracking ---');
{
  const world = createWorld();
  initCombatStats(world);

  // Create two ships facing each other
  const facingPosZ = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  createAIShip(
    world,
    'interceptor',
    Faction.Player,
    new Vector3(0, 0, 0),
    facingPosZ,
    'regular',
  );
  createAIShip(
    world,
    'interceptor',
    Faction.Enemy,
    new Vector3(0, 0, 400),
    new Quaternion(),
    'regular',
  );

  const stateHistory = { A: {}, B: {} };
  let framesInEvade = 0;
  let framesInRegroup = 0;

  // Run 30 seconds of combat
  for (let i = 0; i < 30 * TICK_RATE; i++) {
    runFrame(world);

    // Track states
    for (const entity of queryEntities(world, ['aiControlled'])) {
      const ai = getComponent(world, entity, 'aiControlled');
      const faction = getComponent(world, entity, 'faction');
      const key = faction.faction === Faction.Player ? 'A' : 'B';
      stateHistory[key][ai.state] = (stateHistory[key][ai.state] || 0) + 1;

      if (ai.state === AIState.Evade) framesInEvade++;
      if (ai.state === AIState.Regroup) framesInRegroup++;
    }

    // Stop if one dies
    if (countEntities(world, ['aiControlled']) < 2) break;
  }

  console.log('Ship A states:', stateHistory.A);
  console.log('Ship B states:', stateHistory.B);
  console.log(
    `Total frames in Evade: ${framesInEvade} (${(framesInEvade / TICK_RATE).toFixed(1)}s)`,
  );
  console.log(
    `Total frames in Regroup: ${framesInRegroup} (${(framesInRegroup / TICK_RATE).toFixed(1)}s)`,
  );

  const evadeWorking = framesInEvade > 0 || framesInRegroup > 0;
  console.log(
    evadeWorking
      ? '✓ Evade/Regroup states ARE being used'
      : '✗ Evade/Regroup states NEVER triggered',
  );
}

// Test 2: Can a faster ship escape a slower one?
console.log('\n--- Test 2: Escape Viability (Fast vs Slow) ---');
{
  const world = createWorld();
  initCombatStats(world);

  // Scout (fast) vs Defender (slow), Scout starts damaged but survivable
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  const scout = createAIShip(
    world,
    'scout',
    Faction.Player,
    new Vector3(0, 0, 0),
    facingAway,
    'regular',
  );
  const defender = createAIShip(
    world,
    'defender',
    Faction.Enemy,
    new Vector3(0, 0, 200),
    new Quaternion(),
    'regular',
  );

  // Damage scout to trigger evade (15% shields = below 20% threshold)
  const scoutShields = getComponent(world, scout, 'shields');
  if (scoutShields) scoutShields.current = scoutShields.max * 0.15;

  const scoutPhysics = getComponent(world, scout, 'physics');
  const defenderPhysics = getComponent(world, defender, 'physics');
  console.log(
    `Scout maxSpeed: ${scoutPhysics.maxSpeed} (afterburn: ${scoutPhysics.maxSpeed * 1.5}), Defender maxSpeed: ${defenderPhysics.maxSpeed}`,
  );

  const initialDistance = 200;
  let maxDistance = 200;
  let finalDistance = 200;
  let scoutState = 'unknown';
  let scoutSurvived = true;
  let escapeFrame = -1;

  // Run 10 seconds
  for (let i = 0; i < 10 * TICK_RATE; i++) {
    runFrame(world);

    const scoutTransform = getComponent(world, scout, 'transform');
    const defenderTransform = getComponent(world, defender, 'transform');

    if (!scoutTransform || !defenderTransform) {
      scoutSurvived = false;
      break;
    }

    finalDistance = scoutTransform.position.distanceTo(
      defenderTransform.position,
    );
    if (finalDistance > maxDistance) {
      maxDistance = finalDistance;
      if (escapeFrame < 0) escapeFrame = i;
    }

    const scoutAI = getComponent(world, scout, 'aiControlled');
    if (scoutAI) scoutState = scoutAI.state;
  }

  console.log(
    `Initial distance: ${initialDistance}m, Max distance: ${maxDistance.toFixed(0)}m, Final: ${finalDistance.toFixed(0)}m`,
  );
  console.log(`Scout survived: ${scoutSurvived}, Final state: ${scoutState}`);
  if (escapeFrame > 0) {
    console.log(
      `Started gaining distance at frame ${escapeFrame} (${(escapeFrame / TICK_RATE).toFixed(1)}s)`,
    );
  }

  // Success = created significant distance (escape mechanics work)
  const escapedSuccessfully = maxDistance > initialDistance + 500;
  console.log(
    escapedSuccessfully
      ? '✓ Fast ship CAN escape slower pursuer (reached safe distance)'
      : '✗ Fast ship CANNOT escape effectively',
  );
  if (!scoutSurvived && escapedSuccessfully) {
    console.log('  Note: Scout died after re-engaging, not during escape');
  }
}

// Test 3: Distance tracking during combat (engagement patterns)
console.log('\n--- Test 3: Combat Distance Patterns ---');
{
  const world = createWorld();
  initCombatStats(world);

  const facingPosZ = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );
  const shipA = createAIShip(
    world,
    'striker',
    Faction.Player,
    new Vector3(0, 0, 0),
    facingPosZ,
    'veteran',
  );
  const shipB = createAIShip(
    world,
    'striker',
    Faction.Enemy,
    new Vector3(0, 0, 800),
    new Quaternion(),
    'veteran',
  );

  const distanceHistory = [];
  let minDistance = Infinity;
  let maxDistance = 0;

  // Run 30 seconds
  for (let i = 0; i < 30 * TICK_RATE; i++) {
    runFrame(world);

    const entities = [...queryEntities(world, ['aiControlled', 'transform'])];
    if (entities.length < 2) break;

    const transformA = getComponent(world, shipA, 'transform');
    const transformB = getComponent(world, shipB, 'transform');
    if (transformA && transformB) {
      const dist = transformA.position.distanceTo(transformB.position);
      distanceHistory.push(dist);
      minDistance = Math.min(minDistance, dist);
      maxDistance = Math.max(maxDistance, dist);
    }
  }

  // Analyze distance variance
  const avgDistance =
    distanceHistory.reduce((a, b) => a + b, 0) / distanceHistory.length;
  const variance =
    distanceHistory.reduce((sum, d) => sum + (d - avgDistance) ** 2, 0) /
    distanceHistory.length;
  const stdDev = Math.sqrt(variance);

  console.log(
    `Distance range: ${minDistance.toFixed(0)}m - ${maxDistance.toFixed(0)}m`,
  );
  console.log(
    `Average distance: ${avgDistance.toFixed(0)}m (σ=${stdDev.toFixed(0)}m)`,
  );

  // Count direction changes (approach vs retreat)
  let approaches = 0;
  let retreats = 0;
  for (let i = 1; i < distanceHistory.length; i++) {
    if (distanceHistory[i] < distanceHistory[i - 1] - 1) approaches++;
    if (distanceHistory[i] > distanceHistory[i - 1] + 1) retreats++;
  }

  console.log(`Approach frames: ${approaches}, Retreat frames: ${retreats}`);

  const hasRepositioning = retreats > 60; // At least 1 second of retreat
  console.log(
    hasRepositioning
      ? '✓ Combat includes repositioning/retreats'
      : '✗ Combat is pure approach (no repositioning)',
  );
}

console.log('\n=== PART 1 COMPLETE ===\n');
