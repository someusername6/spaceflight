/**
 * Tests for angular velocity-based aim error.
 *
 * Verifies that:
 * 1. Angular velocity is calculated correctly from target position/velocity
 * 2. Perpendicular movement produces higher angular velocity than radial movement
 * 3. Effective aim error scales with angular velocity
 * 4. Different AI profiles have different angular sensitivity
 */

import * as THREE from 'three';
import {
  createAimError,
  updateEffectiveMaxError,
} from '../../../src/components/aim-error.ts';
import { createPRNG } from '../../../src/core/prng.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';
import { calculateAngularVelocity } from '../../../src/systems/aim-error.ts';
import {
  assert,
  assertApprox,
  summarize,
  test,
} from '../shared/test-utils.mjs';

console.log('\n=== AIM ERROR ANGULAR VELOCITY TESTS ===\n');

// Test 1: Angular velocity calculation - perpendicular movement
test('Angular velocity: perpendicular movement at 500m', () => {
  const shooterPos = new THREE.Vector3(0, 0, 0);
  const targetPos = new THREE.Vector3(500, 0, 0); // 500m to the right
  // Target moving perpendicular (along Z axis) at 100 m/s
  const targetVelocity = new THREE.Vector3(0, 0, 100);

  const angularVel = calculateAngularVelocity(
    shooterPos,
    targetPos,
    targetVelocity,
  );

  // Expected: 100 / 500 = 0.2 rad/s
  assertApprox(angularVel, 0.2, 0.001, `Expected 0.2 rad/s, got ${angularVel}`);
});

// Test 2: Angular velocity - radial movement (toward/away) should be ~0
test('Angular velocity: radial movement produces near-zero angular velocity', () => {
  const shooterPos = new THREE.Vector3(0, 0, 0);
  const targetPos = new THREE.Vector3(500, 0, 0);
  // Target moving directly toward shooter
  const targetVelocity = new THREE.Vector3(-100, 0, 0);

  const angularVel = calculateAngularVelocity(
    shooterPos,
    targetPos,
    targetVelocity,
  );

  // Expected: ~0 (radial movement doesn't change angle)
  assertApprox(angularVel, 0, 0.001, `Expected ~0 rad/s, got ${angularVel}`);
});

// Test 3: Angular velocity increases at closer range
test('Angular velocity: closer range increases angular velocity', () => {
  const shooterPos = new THREE.Vector3(0, 0, 0);
  const targetVelocity = new THREE.Vector3(0, 0, 100); // 100 m/s perpendicular

  // At 500m
  const target500 = new THREE.Vector3(500, 0, 0);
  const angularVel500 = calculateAngularVelocity(
    shooterPos,
    target500,
    targetVelocity,
  );

  // At 250m (half distance)
  const target250 = new THREE.Vector3(250, 0, 0);
  const angularVel250 = calculateAngularVelocity(
    shooterPos,
    target250,
    targetVelocity,
  );

  // Angular velocity should double when distance halves
  assertApprox(
    angularVel250,
    angularVel500 * 2,
    0.001,
    `Expected angular velocity to double at half distance`,
  );
});

// Test 4: AI profiles have correct angular factors
test('AI profiles: angular factors decrease with skill', () => {
  const rookie = AI_PROFILES.rookie;
  const regular = AI_PROFILES.regular;
  const veteran = AI_PROFILES.veteran;
  const ace = AI_PROFILES.ace;

  assert(
    rookie.aimErrorAngularFactor > regular.aimErrorAngularFactor,
    'Rookie should be more affected by angular velocity than Regular',
  );
  assert(
    regular.aimErrorAngularFactor > veteran.aimErrorAngularFactor,
    'Regular should be more affected by angular velocity than Veteran',
  );
  assert(
    veteran.aimErrorAngularFactor > ace.aimErrorAngularFactor,
    'Veteran should be more affected by angular velocity than Ace',
  );
});

