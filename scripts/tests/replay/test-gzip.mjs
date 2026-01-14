/**
 * Gzip Compression Tests
 *
 * Verifies that gzip compression/decompression works correctly for replay data.
 * Uses native CompressionStream API.
 */

import {
  compressJSON,
  compressString,
  decompressJSON,
  decompressToString,
  isCompressionSupported,
  isGzipCompressed,
} from '../../../src/replay/gzip.ts';

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

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Compression Support Detection
// ============================================================================

test('isCompressionSupported: returns boolean', () => {
  const supported = isCompressionSupported();
  assertTrue(typeof supported === 'boolean', 'Should return a boolean');
  // In Node.js 18+, CompressionStream should be available
  assertTrue(supported, 'CompressionStream should be supported in Node.js 18+');
});

// ============================================================================
// Gzip Detection Tests
// ============================================================================

test('isGzipCompressed: detects gzip magic bytes', () => {
  // Gzip files start with 0x1f 0x8b
  const gzipData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
  assertTrue(isGzipCompressed(gzipData), 'Should detect gzip magic bytes');
});

test('isGzipCompressed: rejects non-gzip data', () => {
  // JSON starts with { (0x7b)
  const jsonData = new Uint8Array([0x7b, 0x22, 0x76, 0x65]);
  assertTrue(!isGzipCompressed(jsonData), 'Should reject JSON data');
});

test('isGzipCompressed: handles empty/short data', () => {
  assertTrue(!isGzipCompressed(new Uint8Array([])), 'Empty array is not gzip');
  assertTrue(
    !isGzipCompressed(new Uint8Array([0x1f])),
    'Single byte is not gzip',
  );
});

// ============================================================================
// String Compression Tests
// ============================================================================

test('compressString: compresses and produces gzip format', async () => {
  const input = 'Hello, World!';
  const compressed = await compressString(input);

  assertTrue(compressed instanceof Uint8Array, 'Should return Uint8Array');
  assertTrue(compressed.length > 0, 'Should have content');
  assertTrue(isGzipCompressed(compressed), 'Should be valid gzip format');
});

test('decompressToString: decompresses gzip to original string', async () => {
  const original = 'Hello, World! This is a test string.';
  const compressed = await compressString(original);
  const decompressed = await decompressToString(compressed);

  assertEqual(decompressed, original, 'Roundtrip should preserve string');
});

test('string roundtrip: handles unicode', async () => {
  const original = 'Hello 世界! 🚀 Émojis and ümlauts';
  const compressed = await compressString(original);
  const decompressed = await decompressToString(compressed);

  assertEqual(decompressed, original, 'Should preserve unicode characters');
});

test('string roundtrip: handles large strings', async () => {
  // Create a large repetitive string (should compress well)
  const chunk = 'This is a repeating pattern. ';
  const original = chunk.repeat(1000);

  const compressed = await compressString(original);
  const decompressed = await decompressToString(compressed);

  assertEqual(decompressed, original, 'Should preserve large string');
  assertTrue(
    compressed.length < original.length * 0.5,
    `Repetitive data should compress well: ${compressed.length} vs ${original.length}`,
  );
});

// ============================================================================
// JSON Compression Tests
// ============================================================================

test('compressJSON: compresses object to gzip', async () => {
  const obj = { name: 'test', value: 42, nested: { a: 1, b: 2 } };
  const compressed = await compressJSON(obj);

  assertTrue(compressed instanceof Uint8Array, 'Should return Uint8Array');
  assertTrue(isGzipCompressed(compressed), 'Should be valid gzip format');
});

test('decompressJSON: decompresses gzip to original object', async () => {
  const original = { name: 'test', value: 42, nested: { a: 1, b: 2 } };
  const compressed = await compressJSON(original);
  const decompressed = await decompressJSON(compressed);

  assertDeepEqual(decompressed, original, 'Roundtrip should preserve object');
});

test('JSON roundtrip: handles arrays', async () => {
  const original = [1, 2, 3, 'four', { five: 5 }, [6, 7, 8]];
  const compressed = await compressJSON(original);
  const decompressed = await decompressJSON(compressed);

  assertDeepEqual(decompressed, original, 'Should preserve arrays');
});

test('JSON roundtrip: handles replay-like data', async () => {
  // Simulate a minimal replay structure
  const original = {
    version: 3,
    seed: 12345,
    inputs: new Array(1000).fill(64), // Lots of repeated values
    inputsCompressed: false,
    tickCount: 1000,
    metadata: {
      id: 'test-123',
      missionId: 'patrol-1',
      missionName: 'Patrol Mission',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: 1000,
      recordedAt: Date.now(),
      gameVersion: '0.1.0',
      stats: { kills: 5, damageDealt: 1000, damageTaken: 200 },
    },
  };

  const compressed = await compressJSON(original);
  const decompressed = await decompressJSON(compressed);

  assertDeepEqual(decompressed, original, 'Should preserve replay structure');

  // Verify compression is effective for repetitive data
  const jsonSize = JSON.stringify(original).length;
  assertTrue(
    compressed.length < jsonSize * 0.3,
    `Replay data should compress well: ${compressed.length} vs ${jsonSize}`,
  );
});

// ============================================================================
// Compression Ratio Tests
// ============================================================================

test('compression ratio: JSON compresses well', async () => {
  // JSON has lots of repeated field names and structure
  const data = {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: i * 10,
      active: i % 2 === 0,
    })),
  };

  const json = JSON.stringify(data);
  const compressed = await compressString(json);
  const ratio = json.length / compressed.length;

  assertTrue(
    ratio > 3,
    `JSON should compress at least 3:1, got ${ratio.toFixed(2)}:1`,
  );
});

test('compression ratio: random data compresses poorly', async () => {
  // Generate pseudo-random bytes as string
  let random = '';
  let seed = 42;
  for (let i = 0; i < 1000; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    random += String.fromCharCode(32 + (seed % 95)); // Printable ASCII
  }

  const compressed = await compressString(random);
  const ratio = random.length / compressed.length;

  // Random data typically compresses around 1:1 or slightly worse
  assertTrue(
    ratio < 2,
    `Random data should not compress well, got ${ratio.toFixed(2)}:1`,
  );
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Gzip Compression Tests');
console.log('======================\n');

for (const { name, fn } of tests) {
  try {
    await fn();
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
