/**
 * AI Combat Behavior Diagnostic Tests - Part 2
 *
 * Tests: Shield thresholds, archetype speed comparison
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { Faction } from '../../../src/components/faction.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { initCombatStats, runFrame } from '../shared/combat-utils.mjs';

console.log('\n=== AI COMBAT BEHAVIOR DIAGNOSTICS (Part 2) ===\n');

// Test 4: Shield threshold triggers
console.log('--- Test 4: Shield Threshold Response ---');
{
  const world = createWorld();
  initCombatStats(world);

  const ship = createAIShip(
    world,
    'defender',
    Faction.Player,
    new Vector3(0, 0, 0),
    new Quaternion(),
    'regular',
  );
  createAIShip(
    world,
    'striker',
    Faction.Enemy,
    new Vector3(0, 0, 300),
    new Quaternion(),
    'regular',
  );

  const shields = getComponent(world, ship, 'shields');
  const ai = getComponent(world, ship, 'aiControlled');

  // Test evade threshold (20% for regular)
  shields.current = shields.max * 0.19; // Just below evade threshold
  runFrame(world);
  const stateAt19 = ai.state;

  shields.current = shields.max * 0.21; // Just above evade threshold
  runFrame(world);
  const stateAt21 = ai.state;

  console.log(`State at 19% shields: ${stateAt19}`);
  console.log(`State at 21% shields: ${stateAt21}`);

  // Test regroup threshold (10% for regular)
  shields.current = shields.max * 0.09;
  runFrame(world);
  const stateAt9 = ai.state;

  console.log(`State at 9% shields: ${stateAt9}`);

  const thresholdsWork =
    stateAt19 === AIState.Evade || stateAt9 === AIState.Regroup;
  console.log(
    thresholdsWork
      ? '✓ Shield thresholds trigger state changes'
      : '✗ Shield thresholds NOT triggering',
  );
}

// Test 5: Speed comparison across archetypes
console.log('\n--- Test 5: Archetype Speed Comparison ---');
{
  const archetypes = [
    'scout',
    'interceptor',
    'striker',
    'bomber',
    'defender',
    'raider',
    'sentinel',
  ];
  const speeds = {};
  for (const arch of archetypes) {
    const world = createWorld();
    initCombatStats(world);
    const ship = createAIShip(
      world,
      arch,
      Faction.Player,
      new Vector3(0, 0, 0),
      new Quaternion(),
      'regular',
    );
    speeds[arch] = getComponent(world, ship, 'physics').maxSpeed;
  }
  const sorted = Object.entries(speeds).sort((a, b) => b[1] - a[1]);
  console.log('Max speeds by archetype:');
  for (const [arch, speed] of sorted) {
    console.log(`  ${arch.padEnd(12)}: ${speed} m/s`);
  }
  const ratio = sorted[0][1] / sorted[sorted.length - 1][1];
  console.log(`Speed ratio (fastest/slowest): ${ratio.toFixed(2)}x`);
  console.log(
    ratio > 1.3
      ? '✓ Speed differences are meaningful (>1.3x)'
      : '✗ Speed differences too small for escape',
  );
}

console.log('\n=== PART 2 COMPLETE ===\n');
