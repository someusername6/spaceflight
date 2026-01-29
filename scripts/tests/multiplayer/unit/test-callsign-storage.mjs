/**
 * Callsign Storage Tests
 *
 * Tests the callsign persistence and validation logic including:
 * - localStorage get/set operations
 * - Callsign validation rules (length, characters, spaces)
 * - Edge cases for the regex pattern
 *
 * Run: npx tsx scripts/tests/multiplayer/test-callsign-storage.mjs
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

// Simple localStorage polyfill for Node.js
const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
  clear: () => localStorageData.clear(),
  get length() {
    return localStorageData.size;
  },
  key: (index) => [...localStorageData.keys()][index] ?? null,
};

import {
  getStoredCallsign,
  setStoredCallsign,
  validateCallsign,
} from '../../../../src/multiplayer/callsign-storage.ts';

describe('Callsign Storage', () => {
  beforeEach(() => {
    localStorageData.clear();
  });

  afterEach(() => {
    localStorageData.clear();
  });

  describe('getStoredCallsign', () => {
    it('returns null when nothing stored', () => {
      const result = getStoredCallsign();
      assert.strictEqual(result, null);
    });

    it('returns stored value', () => {
      localStorageData.set('spaceflight_callsign', 'TestPilot');
      const result = getStoredCallsign();
      assert.strictEqual(result, 'TestPilot');
    });
  });

  describe('setStoredCallsign', () => {
    it('stores callsign to localStorage', () => {
      setStoredCallsign('Commander');
      assert.strictEqual(
        localStorageData.get('spaceflight_callsign'),
        'Commander',
      );
    });

    it('overwrites existing callsign', () => {
      setStoredCallsign('First');
      setStoredCallsign('Second');
      assert.strictEqual(
        localStorageData.get('spaceflight_callsign'),
        'Second',
      );
    });
  });

  describe('validateCallsign', () => {
    describe('length validation', () => {
      it('rejects empty string', () => {
        const result = validateCallsign('');
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.error, 'Callsign is required');
      });

      it('rejects whitespace-only string', () => {
        const result = validateCallsign('   ');
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.error, 'Callsign is required');
      });

      it('rejects 1 character (below minimum)', () => {
        const result = validateCallsign('A');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('at least 2'));
      });

      it('accepts 2 characters (minimum)', () => {
        const result = validateCallsign('AB');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.error, undefined);
      });

      it('accepts 16 characters (maximum)', () => {
        const result = validateCallsign('1234567890123456');
        assert.strictEqual(result.valid, true);
      });

      it('rejects 17 characters (above maximum)', () => {
        const result = validateCallsign('12345678901234567');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('at most 16'));
      });
    });

    describe('character validation', () => {
      it('accepts lowercase letters', () => {
        const result = validateCallsign('pilot');
        assert.strictEqual(result.valid, true);
      });

      it('accepts uppercase letters', () => {
        const result = validateCallsign('PILOT');
        assert.strictEqual(result.valid, true);
      });

      it('accepts numbers', () => {
        const result = validateCallsign('12345');
        assert.strictEqual(result.valid, true);
      });

      it('accepts mixed alphanumeric', () => {
        const result = validateCallsign('Pilot123');
        assert.strictEqual(result.valid, true);
      });

      it('rejects special characters', () => {
        const result = validateCallsign('Pilot!');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('letters, numbers, and spaces'));
      });

      it('rejects underscores', () => {
        const result = validateCallsign('Pilot_One');
        assert.strictEqual(result.valid, false);
      });

      it('rejects hyphens', () => {
        const result = validateCallsign('Pilot-One');
        assert.strictEqual(result.valid, false);
      });
    });

    describe('space handling', () => {
      it('accepts spaces in the middle', () => {
        const result = validateCallsign('Red Baron');
        assert.strictEqual(result.valid, true);
      });

      it('accepts multiple internal spaces', () => {
        const result = validateCallsign('The Red Baron');
        assert.strictEqual(result.valid, true);
      });

      it('trims leading spaces before validation', () => {
        // " Pilot" gets trimmed to "Pilot" which is valid
        const result = validateCallsign(' Pilot');
        assert.strictEqual(result.valid, true);
      });

      it('trims trailing spaces before validation', () => {
        // "Pilot " gets trimmed to "Pilot" which is valid
        const result = validateCallsign('Pilot ');
        assert.strictEqual(result.valid, true);
      });

      it('trims both leading and trailing spaces', () => {
        const result = validateCallsign('  Pilot  ');
        assert.strictEqual(result.valid, true);
      });

      it('rejects callsign that is only internal spaces after trim', () => {
        // Input "A B" is valid (space in middle)
        // But we want to ensure the pattern rejects bad internal structure
        // "A  " trimmed becomes "A" which is too short
        const result = validateCallsign('A  ');
        assert.strictEqual(result.valid, false);
      });
    });

    describe('edge cases', () => {
      it('accepts single letter followed by number (2 chars)', () => {
        const result = validateCallsign('A1');
        assert.strictEqual(result.valid, true);
      });

      it('accepts number followed by letter (2 chars)', () => {
        const result = validateCallsign('1A');
        assert.strictEqual(result.valid, true);
      });

      it('rejects space-only 2 chars after content', () => {
        // "A " trimmed is "A" which is 1 char - too short
        const result = validateCallsign('A ');
        assert.strictEqual(result.valid, false);
      });

      it('accepts typical callsign formats', () => {
        const validCallsigns = [
          'Maverick',
          'Ice Man',
          'Red 5',
          'Alpha1',
          'Cmdr Smith',
        ];
        for (const callsign of validCallsigns) {
          const result = validateCallsign(callsign);
          assert.strictEqual(
            result.valid,
            true,
            `Expected "${callsign}" to be valid`,
          );
        }
      });
    });
  });
});
