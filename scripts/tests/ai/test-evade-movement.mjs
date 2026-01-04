/**
 * Evade Effectiveness Test - Part 2: Movement & Skill
 *
 * Measures angular velocity impact and skill profile effects on evade.
 *
 * Tests:
 * 3. Perpendicular vs radial movement survival
 * 4. Evader survival vs shooter skill level
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

console.log(
  '\n=== EVADE EFFECTIVENESS ANALYSIS (Part 2: Movement & Skill) ===\n',
);

// Test 3: Angular velocity effect on aim error
console.log('--- Test 3: Angular Velocity Impact ---');
{
  const runs = 100;
  let perpDeaths = 0;
  let radialDeaths = 0;
  let perpSurvivalTime = 0;
  let radialSurvivalTime = 0;
  const facingPerp = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI / 2,
  );

  // Perpendicular movement test
  for (let run = 0; run < runs; run++) {
    const world = createWorld(run * 111);
    initCombatStats(world);
    const target = createAIShip(
      world,
      'scout',
      Faction.Player,
      new Vector3(0, 0, 0),
      facingPerp,
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
    const targetPhysics = getComponent(world, target, 'physics');
    const targetMaxSpeed = targetPhysics.maxSpeed;
    targetPhysics.currentSpeed = targetMaxSpeed;

    let ticksRun = 0;
    let died = false;
    for (let tick = 0; tick < 5 * TICK_RATE; tick++) {
      runFrame(world);
      ticksRun++;
      const physics = getComponent(world, target, 'physics');
      if (physics) physics.currentSpeed = targetMaxSpeed;
      if (!getComponent(world, target, 'transform')) {
        died = true;
        break;
      }
    }
    if (died) perpDeaths++;
    perpSurvivalTime += ticksRun / TICK_RATE;
  }

  // Radial movement test (target approaching shooter)
  for (let run = 0; run < runs; run++) {
    const world = createWorld(run * 222);
    initCombatStats(world);
    const target = createAIShip(
      world,
      'scout',
      Faction.Player,
      new Vector3(0, 0, -400),
      new Quaternion(),
      'regular',
    );
    createAIShip(
      world,
      'interceptor',
      Faction.Enemy,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    const targetPhysics = getComponent(world, target, 'physics');
    const targetMaxSpeed = targetPhysics.maxSpeed;
    targetPhysics.currentSpeed = targetMaxSpeed;

    let ticksRun = 0;
    let died = false;
    for (let tick = 0; tick < 5 * TICK_RATE; tick++) {
      runFrame(world);
      ticksRun++;
      const physics = getComponent(world, target, 'physics');
      if (physics) physics.currentSpeed = targetMaxSpeed;
      if (!getComponent(world, target, 'transform')) {
        died = true;
        break;
      }
    }
    if (died) radialDeaths++;
    radialSurvivalTime += ticksRun / TICK_RATE;
  }

  const perpAvg = perpSurvivalTime / runs;
  const radialAvg = radialSurvivalTime / runs;
  console.log(
    `Perpendicular: ${runs - perpDeaths}/${runs} survived (avg ${perpAvg.toFixed(1)}s)`,
  );
  console.log(
    `Radial: ${runs - radialDeaths}/${runs} survived (avg ${radialAvg.toFixed(1)}s)`,
  );
  if (radialAvg > 0) {
    console.log(
      `Improvement from perpendicular: ${(((perpAvg - radialAvg) / radialAvg) * 100).toFixed(0)}%`,
    );
  }
}

// Test 4: Profile comparison - how much does skill help track evading targets?
console.log('\n--- Test 4: Skill vs Evasion ---');
{
  const profiles = ['rookie', 'regular', 'veteran', 'ace'];
  const runs = 50;
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );

  console.log('Evader survival rate vs shooter skill (10s, 50 runs each):');
  for (const profile of profiles) {
    let deaths = 0;
    let totalSurvivalTime = 0;
    for (let run = 0; run < runs; run++) {
      const world = createWorld(run * 333 + profiles.indexOf(profile) * 1000);
      initCombatStats(world);
      const evader = createAIShip(
        world,
        'scout',
        Faction.Player,
        new Vector3(0, 0, 0),
        facingAway,
        'regular',
      );
      const shooter = createAIShip(
        world,
        'interceptor',
        Faction.Enemy,
        new Vector3(0, 0, 400),
        new Quaternion(),
        profile,
      );
      const evaderAI = getComponent(world, evader, 'aiControlled');
      evaderAI.state = AIState.Evade;
      evaderAI.target = shooter;

      let ticksRun = 0;
      let died = false;
      for (let tick = 0; tick < 10 * TICK_RATE; tick++) {
        runFrame(world);
        ticksRun++;
        if (!getComponent(world, evader, 'transform')) {
          died = true;
          break;
        }
      }
      if (died) deaths++;
      totalSurvivalTime += ticksRun / TICK_RATE;
    }
    const survivalRate = ((runs - deaths) / runs) * 100;
    console.log(
      `  ${profile.padEnd(8)}: ${survivalRate.toFixed(0)}% survived, avg ${(totalSurvivalTime / runs).toFixed(1)}s`,
    );
  }
}

console.log('\n=== PART 2 COMPLETE ===\n');
