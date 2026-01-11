/**
 * Tests for SlotArray opaque type - serialization and error handling.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createSlotArray,
  getSlot,
  setSlot,
  slotArrayFromJSON,
  slotArrayToJSON,
} from '../../../src/campaign/slot-array.ts';

describe('SlotArray', () => {
  describe('JSON serialization', () => {
    it('round-trip preserves data', () => {
      const weapons = [
        { weaponType: 'plasma', bankSize: 1 },
        null,
        { weaponType: 'autocannon', bankSize: 2, currentAmmo: 100 },
      ];

      const original = createSlotArray(weapons);

      // Simulate save: convert to JSON
      const json = slotArrayToJSON(original);
      const jsonString = JSON.stringify(json);

      // Simulate load: parse JSON and recreate SlotArray
      const parsed = JSON.parse(jsonString);
      const restored = slotArrayFromJSON(parsed);

      // Verify data is preserved
      assert.strictEqual(restored.slotCount, 3, 'Slot count preserved');
      assert.deepStrictEqual(
        getSlot(restored, 0),
        { weaponType: 'plasma', bankSize: 1 },
        'First weapon preserved',
      );
      assert.strictEqual(
        getSlot(restored, 1),
        undefined,
        'Null slot preserved',
      );
      assert.deepStrictEqual(
        getSlot(restored, 2),
        { weaponType: 'autocannon', bankSize: 2, currentAmmo: 100 },
        'Third weapon preserved',
      );
    });
  });

  describe('invalid SlotArray detection', () => {
    it('throws on raw JSON object without slotArrayFromJSON', () => {
      const fakeSlotArray = { slotCount: 2 };

      assert.throws(
        () => getSlot(fakeSlotArray, 0),
        /Invalid SlotArray/,
        'Should throw on invalid SlotArray',
      );
    });
  });

  describe('bounds checking', () => {
    it('getSlot throws RangeError on out-of-bounds', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
      ]);

      assert.throws(
        () => getSlot(arr, 5),
        RangeError,
        'getSlot should throw RangeError',
      );
    });

    it('setSlot throws RangeError on negative index', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
      ]);

      assert.throws(
        () => setSlot(arr, -1, null),
        RangeError,
        'setSlot should throw RangeError on negative',
      );
    });

    it('setSlot throws RangeError at array length', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
      ]);

      assert.throws(
        () => setSlot(arr, 2, null),
        RangeError,
        'setSlot should throw RangeError at length',
      );
    });
  });

  describe('valid access', () => {
    it('allows boundary access at index 0', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
        { weaponType: 'railgun', bankSize: 2 },
      ]);

      assert.ok(getSlot(arr, 0) !== undefined, 'Index 0 accessible');
    });

    it('returns undefined for null slots', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
        { weaponType: 'railgun', bankSize: 2 },
      ]);

      assert.strictEqual(
        getSlot(arr, 1),
        undefined,
        'Null slot returns undefined',
      );
    });

    it('allows access at last index', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
        { weaponType: 'railgun', bankSize: 2 },
      ]);

      assert.ok(getSlot(arr, 2) !== undefined, 'Last index accessible');
    });

    it('setSlot works at valid index', () => {
      const arr = createSlotArray([
        { weaponType: 'plasma', bankSize: 1 },
        null,
        { weaponType: 'railgun', bankSize: 2 },
      ]);

      const updated = setSlot(arr, 1, { weaponType: 'pulse', bankSize: 1 });
      assert.deepStrictEqual(
        getSlot(updated, 1),
        { weaponType: 'pulse', bankSize: 1 },
        'setSlot at index 1 works',
      );
    });
  });
});
