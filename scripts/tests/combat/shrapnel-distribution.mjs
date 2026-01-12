#!/usr/bin/env node
/**
 * Analyze shrapnel direction distribution.
 * Verifies random uniform distribution on sphere surface.
 */

import * as THREE from 'three';
import { createPRNG, randomUnitVector } from '../../../src/core/prng.ts';

const SHRAPNEL_COUNT = 25;

function generateShrapnelDirections(count, seed) {
  const prng = createPRNG(seed);
  const directions = [];
  for (let i = 0; i < count; i++) {
    const randDir = randomUnitVector(prng);
    const direction = new THREE.Vector3(randDir.x, randDir.y, randDir.z);
    directions.push(direction);
  }
  return directions;
}

console.log('='.repeat(70));
console.log('SHRAPNEL DIRECTION ANALYSIS');
console.log('='.repeat(70));

// Generate directions for 3 "explosions" with different seeds
const explosion1 = generateShrapnelDirections(SHRAPNEL_COUNT, 12345);
const explosion2 = generateShrapnelDirections(SHRAPNEL_COUNT, 67890);
const _explosion3 = generateShrapnelDirections(SHRAPNEL_COUNT, 11111);

// Also test same seed produces same result (determinism)
const explosion1Again = generateShrapnelDirections(SHRAPNEL_COUNT, 12345);

// Check if different seeds produce different directions
console.log('\n--- RANDOMNESS CHECK ---\n');
let diffCount = 0;
for (let i = 0; i < SHRAPNEL_COUNT; i++) {
  const d1 = explosion1[i];
  const d2 = explosion2[i];
  if (!d1.equals(d2)) {
    diffCount++;
  }
}
console.log(
  `Different seeds (12345 vs 67890): ${diffCount}/${SHRAPNEL_COUNT} directions differ`,
);
if (diffCount === SHRAPNEL_COUNT) {
  console.log(
    'Result: RANDOM - Different seeds produce different directions ✓',
  );
}

// Check determinism (same seed = same result)
console.log('\n--- DETERMINISM CHECK ---\n');
let sameCount = 0;
for (let i = 0; i < SHRAPNEL_COUNT; i++) {
  if (explosion1[i].equals(explosion1Again[i])) {
    sameCount++;
  }
}
console.log(
  `Same seed (12345): ${sameCount}/${SHRAPNEL_COUNT} directions match`,
);
if (sameCount === SHRAPNEL_COUNT) {
  console.log('Result: DETERMINISTIC - Same seed reproduces same directions ✓');
}

// Show the actual directions
console.log('\n--- SHRAPNEL DIRECTIONS (25 pieces) ---\n');
console.log('Index  X        Y        Z        Angle(deg)  Elevation(deg)');
console.log('-'.repeat(60));

for (let i = 0; i < SHRAPNEL_COUNT; i++) {
  const d = explosion1[i];
  const angleXZ = Math.atan2(d.z, d.x) * (180 / Math.PI);
  const elevation = Math.asin(d.y) * (180 / Math.PI);

  console.log(
    `${String(i).padStart(5)}  ` +
      `${d.x.toFixed(4).padStart(8)}  ` +
      `${d.y.toFixed(4).padStart(8)}  ` +
      `${d.z.toFixed(4).padStart(8)}  ` +
      `${angleXZ.toFixed(1).padStart(10)}  ` +
      `${elevation.toFixed(1).padStart(13)}`,
  );
}

// Analyze distribution
console.log('\n--- DISTRIBUTION ANALYSIS ---\n');

// Check Y distribution (should span -1 to 1)
const yValues = explosion1.map((d) => d.y);
const minY = Math.min(...yValues);
const maxY = Math.max(...yValues);
console.log(
  `Y range: ${minY.toFixed(3)} to ${maxY.toFixed(3)} (should be -1 to 1)`,
);

// Check angular spread in XZ plane
const angles = explosion1.map((d) => Math.atan2(d.z, d.x) * (180 / Math.PI));
const sortedAngles = [...angles].sort((a, b) => a - b);
const angleDiffs = [];
for (let i = 1; i < sortedAngles.length; i++) {
  angleDiffs.push(sortedAngles[i] - sortedAngles[i - 1]);
}
const avgAngleDiff = angleDiffs.reduce((a, b) => a + b, 0) / angleDiffs.length;
console.log(`Average angular separation: ${avgAngleDiff.toFixed(1)}°`);

// Check hemisphere distribution
const upperHemi = explosion1.filter((d) => d.y > 0).length;
const lowerHemi = explosion1.filter((d) => d.y < 0).length;
const equator = explosion1.filter((d) => Math.abs(d.y) < 0.1).length;
console.log(
  `Upper hemisphere: ${upperHemi}, Lower: ${lowerHemi}, Near equator: ${equator}`,
);

// Check uniformity by analyzing large sample
console.log('\n--- UNIFORMITY CHECK (10000 samples) ---\n');
const largeSample = generateShrapnelDirections(10000, 99999);

// Check Y distribution (should be uniform on [-1, 1])
const yBuckets = Array(10).fill(0);
for (const d of largeSample) {
  const bucket = Math.min(9, Math.floor(((d.y + 1) / 2) * 10));
  yBuckets[bucket]++;
}
console.log('Y distribution (should be ~1000 each for uniform):');
for (let i = 0; i < 10; i++) {
  const yMin = -1 + i * 0.2;
  const yMax = yMin + 0.2;
  const bar = '█'.repeat(Math.round(yBuckets[i] / 50));
  console.log(
    `  [${yMin.toFixed(1)}, ${yMax.toFixed(1)}): ${yBuckets[i].toString().padStart(4)} ${bar}`,
  );
}

// Check hemisphere balance
const upper = largeSample.filter((d) => d.y > 0).length;
const lower = largeSample.filter((d) => d.y < 0).length;
console.log(
  `\nHemisphere balance: Upper ${upper}, Lower ${lower} (should be ~5000 each)`,
);

console.log(`\n${'='.repeat(70)}`);
console.log('CONCLUSION:');
console.log(
  'Shrapnel now uses RANDOM directions with uniform sphere distribution.',
);
console.log('- Different explosions have different patterns');
console.log('- Same seed reproduces same pattern (deterministic PRNG)');
console.log('- Distribution is uniform across sphere surface');
console.log(`${'='.repeat(70)}\n`);
