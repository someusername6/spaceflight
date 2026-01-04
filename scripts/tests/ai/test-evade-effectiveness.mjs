/**
 * Evade Effectiveness Test - Part 1: Survival Rates
 *
 * Measures how well the evade mechanic affects survival rates.
 *
 * Tests:
 * 1. Ships that trigger evade vs ships that stay in combat
 * 2. Hit rates against evading targets vs engaging targets
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

console.log('\n=== EVADE EFFECTIVENESS ANALYSIS (Part 1: Survival) ===\n');

// Test 1: Evade survival rate (damaged ship evading vs pursuing attacker)
console.log('--- Test 1: Evade Survival Rate ---');
{
  const runs = 100;
  let evadeSurvived = 0;
  let evadeEscaped = 0;
  let totalEvadeTime = 0;
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );

  for (let run = 0; run < runs; run++) {
    const world = createWorld(run * 123);
    initCombatStats(world);
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
      new Vector3(0, 0, 500),
      new Quaternion(),
      'regular',
    );

    const scoutShields = getComponent(world, scout, 'shields');
    if (scoutShields) scoutShields.current = scoutShields.max * 0.15;
    const scoutAI = getComponent(world, scout, 'aiControlled');
    scoutAI.state = AIState.Evade;
    scoutAI.target = defender;

    let survived = true;
    let escaped = false;
    let escapeTime = 0;
    for (let tick = 0; tick < 15 * TICK_RATE; tick++) {
      runFrame(world);
      const scoutTransform = getComponent(world, scout, 'transform');
      const defenderTransform = getComponent(world, defender, 'transform');
      if (!scoutTransform) {
        survived = false;
        break;
      }
      if (defenderTransform) {
        const dist = scoutTransform.position.distanceTo(
          defenderTransform.position,
        );
        if (dist > 1200 && !escaped) {
          escaped = true;
          escapeTime = tick / TICK_RATE;
        }
      }
    }
    if (survived) evadeSurvived++;
    if (escaped) {
      evadeEscaped++;
      totalEvadeTime += escapeTime;
    }
  }

  const avgTimeToEscape = evadeEscaped > 0 ? totalEvadeTime / evadeEscaped : 0;
  console.log(
    `Scout evading Defender (${runs} runs): ${evadeSurvived}% survived, ${evadeEscaped}% escaped, avg ${avgTimeToEscape.toFixed(1)}s`,
  );
}

// Test 2: Compare hit rates - evading vs pursuing target
console.log('\n--- Test 2: Hit Rate Comparison ---');
{
  const runs = 50;
  let evaderDeaths = 0;
  let pursuerDeaths = 0;
  let evaderSurvivalTime = 0;
  let pursuerSurvivalTime = 0;
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );

  // Test evading target
  for (let run = 0; run < runs; run++) {
    const world = createWorld(run * 456);
    initCombatStats(world);
    const evader = createAIShip(
      world,
      'interceptor',
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
      'regular',
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
    if (died) evaderDeaths++;
    evaderSurvivalTime += ticksRun / TICK_RATE;
  }

  // Test pursuing target (both ships engage normally)
  for (let run = 0; run < runs; run++) {
    const world = createWorld(run * 789);
    initCombatStats(world);
    const pursuer = createAIShip(
      world,
      'interceptor',
      Faction.Player,
      new Vector3(0, 0, 0),
      facingAway,
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

    let ticksRun = 0;
    let died = false;
    for (let tick = 0; tick < 10 * TICK_RATE; tick++) {
      runFrame(world);
      ticksRun++;
      if (!getComponent(world, pursuer, 'transform')) {
        died = true;
        break;
      }
    }
    if (died) pursuerDeaths++;
    pursuerSurvivalTime += ticksRun / TICK_RATE;
  }

  const evaderAvg = evaderSurvivalTime / runs;
  const pursuerAvg = pursuerSurvivalTime / runs;
  console.log(
    `Evading: ${runs - evaderDeaths}/${runs} survived (avg ${evaderAvg.toFixed(1)}s)`,
  );
  console.log(
    `Engaging: ${runs - pursuerDeaths}/${runs} survived (avg ${pursuerAvg.toFixed(1)}s)`,
  );
  console.log(
    `Survival improvement from evading: ${(((evaderAvg - pursuerAvg) / pursuerAvg) * 100).toFixed(0)}%`,
  );
}

console.log('\n=== PART 1 COMPLETE ===\n');