// Test 5: Effective max error scales with angular velocity
test('Effective max error: scales with angular velocity', () => {
  const prng = createPRNG(12345);
  const aimError = createAimError(prng, AI_PROFILES.regular);

  // Base error should equal effective error initially
  assertApprox(
    aimError.effectiveMaxError,
    aimError.maxError,
    0.0001,
    'Initial effective max error should equal base max error',
  );

  // Update with angular velocity of 0.2 rad/s
  updateEffectiveMaxError(aimError, 0.2);

  // Expected: 0.05 + (0.5 * 0.2) = 0.05 + 0.1 = 0.15
  const expectedError = aimError.maxError + aimError.angularFactor * 0.2;
  assertApprox(
    aimError.effectiveMaxError,
    expectedError,
    0.0001,
    `Expected ${expectedError}, got ${aimError.effectiveMaxError}`,
  );
});

// Test 6: Different profiles have different sensitivity
test('Effective max error: varies by profile', () => {
  const prng = createPRNG(12345);
  const rookieError = createAimError(prng, AI_PROFILES.rookie);
  const aceError = createAimError(prng, AI_PROFILES.ace);

  // Apply same angular velocity to both
  const angularVel = 0.2;
  updateEffectiveMaxError(rookieError, angularVel);
  updateEffectiveMaxError(aceError, angularVel);

  // Rookie should have much higher effective error
  assert(
    rookieError.effectiveMaxError > aceError.effectiveMaxError,
    `Rookie effective error (${rookieError.effectiveMaxError}) should exceed Ace (${aceError.effectiveMaxError})`,
  );

  // The difference should be significant
  const errorRatio = rookieError.effectiveMaxError / aceError.effectiveMaxError;
  assert(
    errorRatio > 3,
    `Error ratio should be > 3x, got ${errorRatio.toFixed(2)}x`,
  );
});

// Test 7: Angular contribution is capped
test('Effective max error: angular contribution is capped at 0.3 rad', () => {
  const prng = createPRNG(12345);
  const aimError = createAimError(prng, AI_PROFILES.regular);

  // Apply extreme angular velocity
  updateEffectiveMaxError(aimError, 10.0); // Very high angular velocity

  // Cap is 0.3 rad additional error
  const maxPossible = aimError.maxError + 0.3;
  assert(
    aimError.effectiveMaxError <= maxPossible + 0.0001,
    `Effective error (${aimError.effectiveMaxError}) should be capped at ${maxPossible}`,
  );
});

// Test 8: Mixed movement (diagonal)
test('Angular velocity: diagonal movement', () => {
  const shooterPos = new THREE.Vector3(0, 0, 0);
  const targetPos = new THREE.Vector3(500, 0, 0);
  // Target moving at 45 degrees (half radial, half perpendicular)
  // 100 m/s at 45 degrees = ~70.7 m/s perpendicular component
  const targetVelocity = new THREE.Vector3(-70.71, 0, 70.71);

  const angularVel = calculateAngularVelocity(
    shooterPos,
    targetPos,
    targetVelocity,
  );

  // Expected: 70.71 / 500 = 0.1414 rad/s
  assertApprox(
    angularVel,
    0.1414,
    0.001,
    `Expected ~0.1414 rad/s, got ${angularVel}`,
  );
});

// Test 9: Vertical perpendicular movement
test('Angular velocity: vertical movement', () => {
  const shooterPos = new THREE.Vector3(0, 0, 0);
  const targetPos = new THREE.Vector3(500, 0, 0);
  // Target moving up (perpendicular in Y axis)
  const targetVelocity = new THREE.Vector3(0, 100, 0);

  const angularVel = calculateAngularVelocity(
    shooterPos,
    targetPos,
    targetVelocity,
  );

  // Expected: 100 / 500 = 0.2 rad/s
  assertApprox(angularVel, 0.2, 0.001, `Expected 0.2 rad/s, got ${angularVel}`);
});

// Test 10: Very close range edge case
test('Angular velocity: very close range returns 0', () => {
  const shooterPos = new THREE.Vector3(0, 0, 0);
  const targetPos = new THREE.Vector3(0.5, 0, 0); // Less than 1m
  const targetVelocity = new THREE.Vector3(0, 0, 100);

  const angularVel = calculateAngularVelocity(
    shooterPos,
    targetPos,
    targetVelocity,
  );

  // Should return 0 to avoid division issues
  assert(angularVel === 0, `Expected 0 for close range, got ${angularVel}`);
});

summarize();
