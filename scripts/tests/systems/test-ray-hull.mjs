/**
 * Ray vs Hull Collision Tests - Basic box, thin slab, and thick ray tests.
 *
 * Tests the slab method implementation for ray-vs-hull intersection,
 * ensuring fast projectiles don't tunnel through targets.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { testRayVsHull } from '../../../src/systems/ray-collision.ts';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple box hull (6 planes forming an axis-aligned box).
 * Box extends from -halfSize to +halfSize on each axis.
 */
function createBoxHull(halfSizeX, halfSizeY, halfSizeZ) {
  return {
    type: 'hullCollider',
    planes: [
      { nx: 1, ny: 0, nz: 0, d: halfSizeX }, // +X face
      { nx: -1, ny: 0, nz: 0, d: halfSizeX }, // -X face
      { nx: 0, ny: 1, nz: 0, d: halfSizeY }, // +Y face
      { nx: 0, ny: -1, nz: 0, d: halfSizeY }, // -Y face
      { nx: 0, ny: 0, nz: 1, d: halfSizeZ }, // +Z face
      { nx: 0, ny: 0, nz: -1, d: halfSizeZ }, // -Z face
    ],
    boundingRadius: Math.sqrt(
      halfSizeX * halfSizeX + halfSizeY * halfSizeY + halfSizeZ * halfSizeZ,
    ),
    mass: halfSizeX * halfSizeY * halfSizeZ * 8,
    useHullForWeapons: true,
  };
}

/**
 * Create a thin slab hull (a very flat box).
 * This tests the case that the old sampling method would miss.
 */
function createThinSlabHull(width, height, thickness) {
  return createBoxHull(width / 2, height / 2, thickness / 2);
}

const identityQuat = new Quaternion();

// ============================================================================
// Tests: Ray vs Hull - Basic Box
// ============================================================================

describe('Ray vs Hull - Basic Box Intersection', () => {
  it('ray hits box directly ahead', () => {
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
      1,
    );

    assert.ok(result.collided, 'Ray should hit box');
    assert.ok(result.penetration > 0, 'Penetration should be positive');
    // Normal should point toward -Z (the face we hit)
    assert.ok(result.normal.z < 0, 'Normal should point toward ray origin');
  });

  it('ray misses box to the side', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(50, 0, -50);
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

    assert.ok(!result.collided, 'Ray should miss box');
  });

  it('ray too short to reach box', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      30,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(!result.collided, 'Ray should not reach box');
  });

  it('ray hits box from different angles', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    // From +X
    const result1 = testRayVsHull(
      new Vector3(50, 0, 0),
      new Vector3(-1, 0, 0),
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );
    assert.ok(result1.collided, 'Ray from +X should hit');
    assert.ok(result1.normal.x > 0, 'Normal should point toward +X');

    // From +Y
    const result2 = testRayVsHull(
      new Vector3(0, 50, 0),
      new Vector3(0, -1, 0),
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );
    assert.ok(result2.collided, 'Ray from +Y should hit');
    assert.ok(result2.normal.y > 0, 'Normal should point toward +Y');

    // From -Z
    const result3 = testRayVsHull(
      new Vector3(0, 0, -50),
      new Vector3(0, 0, 1),
      100,
      1,
      hull,
      hullPosition,
      identityQuat,
      1,
    );
    assert.ok(result3.collided, 'Ray from -Z should hit');
    assert.ok(result3.normal.z < 0, 'Normal should point toward -Z');
  });
});

// ============================================================================
// Tests: Ray vs Hull - Thin Slab (Critical Test)
// ============================================================================

describe('Ray vs Hull - Thin Slab (Anti-Tunneling)', () => {
  it('ray hits very thin slab that sampling would miss', () => {
    // Create a slab that's 100x100 but only 0.1 units thick
    // The old sampling method with spacing > 0.1 would miss this
    const hull = createThinSlabHull(100, 100, 0.1);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      0.5,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(
      result.collided,
      'Ray should hit thin slab (slab method must not miss)',
    );
  });

  it('ray hits thin slab at grazing angle', () => {
    const hull = createThinSlabHull(100, 100, 1);
    const hullPosition = new Vector3(0, 0, 0);

    // Ray approaches at a steep angle
    const rayOrigin = new Vector3(-40, 0, -10);
    const rayDir = new Vector3(1, 0, 0.1).normalize();

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      0.5,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(result.collided, 'Ray should hit thin slab at grazing angle');
  });

  it('fast projectile through thin hull is detected', () => {
    // Simulate a railgun projectile (2000 m/s) traveling for 1/60th of a second
    // Distance: 2000 * (1/60) = 33.3 meters
    const hull = createThinSlabHull(50, 50, 2);
    const hullPosition = new Vector3(0, 0, 0);

    const rayOrigin = new Vector3(0, 0, -20);
    const rayDir = new Vector3(0, 0, 1);
    const rayLength = 33.3; // Distance traveled in one frame at 2000 m/s

    const result = testRayVsHull(
      rayOrigin,
      rayDir,
      rayLength,
      0.5,
      hull,
      hullPosition,
      identityQuat,
      1,
    );

    assert.ok(result.collided, 'Fast projectile should hit thin hull');
  });
});

// ============================================================================
// Tests: Ray vs Hull - Thick Ray (Projectile Radius)
// ============================================================================

describe('Ray vs Hull - Thick Ray (Projectile Radius)', () => {
  it('thick ray hits hull it would otherwise miss', () => {
    const hull = createBoxHull(10, 10, 10);
    const hullPosition = new Vector3(0, 0, 0);

    // Ray passes 15 units away from hull center
    const rayOrigin = new Vector3(15, 0, -50);
    const rayDir = new Vector3(0, 0, 1);

    // Thin ray misses (15 > 10)
    const resultThin = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      0,
      hull,
      hullPosition,
      identityQuat,
      1,
    );
    assert.ok(!resultThin.collided, 'Thin ray should miss');

    // Thick ray with radius 10 hits (plane expanded by 10, so 15 < 20)
    const resultThick = testRayVsHull(
      rayOrigin,
      rayDir,
      100,
      10,
      hull,
      hullPosition,
      identityQuat,
      1,
    );
    assert.ok(resultThick.collided, 'Thick ray should hit expanded hull');
  });
});
