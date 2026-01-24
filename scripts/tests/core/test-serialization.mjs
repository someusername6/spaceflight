/**
 * Tests for serialization utilities.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  deserializeQuaternion,
  deserializeQuaternionInto,
  deserializeVector3,
  deserializeVector3Into,
  isSerializedQuaternion,
  isSerializedVector3,
  serializeQuaternion,
  serializeTransform,
  serializeVector3,
} from '../../../src/core/serialization.ts';

describe('Vector3 serialization', () => {
  it('serializes Vector3 to plain object', () => {
    const v = new Vector3(1, 2, 3);
    const s = serializeVector3(v);

    assert.deepStrictEqual(s, { x: 1, y: 2, z: 3 });
    // Ensure it's a plain object (no prototype methods)
    assert.strictEqual(Object.getPrototypeOf(s), Object.prototype);
  });

  it('deserializes plain object to Vector3', () => {
    const s = { x: 4, y: 5, z: 6 };
    const v = deserializeVector3(s);

    assert.ok(v instanceof Vector3);
    assert.strictEqual(v.x, 4);
    assert.strictEqual(v.y, 5);
    assert.strictEqual(v.z, 6);
  });

  it('deserializes into existing Vector3', () => {
    const s = { x: 7, y: 8, z: 9 };
    const target = new Vector3();
    const result = deserializeVector3Into(s, target);

    assert.strictEqual(result, target); // Same object
    assert.strictEqual(target.x, 7);
    assert.strictEqual(target.y, 8);
    assert.strictEqual(target.z, 9);
  });

  it('round-trips through JSON', () => {
    const original = new Vector3(1.5, -2.5, 3.5);
    const json = JSON.stringify(serializeVector3(original));
    const restored = deserializeVector3(JSON.parse(json));

    assert.strictEqual(restored.x, original.x);
    assert.strictEqual(restored.y, original.y);
    assert.strictEqual(restored.z, original.z);
  });
});

describe('Quaternion serialization', () => {
  it('serializes Quaternion to plain object', () => {
    const q = new Quaternion(0.1, 0.2, 0.3, 0.9);
    const s = serializeQuaternion(q);

    assert.deepStrictEqual(s, { x: 0.1, y: 0.2, z: 0.3, w: 0.9 });
    assert.strictEqual(Object.getPrototypeOf(s), Object.prototype);
  });

  it('deserializes plain object to Quaternion', () => {
    const s = { x: 0.4, y: 0.5, z: 0.6, w: 0.7 };
    const q = deserializeQuaternion(s);

    assert.ok(q instanceof Quaternion);
    assert.strictEqual(q.x, 0.4);
    assert.strictEqual(q.y, 0.5);
    assert.strictEqual(q.z, 0.6);
    assert.strictEqual(q.w, 0.7);
  });

  it('deserializes into existing Quaternion', () => {
    const s = { x: 0.1, y: 0.2, z: 0.3, w: 0.4 };
    const target = new Quaternion();
    const result = deserializeQuaternionInto(s, target);

    assert.strictEqual(result, target);
    assert.strictEqual(target.x, 0.1);
    assert.strictEqual(target.y, 0.2);
    assert.strictEqual(target.z, 0.3);
    assert.strictEqual(target.w, 0.4);
  });

  it('round-trips through JSON', () => {
    const original = new Quaternion(0.5, -0.5, 0.5, 0.5);
    const json = JSON.stringify(serializeQuaternion(original));
    const restored = deserializeQuaternion(JSON.parse(json));

    assert.strictEqual(restored.x, original.x);
    assert.strictEqual(restored.y, original.y);
    assert.strictEqual(restored.z, original.z);
    assert.strictEqual(restored.w, original.w);
  });
});

describe('Transform serialization', () => {
  it('serializes position and rotation together', () => {
    const pos = new Vector3(10, 20, 30);
    const rot = new Quaternion(0, 0, 0, 1);
    const s = serializeTransform(pos, rot);

    assert.deepStrictEqual(s.position, { x: 10, y: 20, z: 30 });
    assert.deepStrictEqual(s.rotation, { x: 0, y: 0, z: 0, w: 1 });
  });
});

describe('Type guards', () => {
  it('validates SerializedVector3', () => {
    assert.strictEqual(isSerializedVector3({ x: 1, y: 2, z: 3 }), true);
    assert.strictEqual(isSerializedVector3({ x: 1, y: 2 }), false);
    assert.strictEqual(isSerializedVector3({ x: 1, y: 2, z: 'three' }), false);
    assert.strictEqual(isSerializedVector3(null), false);
    assert.strictEqual(isSerializedVector3(undefined), false);
    assert.strictEqual(isSerializedVector3([1, 2, 3]), false);
  });

  it('validates SerializedQuaternion', () => {
    assert.strictEqual(
      isSerializedQuaternion({ x: 0, y: 0, z: 0, w: 1 }),
      true,
    );
    assert.strictEqual(isSerializedQuaternion({ x: 0, y: 0, z: 0 }), false);
    assert.strictEqual(
      isSerializedQuaternion({ x: 0, y: 0, z: 0, w: 'one' }),
      false,
    );
    assert.strictEqual(isSerializedQuaternion(null), false);
    assert.strictEqual(isSerializedQuaternion(undefined), false);
  });
});
