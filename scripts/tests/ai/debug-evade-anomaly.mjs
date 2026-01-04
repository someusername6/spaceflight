/**
 * Debug test to understand why Veterans/Aces don't hit evading targets.
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { calculateFiringAngle } from '../../../src/systems/ai/ai-weapon-selection.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

console.log('\n=== DEBUG: EVADE ANOMALY ===\n');

const profiles = ['rookie', 'regular', 'veteran', 'ace'];

for (const profile of profiles) {
  console.log(`--- ${profile.toUpperCase()} shooter vs evading scout ---`);

  const world = createWorld(12345);
  initCombatStats(world);
  const facingAway = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );

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

  // Force evader into evade state
  const evaderAI = getComponent(world, evader, 'aiControlled');
  evaderAI.state = AIState.Evade;
  evaderAI.target = shooter;

  const shooterAI = getComponent(world, shooter, 'aiControlled');
  const shooterProfile = shooterAI.profile;
  console.log(
    `  minFiringAngle: ${shooterProfile.minFiringAngle}°, engageRange: ${shooterProfile.engageRange}m, breakOff: ${shooterProfile.breakOffRange}m`,
  );

  const firingAngles = [];
  const distances = [];
  const shooterStates = {};
  let shotsFired = 0;

  // Run 10 seconds of combat (same as original test)
  for (let tick = 0; tick < 10 * TICK_RATE; tick++) {
    runFrame(world);

    const evaderTransform = getComponent(world, evader, 'transform');
    const shooterTransform = getComponent(world, shooter, 'transform');
    if (!evaderTransform || !shooterTransform) break;

    // Calculate firing angle and distance from shooter to evader
    const angle = calculateFiringAngle(
      shooterTransform,
      evaderTransform.position,
    );
    firingAngles.push(angle);
    const dist = shooterTransform.position.distanceTo(evaderTransform.position);
    distances.push(dist);

    // Track shooter state
    const state = shooterAI.state;
    shooterStates[state] = (shooterStates[state] || 0) + 1;

    // Count shots and damage
    const stats = world.systemState.combatStats;
    const currentShots = Object.values(stats.shotsFired).reduce(
      (a, b) => a + b,
      0,
    );
    if (currentShots > shotsFired) {
      shotsFired = currentShots;
    }
  }

  // Check damage dealt
  const finalStats = world.systemState.combatStats;
  const totalDamage = Object.values(finalStats.damageDealt).reduce(
    (a, b) => a + b,
    0,
  );
  console.log(`  Total damage dealt: ${totalDamage.toFixed(0)}`);

  // Analyze angles
  const avgAngle =
    firingAngles.reduce((a, b) => a + b, 0) / firingAngles.length;
  const maxAngle = Math.max(...firingAngles);
  const minAngle = Math.min(...firingAngles);
  const anglesAboveThreshold = firingAngles.filter(
    (a) => a > shooterProfile.minFiringAngle,
  ).length;

  // Analyze distances
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  const maxDist = Math.max(...distances);
  const minDist = Math.min(...distances);

  console.log(
    `  Distance: min=${minDist.toFixed(0)}m, avg=${avgDist.toFixed(0)}m, max=${maxDist.toFixed(0)}m`,
  );
  console.log(
    `  Firing angle: min=${minAngle.toFixed(1)}°, avg=${avgAngle.toFixed(1)}°, max=${maxAngle.toFixed(1)}°`,
  );
  console.log(
    `  Frames above threshold: ${anglesAboveThreshold}/${firingAngles.length} (${((anglesAboveThreshold / firingAngles.length) * 100).toFixed(0)}%)`,
  );
  console.log(`  Shots fired: ${shotsFired}`);
  console.log(`  Shooter states:`, shooterStates);

  // Check evader state at end
  const evaderFinalAI = getComponent(world, evader, 'aiControlled');
  if (evaderFinalAI) {
    console.log(`  Evader final state: ${evaderFinalAI.state}`);
  }

  // Calculate typical projectile travel time at avg distance
  // Assuming ~500 m/s projectile speed (typical for most weapons)
  const avgTravelTime = avgDist / 500;
  // Scout max speed is ~180 m/s, with afterburner ~270 m/s
  const evaderLateralMove = avgTravelTime * 200; // Assume ~200 m/s effective speed
  console.log(
    `  Projectile travel: ${avgTravelTime.toFixed(2)}s, evader lateral move: ${evaderLateralMove.toFixed(0)}m`,
  );
  console.log('');
}

console.log('=== DEBUG COMPLETE ===\n');
