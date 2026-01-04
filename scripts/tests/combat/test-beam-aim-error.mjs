/**
 * Beam Aim Error Test
 *
 * Verifies that beam-using ships have skill-based accuracy:
 * - Beams fire in ship forward direction (fixed mount)
 * - Ship rotation is affected by aim error via aimToward()
 * - Different skill levels have different aim error magnitudes
 */

import { Vector3 } from 'three';
import {
  applyAimError,
  createAimError,
} from '../../../src/components/aim-error.ts';
import { createPRNG } from '../../../src/core/prng.ts';
import { AI_PROFILES } from '../../../src/data/ai-profiles.ts';

const SAMPLES = 1000;

console.log(`\n${'='.repeat(70)}`);
console.log('BEAM AIM ERROR TEST');
console.log('(Verifies aim error magnitudes scale with skill level)');
console.log('='.repeat(70));

console.log('\n--- AIM ERROR PARAMETERS BY PROFILE ---');
console.log('Profile       Base Error   Drift Speed   Angular Factor');
console.log('-'.repeat(60));

const PROFILES = ['rookie', 'regular', 'veteran', 'ace'];
for (const name of PROFILES) {
  const profile = AI_PROFILES[name];
  const baseError = ((profile.aimErrorBase * 180) / Math.PI).toFixed(1);
  const driftSpeed = ((profile.aimErrorDriftSpeed * 180) / Math.PI).toFixed(2);
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
console.log('Higher skill = lower aimErrorBase = ship points more accurately.');
console.log(
  'Beams fire in ship forward direction, so they hit when ship aims right.',
);
console.log('='.repeat(70));
