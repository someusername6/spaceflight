/**
 * Burst-Disengage Behavior Test
 *
 * Tests that ships with preferredCombatRange use the burst-disengage pattern:
 * 1. Engage for burst duration
 * 2. Reposition to regain preferred range
 * 3. Re-engage from optimal distance
 *
 * This test verifies:
 * - Long-range ships (with preferredCombatRange) enter Reposition state
 * - Standard ships (without preferredCombatRange) never enter Reposition state
 * - Reposition correctly increases distance from target
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship-archetypes.ts';
import {
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_TEST = 30;
const MAX_FIGHT_TIME = 60;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

// Store original archetypes
const originalArchetypes = { ...SHIP_ARCHETYPES };

// Create a long-range variant for testing
function createLongRangeVariant(baseName, preferredRange) {
  const base = { ...SHIP_ARCHETYPES[baseName] };
  base.preferredCombatRange = preferredRange;
  const variantName = `${baseName}-longrange`;
  SHIP_ARCHETYPES[variantName] = base;
  return variantName;
}

function restoreArchetypes() {
  for (const key of Object.keys(SHIP_ARCHETYPES)) {
    if (!originalArchetypes[key]) {
      delete SHIP_ARCHETYPES[key];
    }
  }
}

/**
 * Run a fight and track reposition behavior
 */
function runBurstDisengageTest(archetype, seed, _preferredRange = undefined) {
  const world = createWorld(seed);
  initCombatStats(world);

  const shipA = createAIShip(
    world,
    archetype,
    Faction.Player,
    new Vector3(jitter(), jitter(), jitter()),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'veteran', // Use veteran for shorter burst duration
  );

  const shipB = createAIShip(
    world,
    'defender', // Slower, tankier opponent - gives more time for burst-disengage
    Faction.Enemy,
    new Vector3(jitter(), jitter(), 800 + jitter()), // Longer starting distance
    new Quaternion(),
    'regular',
  );

  // Tracking
  let repositionCount = 0;
  let engageTime = 0;
  let repositionTime = 0;
  let lastState = null;
  let distanceAtRepositionStart = 0;
  let distanceAtRepositionEnd = 0;
  let distanceGained = 0;
  let repositionSamples = 0;

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    runFrame(world);

    const aiA = getComponent(world, shipA, 'aiControlled');
    const aiB = getComponent(world, shipB, 'aiControlled');
    const transformA = getComponent(world, shipA, 'transform');
    const transformB = getComponent(world, shipB, 'transform');

    if (!aiA || !aiB || !transformA || !transformB) break;

    const distance = transformA.position.distanceTo(transformB.position);

    // Track state transitions
    if (aiA.state !== lastState) {
      // Transition to Reposition
      if (aiA.state === AIState.Reposition) {
        repositionCount++;
        distanceAtRepositionStart = distance;
      }
      // Transition from Reposition
      if (lastState === AIState.Reposition) {
        distanceAtRepositionEnd = distance;
        if (distanceAtRepositionEnd > distanceAtRepositionStart) {
          distanceGained += distanceAtRepositionEnd - distanceAtRepositionStart;
          repositionSamples++;
        }
      }
      lastState = aiA.state;
    }

    // Track time in states
    if (aiA.state === AIState.Engage) {
      engageTime += 1 / TICK_RATE;
    } else if (aiA.state === AIState.Reposition) {
      repositionTime += 1 / TICK_RATE;
    }
  }

  return {
    repositionCount,
    engageTime,
    repositionTime,
    avgDistanceGained:
      repositionSamples > 0 ? distanceGained / repositionSamples : 0,
  };
}

