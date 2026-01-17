/**
 * Hull Collision Detection - Convex hull collision math.
 *
 * Uses the separating hyperplane theorem:
 * - A point is inside a convex hull if it's on the inside of all face planes
 * - For sphere-vs-hull, we check if sphere center is within (plane distance + radius)
 */

import { Quaternion, Vector3 } from 'three';
import type { HullCollider, HullPlane } from '../components/hull-collider';

/**
 * Result of a hull collision test.
 *
 * WARNING: Results from testSphereVsHull and testHullVsHull use shared
 * internal objects for performance. The result is only valid until the
 * next collision test call. Copy values immediately if you need to store them.
 */
export interface HullCollisionResult {
  /** Whether collision occurred */
  collided: boolean;
  /** Penetration depth (negative = separated) */
  penetration: number;
  /** Collision normal (points from B toward A) */
  normal: Vector3;
}

/**
 * Shrink factor for hull-vs-hull approximation.
 * We test each hull's center against the opposing hull using a shrunk bounding sphere.
 * 0.7 gives ~70% of bounding radius - tighter than full sphere but avoids
 * requiring exact hull-vs-hull SAT (which needs edge cross-product tests).
 */
const HULL_APPROXIMATION_FACTOR = 0.7;

// Reusable result object for non-collision returns (avoids allocation)
const _noCollisionResult: HullCollisionResult = {
  collided: false,
  penetration: -1,
  normal: new Vector3(),
};

// Reusable result object for collision returns
const _collisionResult: HullCollisionResult = {
  collided: true,
  penetration: 0,
  normal: new Vector3(),
};

// Reusable vectors to avoid allocations
const _localPoint = new Vector3();
const _normal = new Vector3();
const _inverseQuat = new Quaternion();

/**
 * Transform a world-space point into hull local space.
 */
function worldToLocal(
  worldPoint: Vector3,
  hullPosition: Vector3,
  hullRotation: Quaternion,
  out: Vector3,
): Vector3 {
  // Translate to hull origin
  out.copy(worldPoint).sub(hullPosition);
  // Rotate by inverse of hull rotation
  _inverseQuat.copy(hullRotation).invert();
  out.applyQuaternion(_inverseQuat);
  return out;
}

/**
 * Transform a local-space normal to world space.
 */
function localNormalToWorld(
  localNormal: Vector3,
  hullRotation: Quaternion,
  out: Vector3,
): Vector3 {
  out.copy(localNormal);
  out.applyQuaternion(hullRotation);
  return out;
}

/**
 * Test if a sphere collides with a convex hull.
 *
 * @param sphereCenter - Center of sphere in world space
 * @param sphereRadius - Radius of sphere
 * @param hull - Hull collider component
 * @param hullPosition - Hull position in world space
 * @param hullRotation - Hull rotation in world space
 * @param hullScale - Uniform scale applied to hull (must be > 0)
 * @returns Collision result with penetration and normal
 */
export function testSphereVsHull(
  sphereCenter: Vector3,
  sphereRadius: number,
  hull: HullCollider,
  hullPosition: Vector3,
  hullRotation: Quaternion,
  hullScale = 1,
): HullCollisionResult {
  // Guard against invalid scale
  if (hullScale <= 0) {
    return _noCollisionResult;
  }

  // Early out: bounding sphere check
  const boundingDist = sphereCenter.distanceTo(hullPosition);
  const maxDist = hull.boundingRadius * hullScale + sphereRadius;
  if (boundingDist > maxDist) {
    return _noCollisionResult;
  }

  // Transform sphere center to hull local space
  worldToLocal(sphereCenter, hullPosition, hullRotation, _localPoint);
  // Account for scale
  if (hullScale !== 1) {
    _localPoint.divideScalar(hullScale);
  }

  // Find the plane with maximum signed distance to sphere center
  // If this distance is > sphereRadius, sphere is outside hull
  let minPenetration = Infinity;
  let closestPlane: HullPlane | null = null;

  for (const plane of hull.planes) {
    // Signed distance from point to plane
    const signedDist =
      plane.nx * _localPoint.x +
      plane.ny * _localPoint.y +
      plane.nz * _localPoint.z -
      plane.d;

    // Penetration = how far sphere extends past this plane
    // Positive = sphere penetrates past plane
    const penetration = sphereRadius / hullScale - signedDist;

    if (penetration < minPenetration) {
      minPenetration = penetration;
      closestPlane = plane;
    }
  }

  if (minPenetration <= 0 || !closestPlane) {
    // Sphere is outside hull
    _noCollisionResult.penetration = minPenetration;
    return _noCollisionResult;
  }

  // Collision! Return penetration and normal
  _normal.set(closestPlane.nx, closestPlane.ny, closestPlane.nz);
  localNormalToWorld(_normal, hullRotation, _collisionResult.normal);
  _collisionResult.penetration = minPenetration * hullScale; // Scale back to world units

  return _collisionResult;
}

// Separate result objects for hull-vs-hull to avoid conflicts with sphere-vs-hull results
const _hullVsHullResult: HullCollisionResult = {
  collided: true,
  penetration: 0,
  normal: new Vector3(),
};

/**
 * Test if two convex hulls collide using separating axis theorem.
 *
 * This is a simplified version that checks face normals as potential separating axes.
 * For a full SAT implementation, we'd also check edge cross products.
 *
 * @param hullA - First hull collider
 * @param posA - First hull position
 * @param rotA - First hull rotation
 * @param scaleA - First hull scale (must be > 0)
 * @param hullB - Second hull collider
 * @param posB - Second hull position
 * @param rotB - Second hull rotation
 * @param scaleB - Second hull scale (must be > 0)
 * @returns Collision result
 */
export function testHullVsHull(
  hullA: HullCollider,
  posA: Vector3,
  rotA: Quaternion,
  scaleA: number,
  hullB: HullCollider,
  posB: Vector3,
  rotB: Quaternion,
  scaleB: number,
): HullCollisionResult {
  // Guard against invalid scale
  if (scaleA <= 0 || scaleB <= 0) {
    return _noCollisionResult;
  }

  // Early out: bounding sphere check
  const boundingDist = posA.distanceTo(posB);
  const maxDist = hullA.boundingRadius * scaleA + hullB.boundingRadius * scaleB;
  if (boundingDist > maxDist) {
    return _noCollisionResult;
  }

  // For ship-vs-ship, we approximate by treating each hull's center as a sphere
  // and testing against the opposing hull. This is faster than full SAT.
  const radiusA = hullA.boundingRadius * scaleA * HULL_APPROXIMATION_FACTOR;
  const radiusB = hullB.boundingRadius * scaleB * HULL_APPROXIMATION_FACTOR;

  // Test A's center against B's hull
  const resultAvsB = testSphereVsHull(posA, radiusA, hullB, posB, rotB, scaleB);
  if (resultAvsB.collided) {
    // Copy to our result to avoid returning shared _collisionResult
    _hullVsHullResult.penetration = resultAvsB.penetration;
    _hullVsHullResult.normal.copy(resultAvsB.normal);
    return _hullVsHullResult;
  }

  // Test B's center against A's hull
  const resultBvsA = testSphereVsHull(posB, radiusB, hullA, posA, rotA, scaleA);
  if (resultBvsA.collided) {
    // Copy and flip normal since we tested B against A
    _hullVsHullResult.penetration = resultBvsA.penetration;
    _hullVsHullResult.normal.copy(resultBvsA.normal).negate();
    return _hullVsHullResult;
  }

  return _noCollisionResult;
}
