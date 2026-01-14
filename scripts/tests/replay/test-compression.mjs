/**
 * RLE Compression Tests
 *
 * Verifies that run-length encoding works correctly for replay input data.
 */

import {
  decodeRLE,
  encodeRLE,
  estimateCompressedSize,
  getCompressionRatio,
} from '../../../src/replay/compression.ts';

// ============================================================================
// Test Framework
// ============================================================================

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertArrayEqual(actual, expected, message) {
  if (actual.length !== expected.length) {
    throw new Error(
      `${message}: length mismatch - expected ${expected.length}, got ${actual.length}`,
    );
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        `${message}: mismatch at index ${i} - expected ${expected[i]}, got ${actual[i]}`,
      );
    }
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Basic Encoding Tests
// ============================================================================

test('encodeRLE: empty array', () => {
  const result = encodeRLE([]);
  assertArrayEqual(result.data, [], 'Empty array should encode to empty');
  assertEqual(result.compressed, false, 'Empty array is not compressed');
});

test('encodeRLE: single value', () => {
  const result = encodeRLE([64]);
  assertArrayEqual(result.data, [64, 1], 'Single value encodes to [value, 1]');
  assertEqual(result.compressed, true, 'Single value is compressed');
});

test('encodeRLE: repeated value', () => {
  const result = encodeRLE([64, 64, 64, 64, 64]);
  assertArrayEqual(
    result.data,
    [64, 5],
    'Repeated values compress to single run',
  );
  assertEqual(result.compressed, true, 'Should be compressed');
});

test('encodeRLE: two different values', () => {
  const result = encodeRLE([64, 512]);
  // RLE would be [64, 1, 512, 1] = 4 elements, original is 2
  // Should NOT compress
  assertArrayEqual(result.data, [64, 512], 'Short alternating not compressed');
  assertEqual(
    result.compressed,
    false,
    'Should not compress when RLE is larger',
  );
});

test('encodeRLE: multiple runs', () => {
  const result = encodeRLE([64, 64, 64, 512, 512, 0, 0, 0, 0]);
  assertArrayEqual(
    result.data,
    [64, 3, 512, 2, 0, 4],
    'Multiple runs encode correctly',
  );
  assertEqual(result.compressed, true, 'Should be compressed');
});

test('encodeRLE: alternating values (worst case)', () => {
  const input = [1, 2, 1, 2, 1, 2, 1, 2];
  const result = encodeRLE(input);
  // RLE would be [1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1] = 16 elements
  // Original is 8, so should NOT compress
  assertArrayEqual(result.data, input, 'Alternating values not compressed');
  assertEqual(result.compressed, false, 'Alternating should not compress');
});

// ============================================================================
// Decoding Tests
// ============================================================================

test('decodeRLE: empty array', () => {
  const result = decodeRLE([], true);
  assertArrayEqual(result, [], 'Empty decodes to empty');
});

test('decodeRLE: single run', () => {
  const result = decodeRLE([64, 5], true);
  assertArrayEqual(
    result,
    [64, 64, 64, 64, 64],
    'Single run decodes correctly',
  );
});

test('decodeRLE: multiple runs', () => {
  const result = decodeRLE([64, 3, 512, 2, 0, 4], true);
  assertArrayEqual(
    result,
    [64, 64, 64, 512, 512, 0, 0, 0, 0],
    'Multiple runs decode correctly',
  );
});

test('decodeRLE: uncompressed passthrough', () => {
  const input = [1, 2, 3, 4, 5];
  const result = decodeRLE(input, false);
  assertArrayEqual(result, input, 'Uncompressed data passes through');
  // Verify it's a copy, not same reference
  assertTrue(result !== input, 'Should return a copy');
});

// ============================================================================
// Roundtrip Tests
// ============================================================================

test('roundtrip: repeated values', () => {
  const original = [64, 64, 64, 64, 64, 64, 64, 64, 64, 64];
  const encoded = encodeRLE(original);
  const decoded = decodeRLE(encoded.data, encoded.compressed);
  assertArrayEqual(decoded, original, 'Roundtrip preserves repeated values');
});

