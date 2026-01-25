/**
 * Input Format Tests
 *
 * Tests input serialization for multiplayer network transport.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createEmptyInput,
  deserializeInput,
  serializeInput,
} from '../../../src/multiplayer/input-format.ts';
import { createTestInput } from './multiplayer-test-utils.mjs';

describe('Input Format', () => {
  it('should serialize and deserialize empty input', () => {
    const empty = createTestInput();
    const serialized = serializeInput(empty);

    assert.strictEqual(
      serialized.length,
      4,
      'Serialized input should be 4 bytes',
    );

    const deserialized = deserializeInput(serialized);

    assert.strictEqual(deserialized.accelerate, false);
    assert.strictEqual(deserialized.firePrimary, false);
    assert.strictEqual(deserialized.pitchUp, false);
  });

  it('should preserve input state through serialization', () => {
    const input = createTestInput(true, true);
    input.yawLeft = true;
    input.afterburner = true;

    const serialized = serializeInput(input);
    const deserialized = deserializeInput(serialized);

    assert.strictEqual(deserialized.accelerate, true);
    assert.strictEqual(deserialized.firePrimary, true);
    assert.strictEqual(deserialized.yawLeft, true);
    assert.strictEqual(deserialized.afterburner, true);
    assert.strictEqual(deserialized.pitchUp, false);
    assert.strictEqual(deserialized.decelerate, false);
  });

  it('should create empty input with all zeros', () => {
    const empty = createEmptyInput();
    assert.strictEqual(empty.length, 4);
    assert.strictEqual(empty[0], 0);
    assert.strictEqual(empty[1], 0);
    assert.strictEqual(empty[2], 0);
    assert.strictEqual(empty[3], 0);
  });
});
