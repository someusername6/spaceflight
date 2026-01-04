/**
 * Sniper Diagnostic Test
 *
 * Detailed tracking of sniper behavior to understand why it's not effective.
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

console.log('=== SNIPER DIAGNOSTIC ===\n');

function runDiagnostic(attackerType, defenderType, startDistance) {
  const world = createWorld(12345); // Fixed seed for reproducibility
  initCombatStats(world);

  const ship1 = createAIShip(
    world,
    attackerType,
    Faction.Player,
    new Vector3(0, 0, 0),
    new Quaternion(),
    'regular',
  );
  const ship2 = createAIShip(
    world,
    defenderType,
    Faction.Enemy,
    new Vector3(0, 0, startDistance),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  // Track state time
  const stateTimes = {};
  let prevState = null;
  let lastShotTime = -999;
  let shotCount = 0;

  console.log(`${attackerType} vs ${defenderType} at ${startDistance}m:`);
  console.log('Time   | State     | Distance | Speed | Shots | Notes');
  console.log('-------|-----------|----------|-------|-------|------');

  for (let tick = 0; tick < 20 * TICK_RATE; tick++) {
    // 20 seconds max
    runFrame(world);
    const time = (tick + 1) / TICK_RATE;

    const ai1 = getComponent(world, ship1, 'aiControlled');
    const t1 = getComponent(world, ship1, 'transform');
    const p1 = getComponent(world, ship1, 'physics');
    const w1 = getComponent(world, ship1, 'primaryWeapons');
    const t2 = getComponent(world, ship2, 'transform');

    if (!t1 || !ai1) {
      console.log(`${time.toFixed(1).padStart(6)}s | SNIPER DEAD`);
      break;
    }
    if (!t2) {
      console.log(`${time.toFixed(1).padStart(6)}s | TARGET DEAD`);
      break;
    }

    const distance = t1.position.distanceTo(t2.position);
    const state = AIState[ai1.state] || String(ai1.state);

    // Track state time
    if (!stateTimes[state]) stateTimes[state] = 0;
    stateTimes[state] += 1 / TICK_RATE;

    // Check if shot was fired (weapon lastFireTime changed)
    const currentShotTime = w1?.lastFireTime ?? 0;
    if (currentShotTime > lastShotTime + 0.01) {
      shotCount++;
      lastShotTime = currentShotTime;
    }

    // Log every 0.5 seconds or on state change
    const shouldLog = tick % (TICK_RATE / 2) === 0 || state !== prevState;
    if (shouldLog) {
      let notes = '';
      if (state !== prevState)
        notes = `<-- ${prevState ? `from ${prevState}` : 'START'}`;

      console.log(
        `${time.toFixed(1).padStart(6)}s | ${state.padEnd(9)} | ${distance.toFixed(0).padStart(8)}m | ${p1.currentSpeed.toFixed(0).padStart(5)} | ${String(shotCount).padStart(5)} | ${notes}`,
      );
    }

    prevState = state;
  }

  console.log('\nState time summary:');
  for (const [state, time] of Object.entries(stateTimes)) {
    console.log(`  ${state}: ${time.toFixed(1)}s`);
  }

  const stats = world.systemState.combatStats;
  console.log(`\nDamage dealt: Railgun=${stats.damageDealt.Railgun || 0}`);
  console.log();
}

// Test vs striker (the problematic case)
runDiagnostic('sniper', 'striker', 1200);

// Test vs bomber (should be easier)
runDiagnostic('sniper', 'bomber', 1200);

console.log('=== DIAGNOSTIC COMPLETE ===\n');