test('roundtrip: mixed pattern', () => {
  const original = [64, 64, 64, 512, 512, 576, 576, 576, 576, 0, 0];
  const encoded = encodeRLE(original);
  const decoded = decodeRLE(encoded.data, encoded.compressed);
  assertArrayEqual(decoded, original, 'Roundtrip preserves mixed pattern');
});

test('roundtrip: realistic gameplay pattern', () => {
  // Simulate: accelerate for 120 ticks, then fire+accelerate for 30, then turn+accelerate for 60
  const original = [];
  for (let i = 0; i < 120; i++) original.push(64); // accelerate
  for (let i = 0; i < 30; i++) original.push(576); // accelerate + fire
  for (let i = 0; i < 60; i++) original.push(68); // accelerate + yaw

  const encoded = encodeRLE(original);
  const decoded = decodeRLE(encoded.data, encoded.compressed);

  assertArrayEqual(decoded, original, 'Roundtrip preserves realistic pattern');
  assertTrue(encoded.compressed, 'Realistic pattern should compress');

  // Check compression ratio
  const ratio = getCompressionRatio(
    original.length,
    encoded.data.length,
    encoded.compressed,
  );
  assertTrue(ratio > 10, `Expected high compression ratio, got ${ratio}`);
});

test('roundtrip: random-like pattern (LCG)', () => {
  // Generate deterministic "random" pattern
  const original = [];
  let seed = 12345;
  const a = 1103515245;
  const c = 12345;
  const m = 0x80000000;

  for (let i = 0; i < 100; i++) {
    seed = (a * seed + c) % m;
    original.push((seed >>> 0) & 0x3ffff); // 18 bits
  }

  const encoded = encodeRLE(original);
  const decoded = decodeRLE(encoded.data, encoded.compressed);
  assertArrayEqual(
    decoded,
    original,
    'Roundtrip preserves random-like pattern',
  );
});

// ============================================================================
// Compression Ratio Tests
// ============================================================================

test('getCompressionRatio: high compression', () => {
  const original = new Array(1000).fill(64);
  const encoded = encodeRLE(original);
  const ratio = getCompressionRatio(
    original.length,
    encoded.data.length,
    encoded.compressed,
  );
  assertEqual(
    ratio,
    500,
    'Single value repeated 1000x should have 500:1 ratio',
  );
});

test('getCompressionRatio: no compression', () => {
  const original = [1, 2, 3, 4];
  const encoded = encodeRLE(original);
  const ratio = getCompressionRatio(
    original.length,
    encoded.data.length,
    encoded.compressed,
  );
  assertEqual(ratio, 1.0, 'Uncompressed should have 1:1 ratio');
});

// ============================================================================
// Security Tests
// ============================================================================

test('decodeRLE: rejects oversized uncompressed data', () => {
  // Create array larger than MAX_DECODED_SIZE (10 million)
  const oversized = new Array(10_000_001).fill(0);
  let threw = false;
  try {
    decodeRLE(oversized, false);
  } catch (e) {
    threw = true;
    assertTrue(
      e.message.includes('exceeds maximum'),
      `Expected size error, got: ${e.message}`,
    );
  }
  assertTrue(threw, 'Should throw for oversized uncompressed data');
});

test('decodeRLE: rejects malicious RLE with huge count', () => {
  // RLE data that would decode to 20 million elements
  const malicious = [1, 20_000_000];
  let threw = false;
  try {
    decodeRLE(malicious, true);
  } catch (e) {
    threw = true;
    assertTrue(
      e.message.includes('exceeds maximum'),
      `Expected size error, got: ${e.message}`,
    );
  }
  assertTrue(threw, 'Should throw for malicious RLE data');
});

// ============================================================================
// Estimate Size Tests
// ============================================================================

test('estimateCompressedSize: empty', () => {
  assertEqual(estimateCompressedSize([]), 0, 'Empty array estimate is 0');
});

test('estimateCompressedSize: single run', () => {
  const size = estimateCompressedSize([64, 64, 64, 64, 64]);
  assertEqual(size, 2, 'Single run estimates to 2');
});

test('estimateCompressedSize: multiple runs', () => {
  const size = estimateCompressedSize([64, 64, 512, 512, 0]);
  assertEqual(
    size,
    5,
    'Returns original size when RLE would be larger (6 vs 5)',
  );
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('RLE Compression Tests');
console.log('=====================\n');

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