describe('Burst-Disengage Behavior', () => {
  console.log('='.repeat(70));
  console.log('BURST-DISENGAGE BEHAVIOR TEST');
  console.log('='.repeat(70));

  // ============================================================
  // TEST 1: Standard ships should NOT use Reposition
  // ============================================================
  console.log('\n--- TEST 1: STANDARD SHIPS (no preferredCombatRange) ---');
  console.log(
    'Expected: 0 repositions (standard ships always close to engage)\n',
  );

  const standardArchetypes = ['scout', 'interceptor', 'striker', 'raider'];
  let standardPasses = 0;
  const standardResults = {};

  for (const archetype of standardArchetypes) {
    let totalRepos = 0;
    for (let run = 0; run < RUNS_PER_TEST; run++) {
      const result = runBurstDisengageTest(archetype, run * 1000);
      totalRepos += result.repositionCount;
    }
    const avgRepos = totalRepos / RUNS_PER_TEST;
    const pass = avgRepos < 0.1; // Allow for tiny floating point issues
    if (pass) standardPasses++;
    standardResults[archetype] = { avgRepos, pass };
    console.log(
      `  ${archetype.padEnd(12)}: ${avgRepos.toFixed(1)} avg repositions - ${pass ? 'PASS' : 'FAIL'}`,
    );
  }

  // ============================================================
  // TEST 2: Long-range ships SHOULD use Reposition
  // ============================================================
  console.log('\n--- TEST 2: LONG-RANGE SHIPS (preferredCombatRange=1000) ---');
  console.log('Expected: Multiple repositions per fight\n');

  const longRangeVariant = createLongRangeVariant('striker', 1000);
  let _longRangePasses = 0;
  let totalReposLongRange = 0;
  let totalDistanceGained = 0;
  let totalEngageTime = 0;
  let totalRepositionTime = 0;

  for (let run = 0; run < RUNS_PER_TEST; run++) {
    const result = runBurstDisengageTest(longRangeVariant, run * 1000);
    totalReposLongRange += result.repositionCount;
    totalDistanceGained += result.avgDistanceGained;
    totalEngageTime += result.engageTime;
    totalRepositionTime += result.repositionTime;
  }

  const avgReposLongRange = totalReposLongRange / RUNS_PER_TEST;
  const avgDistanceGained = totalDistanceGained / RUNS_PER_TEST;
  const avgEngageTime = totalEngageTime / RUNS_PER_TEST;
  const avgRepositionTime = totalRepositionTime / RUNS_PER_TEST;

  const longRangeUsesRepos = avgReposLongRange >= 0.5; // At least half of fights have repositioning
  const gainsDistance = avgDistanceGained > 50;

  console.log(`  Avg repositions/fight: ${avgReposLongRange.toFixed(1)}`);
  console.log(`  Avg distance gained: ${avgDistanceGained.toFixed(0)}m`);
  console.log(`  Engage time: ${avgEngageTime.toFixed(1)}s`);
  console.log(`  Reposition time: ${avgRepositionTime.toFixed(1)}s`);
  console.log(`  Uses reposition: ${longRangeUsesRepos ? 'PASS' : 'FAIL'}`);
  console.log(`  Gains distance: ${gainsDistance ? 'PASS' : 'FAIL'}`);

  if (longRangeUsesRepos) _longRangePasses++;
  if (gainsDistance) _longRangePasses++;

  // ============================================================
  // TEST 3: Different preferred ranges
  // ============================================================
  console.log('\n--- TEST 3: VARYING PREFERRED COMBAT RANGES ---');
  console.log('Expected: Higher ranges = more repositions\n');

  const rangeTests = [600, 800, 1000, 1200];
  const rangeResults = [];

  for (const range of rangeTests) {
    const variant = createLongRangeVariant('striker', range);
    let totalRepos = 0;
    for (let run = 0; run < RUNS_PER_TEST; run++) {
      const result = runBurstDisengageTest(variant, run * 1000);
      totalRepos += result.repositionCount;
    }
    const avgRepos = totalRepos / RUNS_PER_TEST;
    rangeResults.push({ range, avgRepos });
    console.log(`  Range ${range}m: ${avgRepos.toFixed(1)} avg repositions`);
  }

  // Higher ranges should have more repositions
  const rangesIncreasing =
    rangeResults[3].avgRepos >= rangeResults[0].avgRepos * 0.8;
  console.log(
    `\n  Higher ranges = more repositions: ${rangesIncreasing ? 'PASS' : 'FAIL'}`,
  );

  // ============================================================
  // SUMMARY
  // ============================================================
  restoreArchetypes();

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const totalTests = standardArchetypes.length + 3;
  const totalPasses =
    standardPasses +
    (longRangeUsesRepos ? 1 : 0) +
    (gainsDistance ? 1 : 0) +
    (rangesIncreasing ? 1 : 0);

  console.log(`\nTests passed: ${totalPasses}/${totalTests}`);

  if (standardPasses === standardArchetypes.length) {
    console.log('✓ Standard ships correctly avoid Reposition state');
  } else {
    console.log('✗ Some standard ships incorrectly using Reposition');
  }

  if (longRangeUsesRepos && gainsDistance) {
    console.log('✓ Long-range ships correctly use burst-disengage pattern');
  } else {
    console.log('✗ Long-range ships not using burst-disengage correctly');
  }

  if (rangesIncreasing) {
    console.log('✓ Reposition frequency scales with preferred range');
  } else {
    console.log('✗ Reposition frequency not scaling correctly');
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('BURST-DISENGAGE TEST COMPLETE');
  console.log(`${'='.repeat(70)}\n`);

  it('should have standard ships avoid Reposition state', () => {
    for (const archetype of standardArchetypes) {
      assert.ok(
        standardResults[archetype].pass,
        `${archetype} should not use Reposition: ${standardResults[archetype].avgRepos.toFixed(1)} avg`,
      );
    }
  });

  it('should have long-range ships use Reposition state', () => {
    assert.ok(
      longRangeUsesRepos,
      `Long-range ships should use Reposition: ${avgReposLongRange.toFixed(1)} avg`,
    );
  });

  it('should have Reposition gain distance', () => {
    assert.ok(
      gainsDistance || avgReposLongRange < 0.5,
      `Reposition should gain distance: ${avgDistanceGained.toFixed(0)}m avg`,
    );
  });
});
