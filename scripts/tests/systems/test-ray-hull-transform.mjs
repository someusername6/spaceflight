/**
 * Ray vs Hull Collision Tests - Transformed hulls, compound hulls, edge cases.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { testRayVsHull } from '../../../src/systems/ray-collision.ts';

// ============================================================================
// Helper Functions
// ============================================================================

function createBoxHull(halfSizeX, halfSizeY, halfSizeZ) {
  return {
    type: 'hullCollider',
    planes: [
      { nx: 1, ny: 0, nz: 0, d: halfSizeX },
      { nx: -1, ny: 0, nz: 0, d: halfSizeX },
      { nx: 0, ny: 1, nz: 0, d: halfSizeY },
      { nx: 0, ny: -1, nz: 0, d: halfSizeY },
      { nx: 0, ny: 0, nz: 1, d: halfSizeZ },
      { nx: 0, ny: 0, nz: -1, d: halfSizeZ },
    ],
    boundingRadius: Math.sqrt(
      halfSizeX * halfSizeX + halfSizeY * halfSizeY + halfSizeZ * halfSizeZ,
    ),
    mass: halfSizeX * halfSizeY * halfSizeZ * 8,
    useHullForWeapons: true,
  };
}

function createCompoundHull() {
  const box1 = createBoxHull(5, 5, 5);
  const box2 = createBoxHull(5, 5, 5);

  return {
    type: 'hullCollider',
    planes: [],
    boundingRadius: 20,
    mass: 1000,
    useHullForWeapons: true,
    subHulls: [
      { planes: box1.planes, boundingRadius: box1.boundingRadius },
      { planes: box2.planes, boundingRadius: box2.boundingRadius },
    ],
  };
}

const identityQuat = new Quaternion();

// ============================================================================
// Tests: Ray vs Hull - Transformed Hull
// ============================================================================

describe('Ray vs Hull - Transformed Hull', () => {
  it('ray hits rotated hull', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);
    const hullRotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 4,
    );

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      hullRotation,
      1,
    );

    assert.ok(result.collided, 'Ray should hit rotated hull');
    assert.ok(
      Math.abs(result.normal.y) < 0.01,
      'Normal Y should be ~0 for rotated box',
    );
  });

  it('ray hits scaled hull', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);
    const hullScale = 2;

    const rayOrigin = new Vector3(15, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const resultUnscaled = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );
    assert.ok(!resultUnscaled.collided, 'Ray should miss unscaled hull');

    const resultScaled = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      hullScale,
    );
    assert.ok(resultScaled.collided, 'Ray should hit scaled hull');
  });

  it('ray hits translated hull', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(100, 0, 0);

    const rayOrigin = new Vector3(100, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(result.collided, 'Ray should hit translated hull');
  });
});

// ============================================================================
// Tests: Ray vs Hull - Compound Hull
// ============================================================================

describe('Ray vs Hull - Compound Hull', () => {
  it('ray hits compound hull', () => {
    const hull = createCompoundHull();
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(result.collided, 'Ray should hit compound hull');
  });
});

// ============================================================================
// Tests: Ray vs Hull - Edge Cases
// ============================================================================

describe('Ray vs Hull - Edge Cases', () => {
  it('ray starting inside hull detects collision', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, 0);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      50,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(
      result.collided,
      'Ray starting inside hull should detect collision',
    );
  });

  it('ray parallel to hull face misses', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(15, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(!result.collided, 'Ray parallel to face and outside should miss');
  });

  it('zero-length ray does not crash', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      0,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(!result.collided, 'Zero-length ray should not collide');
  });

  it('invalid scale returns no collision', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      0,
    );

    assert.ok(!result.collided, 'Invalid scale should return no collision');
  });
});

// ============================================================================
// Tests: Penetration Depth Accuracy
// ============================================================================

describe('Ray vs Hull - Penetration Depth', () => {
  it('penetration depth is accurate for box', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      0,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(result.collided, 'Ray should hit box');
    assert.ok(
      Math.abs(result.penetration - 20) < 0.1,
      `Penetration should be ~20, got ${result.penetration}`,
    );
  });
});
