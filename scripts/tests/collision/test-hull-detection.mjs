/**
 * Tests for hull collision detection.
 *
 * Verifies that:
 * - Hull-vs-hull collision detection works correctly
 * - Sphere-vs-hull collision detection works correctly
 * - Rotation and scale are handled properly
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';

import {
  testHullVsHull,
  testSphereVsHull,
} from '../../../src/systems/hull-collision.ts';

/**
 * Create a simple box hull collider for testing.
 * Box is centered at origin with given half-extents.
 */
export function createTestBoxHull(halfX, halfY, halfZ, mass = 1000) {
  // Box has 6 faces, each with an outward-pointing normal
  const planes = [
    { nx: 1, ny: 0, nz: 0, d: halfX }, // +X face
    { nx: -1, ny: 0, nz: 0, d: halfX }, // -X face
    { nx: 0, ny: 1, nz: 0, d: halfY }, // +Y face
    { nx: 0, ny: -1, nz: 0, d: halfY }, // -Y face
    { nx: 0, ny: 0, nz: 1, d: halfZ }, // +Z face
    { nx: 0, ny: 0, nz: -1, d: halfZ }, // -Z face
  ];

  const boundingRadius = Math.sqrt(
    halfX * halfX + halfY * halfY + halfZ * halfZ,
  );

  return {
    type: 'hullCollider',
    planes,
    boundingRadius,
    mass,
    useHullForWeapons: false,
  };
}

describe('Hull vs Hull Collision Detection', () => {
  it('detects collision between overlapping hulls', () => {
    const hullA = createTestBoxHull(10, 10, 10);
    const hullB = createTestBoxHull(10, 10, 10);

    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(15, 0, 0); // Overlapping by ~5 units
    const rot = new Quaternion();

    const result = testHullVsHull(hullA, posA, rot, 1, hullB, posB, rot, 1);

    assert.strictEqual(result.collided, true, 'Should detect collision');
    assert.ok(result.penetration > 0, 'Penetration should be positive');
  });

  it('does not detect collision for separated hulls', () => {
    const hullA = createTestBoxHull(10, 10, 10);
    const hullB = createTestBoxHull(10, 10, 10);

    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(30, 0, 0); // Well separated
    const rot = new Quaternion();

    const result = testHullVsHull(hullA, posA, rot, 1, hullB, posB, rot, 1);

    assert.strictEqual(result.collided, false, 'Should not detect collision');
  });

  it('detects deeply penetrated hulls', () => {
    const hullA = createTestBoxHull(10, 10, 10);
    const hullB = createTestBoxHull(10, 10, 10);

    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(5, 0, 0); // Centers very close - deep penetration
    const rot = new Quaternion();

    const result = testHullVsHull(hullA, posA, rot, 1, hullB, posB, rot, 1);

    assert.strictEqual(result.collided, true, 'Should detect deep penetration');
    assert.ok(result.penetration > 10, 'Deep penetration should be large');
  });
});

describe('Sphere vs Hull Collision Detection', () => {
  it('detects projectile inside hull', () => {
    const hull = createTestBoxHull(20, 15, 40);
    const hullPos = new Vector3(0, 0, 0);
    const hullRot = new Quaternion();

    // Projectile inside the hull
    const sphereCenter = new Vector3(5, 0, 0);
    const sphereRadius = 1;

    const result = testSphereVsHull(
      sphereCenter,
      sphereRadius,
      hull,
      hullPos,
      hullRot,
      1,
    );

    assert.strictEqual(
      result.collided,
      true,
      'Should detect projectile inside hull',
    );
    assert.ok(result.penetration > 0, 'Penetration should be positive');
  });

  it('detects projectile touching hull surface', () => {
    const hull = createTestBoxHull(10, 10, 10);
    const hullPos = new Vector3(0, 0, 0);
    const hullRot = new Quaternion();

    // Projectile just touching the +X face (face at x=10, projectile center at x=10)
    const sphereCenter = new Vector3(10, 0, 0);
    const sphereRadius = 2;

    const result = testSphereVsHull(
      sphereCenter,
      sphereRadius,
      hull,
      hullPos,
      hullRot,
      1,
    );

    assert.strictEqual(
      result.collided,
      true,
      'Should detect projectile touching surface',
    );
    assert.ok(
      result.penetration > 0 && result.penetration <= 2,
      `Penetration should be ~radius (got ${result.penetration})`,
    );
  });

  it('does not detect projectile outside hull', () => {
    const hull = createTestBoxHull(10, 10, 10);
    const hullPos = new Vector3(0, 0, 0);
    const hullRot = new Quaternion();

    // Projectile well outside the hull
    const sphereCenter = new Vector3(20, 0, 0);
    const sphereRadius = 2;

    const result = testSphereVsHull(
      sphereCenter,
      sphereRadius,
      hull,
      hullPos,
      hullRot,
      1,
    );

    assert.strictEqual(
      result.collided,
      false,
      'Should not detect projectile outside hull',
    );
  });

  it('handles rotated hull correctly', () => {
    const hull = createTestBoxHull(10, 5, 20); // Long in Z
    const hullPos = new Vector3(0, 0, 0);
    // Rotate 90 degrees around Y - now long in X
    const hullRot = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 2,
    );

    // Projectile at what would be outside unrotated hull, but inside rotated hull
    const sphereCenter = new Vector3(15, 0, 0); // Would miss Z=20 box, but hits rotated X=20
    const sphereRadius = 1;

    const result = testSphereVsHull(
      sphereCenter,
      sphereRadius,
      hull,
      hullPos,
      hullRot,
      1,
    );

    assert.strictEqual(
      result.collided,
      true,
      'Should detect collision with rotated hull',
    );
  });

  it('respects hull scale', () => {
    const hull = createTestBoxHull(10, 10, 10);
    const hullPos = new Vector3(0, 0, 0);
    const hullRot = new Quaternion();

    // Projectile at x=15, outside unscaled hull (extends to 10), but inside 2x scaled hull
    const sphereCenter = new Vector3(15, 0, 0);
    const sphereRadius = 1;

    const resultUnscaled = testSphereVsHull(
      sphereCenter,
      sphereRadius,
      hull,
      hullPos,
      hullRot,
      1,
    );
    const resultScaled = testSphereVsHull(
      sphereCenter,
      sphereRadius,
      hull,
      hullPos,
      hullRot,
      2,
    );

    assert.strictEqual(
      resultUnscaled.collided,
      false,
      'Should miss unscaled hull',
    );
    assert.strictEqual(resultScaled.collided, true, 'Should hit scaled hull');
  });
});
