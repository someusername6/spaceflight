/**
 * Ray vs Sphere Collision Tests - Verify ray intersection with spheres.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { testRayVsSphere } from '../../../src/systems/ray-collision.ts';

// ============================================================================
// Tests: Ray vs Sphere
// ============================================================================

describe('Ray vs Sphere - Basic Intersection', () => {
  it('ray hits sphere directly ahead', () => {
    const rayOrigin = new Vector3(0, 0, -100);
    const rayDir = new Vector3(0, 0, 1);
    const sphereCenter = new Vector3(0, 0, 0);
    const sphereRadius = 10;

    const result = testRayVsSphere(
      rayOrigin,
      rayDir,
      200,
      1,
      sphereCenter,
      sphereRadius,
    );

    assert.ok(result.collided, 'Ray should hit sphere');
    assert.ok(result.penetration > 0, 'Penetration should be positive');
  });

  it('ray misses sphere to the side', () => {
    const rayOrigin = new Vector3(50, 0, -100);
    const rayDir = new Vector3(0, 0, 1);
    const sphereCenter = new Vector3(0, 0, 0);
    const sphereRadius = 10;

    const result = testRayVsSphere(
      rayOrigin,
      rayDir,
      200,
      1,
      sphereCenter,
      sphereRadius,
    );

    assert.ok(!result.collided, 'Ray should miss sphere');
  });

  it('ray too short to reach sphere', () => {
    const rayOrigin = new Vector3(0, 0, -100);
    const rayDir = new Vector3(0, 0, 1);
    const sphereCenter = new Vector3(0, 0, 0);
    const sphereRadius = 10;

    const result = testRayVsSphere(
      rayOrigin,
      rayDir,
      50,
      1,
      sphereCenter,
      sphereRadius,
    );

    assert.ok(!result.collided, 'Ray should not reach sphere');
  });

  it('thick ray (with radius) hits sphere it would otherwise miss', () => {
    const rayOrigin = new Vector3(15, 0, -100);
    const rayDir = new Vector3(0, 0, 1);
    const sphereCenter = new Vector3(0, 0, 0);
    const sphereRadius = 10;

    // Without ray radius, this would miss (15 > 10)
    const resultThin = testRayVsSphere(
      rayOrigin,
      rayDir,
      200,
      0,
      sphereCenter,
      sphereRadius,
    );
    assert.ok(!resultThin.collided, 'Thin ray should miss');

    // With ray radius of 10, combined radius is 20, so 15 < 20 hits
    const resultThick = testRayVsSphere(
      rayOrigin,
      rayDir,
      200,
      10,
      sphereCenter,
      sphereRadius,
    );
    assert.ok(resultThick.collided, 'Thick ray should hit');
  });
});
