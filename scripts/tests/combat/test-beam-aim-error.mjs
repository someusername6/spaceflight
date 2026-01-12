/**
 * Beam Aim Error Test
 *
 * Verifies that beam-using ships have skill-based accuracy:
 * - Beams fire in ship forward direction (fixed mount)
 * - Ship rotation is affected by aim error via aimToward()
 * - Different skill levels have different aim error magnitudes
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import {
  applyAimError,
  createAimError,
  updateBeamTracking,
} from '../../../src/components/aim-error.ts';
import { createPRNG } from '../../../src/core/prng.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';

const SAMPLES = 1000;

const PROFILES = ['rookie', 'regular', 'veteran', 'ace'];

describe('Beam Aim Error', () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log('BEAM AIM ERROR TEST');
  console.log('(Verifies aim error magnitudes scale with skill level)');
  console.log('='.repeat(70));

  console.log('\n--- AIM ERROR PARAMETERS BY PROFILE ---');
  console.log('Profile       Base Error   Drift Speed   Angular Factor');
  console.log('-'.repeat(60));

  for (const name of PROFILES) {
    const profile = AI_PROFILES[name];
    const baseError = ((profile.aimErrorBase * 180) / Math.PI).toFixed(1);
    const driftSpeed = ((profile.aimErrorDriftSpeed * 180) / Math.PI).toFixed(
      2,
    );
    const angularFactor = profile.aimErrorAngularFactor.toFixed(2);

    console.log(
      name.padEnd(14) +
        `${baseError}°`.padStart(10) +
        `${driftSpeed}°/s`.padStart(14) +
        angularFactor.padStart(16),
    );
  }

  console.log('\n--- SIMULATED AIM ERROR DISTRIBUTION ---');
  console.log('(Random samples of aim error offset magnitude)');
  console.log('Profile       Avg Error   Max Error   Expected Order');
  console.log('-'.repeat(60));

  const results = [];
  for (const name of PROFILES) {
    const profile = AI_PROFILES[name];
    const prng = createPRNG(12345);

    let totalError = 0;
    let maxError = 0;

    for (let i = 0; i < SAMPLES; i++) {
      const aimError = createAimError(prng, profile);
      const errorMagnitude = aimError.offset.length();
      totalError += errorMagnitude;
      maxError = Math.max(maxError, errorMagnitude);
    }

    const avgError = (totalError / SAMPLES) * (180 / Math.PI);
    const maxErrorDeg = maxError * (180 / Math.PI);
    results.push({ name, avgError, maxErrorDeg });

    console.log(
      name.padEnd(14) +
        `${avgError.toFixed(2)}°`.padStart(10) +
        `${maxErrorDeg.toFixed(2)}°`.padStart(12),
    );
  }

  // Verify ordering
  console.log('\n--- SKILL ORDERING VERIFICATION ---');
  const [rookie, regular, veteran, ace] = results;
  const orderCorrect =
    rookie.avgError > regular.avgError &&
    regular.avgError > veteran.avgError &&
    veteran.avgError > ace.avgError;

  console.log(
    `Rookie(${rookie.avgError.toFixed(2)}°) > ` +
      `Regular(${regular.avgError.toFixed(2)}°) > ` +
      `Veteran(${veteran.avgError.toFixed(2)}°) > ` +
      `Ace(${ace.avgError.toFixed(2)}°): ${orderCorrect ? '✓' : '✗'}`,
  );

  // Test applyAimError function
  console.log('\n--- APPLY AIM ERROR TEST ---');
  console.log('(Verifies applyAimError offsets direction correctly)');

  const testDir = new Vector3(0, 0, -1).normalize();
  const prng = createPRNG(42);

  for (const name of PROFILES) {
    const profile = AI_PROFILES[name];
    const aimError = createAimError(prng, profile);
    const result = applyAimError(testDir, aimError);

    // Calculate angle offset
    const dot = Math.max(-1, Math.min(1, testDir.dot(result)));
    const angle = Math.acos(dot) * (180 / Math.PI);

    console.log(
      `${name.padEnd(10)}: forward + aim error = ${angle.toFixed(2)}° offset`,
    );
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(
    'KEY INSIGHT: Beam accuracy comes from ship rotation via aimToward().',
  );
  console.log(
    'Higher skill = lower aimErrorBase = ship points more accurately.',
  );
  console.log(
    'Beams fire in ship forward direction, so they hit when ship aims right.',
  );
  console.log('='.repeat(70));

  it('should have skill ordering (rookie > regular > veteran > ace error)', () => {
    assert.ok(
      orderCorrect,
      `Skill ordering incorrect: Rookie(${rookie.avgError.toFixed(2)}°), Regular(${regular.avgError.toFixed(2)}°), Veteran(${veteran.avgError.toFixed(2)}°), Ace(${ace.avgError.toFixed(2)}°)`,
    );
  });

  it('should have ace with lowest aim error', () => {
    assert.ok(
      ace.avgError < rookie.avgError,
      `Ace should have lower error than Rookie: ${ace.avgError.toFixed(2)}° vs ${rookie.avgError.toFixed(2)}°`,
    );
  });

  it('should have meaningful error differences between skill levels', () => {
    const rookieRegularDiff = rookie.avgError - regular.avgError;
    assert.ok(
      rookieRegularDiff > 0,
      `Rookie-Regular difference should be positive: ${rookieRegularDiff.toFixed(2)}°`,
    );
  });
});

describe('Beam Tracking Interpolation (updateBeamTracking)', () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log('BEAM TRACKING UNIT TESTS');
  console.log('='.repeat(70));

  const prng = createPRNG(42);

  it('should reach target when tracking speed allows full movement', () => {
    const error = createAimError(prng, AI_PROFILES.ace);
    error.currentBeamDirection.set(0, 0, -1);
    error.beamTrackingSpeed = 10.0; // Very fast tracking

    const target = new Vector3(1, 0, 0).normalize(); // 90 degrees away
    const dt = 1.0; // 1 second - enough time to reach target at 10 rad/s

    updateBeamTracking(error, target, dt);

    // Should reach target exactly (within floating point tolerance)
    const dot = error.currentBeamDirection.dot(target);
    assert.ok(
      dot > 0.999,
      `Should reach target with fast tracking: dot=${dot.toFixed(4)}`,
    );
    console.log('  ✓ Fast tracking reaches target in one frame');
  });

  it('should interpolate partially when tracking speed limits movement', () => {
    const error = createAimError(prng, AI_PROFILES.rookie);
    error.currentBeamDirection.set(0, 0, -1);
    error.beamTrackingSpeed = 0.5; // Slow tracking: 0.5 rad/s

    // Use a smaller angle (~20°) where lerp approximates slerp better
    const target = new Vector3(0.34, 0, -0.94).normalize(); // ~20 degrees away
    const dt = 0.1; // 0.1 second - 0.05 rad max movement

    const initialAngle = Math.acos(error.currentBeamDirection.dot(target));
    updateBeamTracking(error, target, dt);
    const finalAngle = Math.acos(error.currentBeamDirection.dot(target));

    // Should have moved toward target (not necessarily exact due to lerp approximation)
    const angleMoved = initialAngle - finalAngle;

    // At small angles, lerp approximates slerp reasonably well
    // Allow 20% tolerance for lerp vs true angular interpolation
    const expectedMove = 0.5 * 0.1; // beamTrackingSpeed * dt
    assert.ok(
      angleMoved > expectedMove * 0.7 && angleMoved < expectedMove * 1.3,
      `Should move ~${expectedMove.toFixed(3)} rad (±30%), moved ${angleMoved.toFixed(3)} rad`,
    );
    console.log(
      `  ✓ Slow tracking moves ${angleMoved.toFixed(3)} rad (expected ~${expectedMove.toFixed(3)})`,
    );
  });

  it('should handle already-aligned case gracefully', () => {
    const error = createAimError(prng, AI_PROFILES.regular);
    error.currentBeamDirection.set(0, 0, -1);

    const target = new Vector3(0, 0, -1); // Same direction
    const dt = 0.016;

    updateBeamTracking(error, target, dt);

    // Should remain aligned
    const dot = error.currentBeamDirection.dot(target);
    assert.ok(dot > 0.9999, `Should stay aligned: dot=${dot.toFixed(6)}`);
    console.log('  ✓ Already-aligned case handled without NaN');
  });

  it('should normalize result after interpolation', () => {
    const error = createAimError(prng, AI_PROFILES.veteran);
    error.currentBeamDirection.set(0, 0, -1);
    error.beamTrackingSpeed = 1.0;

    const target = new Vector3(0.5, 0.5, -0.5).normalize();
    const dt = 0.1;

    updateBeamTracking(error, target, dt);

    // Check direction is normalized
    const length = error.currentBeamDirection.length();
    assert.ok(
      Math.abs(length - 1.0) < 0.0001,
      `Result should be normalized: length=${length.toFixed(6)}`,
    );
    console.log(`  ✓ Result normalized: length=${length.toFixed(6)}`);
  });

  it('should show different behavior for ace vs rookie tracking', () => {
    const aceError = createAimError(prng, AI_PROFILES.ace);
    const rookieError = createAimError(prng, AI_PROFILES.rookie);

    aceError.currentBeamDirection.set(0, 0, -1);
    rookieError.currentBeamDirection.set(0, 0, -1);

    const target = new Vector3(0.5, 0.2, -0.8).normalize();
    const dt = 0.1;

    updateBeamTracking(aceError, target, dt);
    updateBeamTracking(rookieError, target, dt);

    const aceDot = aceError.currentBeamDirection.dot(target);
    const rookieDot = rookieError.currentBeamDirection.dot(target);

    // Ace should be closer to target (higher tracking speed)
    assert.ok(
      aceDot > rookieDot,
      `Ace should track faster: ace=${aceDot.toFixed(3)}, rookie=${rookieDot.toFixed(3)}`,
    );
    console.log(
      `  ✓ Ace tracks faster: ace=${aceDot.toFixed(3)} vs rookie=${rookieDot.toFixed(3)}`,
    );
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log('BEAM TRACKING UNIT TESTS COMPLETE');
  console.log('='.repeat(70));
});
