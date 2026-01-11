/**
 * Tests for SlotArray opaque type - serialization and error handling.
 */

import assert from 'node:assert';
import {
  createSlotArray,
  getSlot,
  setSlot,
  slotArrayFromJSON,
  slotArrayToJSON,
} from '../../../src/campaign/slot-array.ts';

console.log('=== SlotArray Tests ===\n');

// Test: JSON round-trip preserves data
console.log('Testing JSON round-trip...');
{
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
  assert.strictEqual(getSlot(restored, 1), undefined, 'Null slot preserved');
  assert.deepStrictEqual(
    getSlot(restored, 2),
    { weaponType: 'autocannon', bankSize: 2, currentAmmo: 100 },
    'Third weapon preserved',
  );

  console.log('  - JSON round-trip preserves data: PASS');
}

// Test: Raw JSON object without slotArrayFromJSON throws
console.log('\nTesting invalid SlotArray detection...');
{
  // Create a raw object that looks like a SlotArray but wasn't created properly
  const fakeSlotArray = {
    slotCount: 2,
  };

  let threw = false;
  try {
    // This should throw because the fake object isn't in the WeakMap
    getSlot(fakeSlotArray, 0);
  } catch (e) {
    threw = true;
    assert.ok(
      e.message.includes('Invalid SlotArray'),
      'Error message mentions invalid SlotArray',
    );
  }

  assert.strictEqual(threw, true, 'getSlot throws on invalid SlotArray');
  console.log('  - Invalid SlotArray throws: PASS');
}

// Test: Out-of-bounds access throws RangeError
console.log('\nTesting out-of-bounds error handling...');
{
  const arr = createSlotArray([{ weaponType: 'plasma', bankSize: 1 }, null]);

  // Test getSlot out of bounds
  let threwGet = false;
  try {
    getSlot(arr, 5);
  } catch (e) {
    threwGet = true;
    assert.ok(e instanceof RangeError, 'getSlot throws RangeError');
    assert.ok(
      e.message.includes('out of bounds'),
      'Error mentions out of bounds',
    );
  }
  assert.strictEqual(threwGet, true, 'getSlot throws on out-of-bounds');

  // Test setSlot out of bounds
  let threwSet = false;
  try {
    setSlot(arr, -1, null);
  } catch (e) {
    threwSet = true;
    assert.ok(e instanceof RangeError, 'setSlot throws RangeError');
  }
  assert.strictEqual(threwSet, true, 'setSlot throws on negative index');

  // Test setSlot at exactly length (out of bounds)
  let threwSetEnd = false;
  try {
    setSlot(arr, 2, null);
  } catch (e) {
    threwSetEnd = true;
    assert.ok(e instanceof RangeError, 'setSlot throws RangeError at length');
  }
  assert.strictEqual(threwSetEnd, true, 'setSlot throws at array length');

  console.log('  - getSlot throws RangeError on out-of-bounds: PASS');
  console.log('  - setSlot throws RangeError on negative index: PASS');
  console.log('  - setSlot throws RangeError at array length: PASS');
}

// Test: Valid in-bounds access works correctly
console.log('\nTesting valid access...');
{
  const arr = createSlotArray([
    { weaponType: 'plasma', bankSize: 1 },
    null,
    { weaponType: 'railgun', bankSize: 2 },
  ]);

  // Valid access at boundaries
  assert.ok(getSlot(arr, 0) !== undefined, 'Index 0 accessible');
  assert.strictEqual(
    getSlot(arr, 1),
    undefined,
    'Index 1 (null) returns undefined',
  );
  assert.ok(getSlot(arr, 2) !== undefined, 'Last index accessible');

  // setSlot at valid indices
  const updated = setSlot(arr, 1, { weaponType: 'pulse', bankSize: 1 });
  assert.deepStrictEqual(
    getSlot(updated, 1),
    { weaponType: 'pulse', bankSize: 1 },
    'setSlot at index 1 works',
  );

  console.log('  - Boundary access (index 0): PASS');
  console.log('  - Null slot returns undefined: PASS');
  console.log('  - Last index access: PASS');
  console.log('  - setSlot at valid index: PASS');
}

console.log('\n=== All SlotArray Tests Passed ===');
