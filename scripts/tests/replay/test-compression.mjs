/**
 * RLE Compression Tests
 *
 * Verifies that run-length encoding works correctly for replay input data.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  decodeRLE,
  encodeRLE,
  estimateCompressedSize,
  getCompressionRatio,
} from '../../../src/replay/compression.ts';

describe('RLE Compression', () => {
  // ==========================================================================
  // Basic Encoding Tests
  // ==========================================================================

  describe('encodeRLE', () => {
    it('empty array', () => {
      const result = encodeRLE([]);
      assert.deepStrictEqual(
        result.data,
        [],
        'Empty array should encode to empty',
      );
      assert.strictEqual(
        result.compressed,
        false,
        'Empty array is not compressed',
      );
    });

    it('single value', () => {
      const result = encodeRLE([64]);
      assert.deepStrictEqual(
        result.data,
        [64, 1],
        'Single value encodes to [value, 1]',
      );
      assert.strictEqual(result.compressed, true, 'Single value is compressed');
    });

    it('repeated value', () => {
      const result = encodeRLE([64, 64, 64, 64, 64]);
      assert.deepStrictEqual(
        result.data,
        [64, 5],
        'Repeated values compress to single run',
      );
      assert.strictEqual(result.compressed, true, 'Should be compressed');
    });

    it('two different values', () => {
      const result = encodeRLE([64, 512]);
      // RLE would be [64, 1, 512, 1] = 4 elements, original is 2
      // Should NOT compress
      assert.deepStrictEqual(
        result.data,
        [64, 512],
        'Short alternating not compressed',
      );
      assert.strictEqual(
        result.compressed,
        false,
        'Should not compress when RLE is larger',
      );
    });

    it('multiple runs', () => {
      const result = encodeRLE([64, 64, 64, 512, 512, 0, 0, 0, 0]);
      assert.deepStrictEqual(
        result.data,
        [64, 3, 512, 2, 0, 4],
        'Multiple runs encode correctly',
      );
      assert.strictEqual(result.compressed, true, 'Should be compressed');
    });

    it('alternating values (worst case)', () => {
      const input = [1, 2, 1, 2, 1, 2, 1, 2];
      const result = encodeRLE(input);
      // RLE would be [1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1] = 16 elements
      // Original is 8, so should NOT compress
      assert.deepStrictEqual(
        result.data,
        input,
        'Alternating values not compressed',
      );
      assert.strictEqual(
        result.compressed,
        false,
        'Alternating should not compress',
      );
    });
  });

  // ==========================================================================
  // Decoding Tests
  // ==========================================================================

  describe('decodeRLE', () => {
    it('empty array', () => {
      const result = decodeRLE([], true);
      assert.deepStrictEqual(result, [], 'Empty decodes to empty');
    });

    it('single run', () => {
      const result = decodeRLE([64, 5], true);
      assert.deepStrictEqual(
        result,
        [64, 64, 64, 64, 64],
        'Single run decodes correctly',
      );
    });

    it('multiple runs', () => {
      const result = decodeRLE([64, 3, 512, 2, 0, 4], true);
      assert.deepStrictEqual(
        result,
        [64, 64, 64, 512, 512, 0, 0, 0, 0],
        'Multiple runs decode correctly',
      );
    });

    it('uncompressed passthrough', () => {
      const input = [1, 2, 3, 4, 5];
      const result = decodeRLE(input, false);
      assert.deepStrictEqual(result, input, 'Uncompressed data passes through');
      // Verify it's a copy, not same reference
      assert.ok(result !== input, 'Should return a copy');
    });
  });

  // ==========================================================================
  // Roundtrip Tests
  // ==========================================================================

  describe('Roundtrip', () => {
    it('repeated values', () => {
      const original = [64, 64, 64, 64, 64, 64, 64, 64, 64, 64];
      const encoded = encodeRLE(original);
      const decoded = decodeRLE(encoded.data, encoded.compressed);
      assert.deepStrictEqual(
        decoded,
        original,
        'Roundtrip preserves repeated values',
      );
    });

    it('mixed pattern', () => {
      const original = [64, 64, 64, 512, 512, 576, 576, 576, 576, 0, 0];
      const encoded = encodeRLE(original);
      const decoded = decodeRLE(encoded.data, encoded.compressed);
      assert.deepStrictEqual(
        decoded,
        original,
        'Roundtrip preserves mixed pattern',
      );
    });

    it('realistic gameplay pattern', () => {
      // Simulate: accelerate for 120 ticks, then fire+accelerate for 30, then turn+accelerate for 60
      const original = [];
      for (let i = 0; i < 120; i++) original.push(64); // accelerate
      for (let i = 0; i < 30; i++) original.push(576); // accelerate + fire
      for (let i = 0; i < 60; i++) original.push(68); // accelerate + yaw

      const encoded = encodeRLE(original);
      const decoded = decodeRLE(encoded.data, encoded.compressed);

      assert.deepStrictEqual(
        decoded,
        original,
        'Roundtrip preserves realistic pattern',
      );
      assert.ok(encoded.compressed, 'Realistic pattern should compress');

      // Check compression ratio
      const ratio = getCompressionRatio(
        original.length,
        encoded.data.length,
        encoded.compressed,
      );
      assert.ok(ratio > 10, `Expected high compression ratio, got ${ratio}`);
    });

    it('random-like pattern (LCG)', () => {
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
      assert.deepStrictEqual(
        decoded,
        original,
        'Roundtrip preserves random-like pattern',
      );
    });
  });

  // ==========================================================================
  // Compression Ratio Tests
  // ==========================================================================

  describe('getCompressionRatio', () => {
    it('high compression', () => {
      const original = new Array(1000).fill(64);
      const encoded = encodeRLE(original);
      const ratio = getCompressionRatio(
        original.length,
        encoded.data.length,
        encoded.compressed,
      );
      assert.strictEqual(
        ratio,
        500,
        'Single value repeated 1000x should have 500:1 ratio',
      );
    });

    it('no compression', () => {
      const original = [1, 2, 3, 4];
      const encoded = encodeRLE(original);
      const ratio = getCompressionRatio(
        original.length,
        encoded.data.length,
        encoded.compressed,
      );
      assert.strictEqual(ratio, 1.0, 'Uncompressed should have 1:1 ratio');
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security', () => {
    it('rejects oversized uncompressed data', () => {
      // Create array larger than MAX_DECODED_SIZE (10 million)
      const oversized = new Array(10_000_001).fill(0);
      assert.throws(
        () => decodeRLE(oversized, false),
        /exceeds maximum/,
        'Should throw for oversized uncompressed data',
      );
    });

    it('rejects malicious RLE with huge count', () => {
      // RLE data that would decode to 20 million elements
      const malicious = [1, 20_000_000];
      assert.throws(
        () => decodeRLE(malicious, true),
        /exceeds maximum/,
        'Should throw for malicious RLE data',
      );
    });
  });

  // ==========================================================================
  // Estimate Size Tests
  // ==========================================================================

  describe('estimateCompressedSize', () => {
    it('empty', () => {
      assert.strictEqual(
        estimateCompressedSize([]),
        0,
        'Empty array estimate is 0',
      );
    });

    it('single run', () => {
      const size = estimateCompressedSize([64, 64, 64, 64, 64]);
      assert.strictEqual(size, 2, 'Single run estimates to 2');
    });

    it('multiple runs', () => {
      const size = estimateCompressedSize([64, 64, 512, 512, 0]);
      assert.strictEqual(
        size,
        5,
        'Returns original size when RLE would be larger (6 vs 5)',
      );
    });
  });
});
