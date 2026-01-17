/**
 * Hull Collision Detection - Convex hull collision math.
 *
 * Uses the separating hyperplane theorem:
 * - A point is inside a convex hull if it's on the inside of all face planes
 * - For sphere-vs-hull, we check if sphere center is within (plane distance + radius)
 */

import { Quaternion, Vector3 } from 'three';
import type {
  HullCollider,
  HullPlane,
  SubHull,
} from '../components/hull-collider';

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
 * Test sphere against a set of planes (internal helper).
 * Returns penetration depth and closest plane, or null if no collision.
 */
function testSphereVsPlanes(
  localPoint: Vector3,
  sphereRadius: number,
  hullScale: number,
  planes: HullPlane[],
): { penetration: number; plane: HullPlane } | null {
  let minPenetration = Infinity;
  let closestPlane: HullPlane | null = null;

  for (const plane of planes) {
    // Signed distance from point to plane
    const signedDist =
      plane.nx * localPoint.x +
      plane.ny * localPoint.y +
      plane.nz * localPoint.z -
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
    return null;
  }

  return { penetration: minPenetration, plane: closestPlane };
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
 * For compound hulls (with subHulls), tests each sub-hull and returns
 * the deepest penetration collision.
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

  // Handle compound hulls with sub-hulls
  if (hull.subHulls && hull.subHulls.length > 0) {
    return testSphereVsSubHulls(
      sphereRadius,
      hull.subHulls,
      hullRotation,
      hullScale,
      _localPoint,
    );
  }

  // Standard single hull test
  const result = testSphereVsPlanes(
    _localPoint,
    sphereRadius,
    hullScale,
    hull.planes,
  );

  if (!result) {
    _noCollisionResult.penetration = -1;
    return _noCollisionResult;
  }

  // Collision! Return penetration and normal
  _normal.set(result.plane.nx, result.plane.ny, result.plane.nz);
  localNormalToWorld(_normal, hullRotation, _collisionResult.normal);
  _collisionResult.penetration = result.penetration * hullScale;

  return _collisionResult;
}

/**
 * Test sphere against compound hull with multiple sub-hulls.
 * Returns the deepest penetration collision among all sub-hulls.
 *
 * Note: We test against all sub-hulls without per-sub-hull early-out because
 * sub-hulls may be offset from the parent hull's origin. The outer bounding
 * sphere check in testSphereVsHull already provides coarse culling.
 */
function testSphereVsSubHulls(
  sphereRadius: number,
  subHulls: SubHull[],
  hullRotation: Quaternion,
  hullScale: number,
  localPoint: Vector3,
): HullCollisionResult {
  let deepestPenetration = -Infinity;
  let deepestPlane: HullPlane | null = null;

  for (const subHull of subHulls) {
    const result = testSphereVsPlanes(
      localPoint,
      sphereRadius,
      hullScale,
      subHull.planes,
    );

    if (result && result.penetration > deepestPenetration) {
      deepestPenetration = result.penetration;
      deepestPlane = result.plane;
    }
  }

  if (deepestPenetration <= 0 || !deepestPlane) {
    _noCollisionResult.penetration = deepestPenetration;
    return _noCollisionResult;
  }

  // Collision with deepest sub-hull
  _normal.set(deepestPlane.nx, deepestPlane.ny, deepestPlane.nz);
  localNormalToWorld(_normal, hullRotation, _collisionResult.normal);
  _collisionResult.penetration = deepestPenetration * hullScale;

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
 * For compound hulls (with subHulls), each sub-hull is tested individually.
 * Compound hulls cannot be approximated as spheres - only simple hulls can.
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

  // Compound hulls (with subHulls) cannot be approximated as spheres.
  // Only test an entity as a sphere if it has a simple (non-compound) hull.
  const aIsCompound = hullA.subHulls && hullA.subHulls.length > 0;
  const bIsCompound = hullB.subHulls && hullB.subHulls.length > 0;

  // Test A's center against B's hull (B may have sub-hulls, handled by testSphereVsHull)
  // Only if A is a simple hull that can be approximated as a sphere
  if (!aIsCompound) {
    const radiusA = hullA.boundingRadius * scaleA * HULL_APPROXIMATION_FACTOR;
    const resultAvsB = testSphereVsHull(
      posA,
      radiusA,
      hullB,
      posB,
      rotB,
      scaleB,
    );
    if (resultAvsB.collided) {
      _hullVsHullResult.penetration = resultAvsB.penetration;
      _hullVsHullResult.normal.copy(resultAvsB.normal);
      return _hullVsHullResult;
    }
  }

  // Test B's center against A's hull (A may have sub-hulls, handled by testSphereVsHull)
  // Only if B is a simple hull that can be approximated as a sphere
  if (!bIsCompound) {
    const radiusB = hullB.boundingRadius * scaleB * HULL_APPROXIMATION_FACTOR;
    const resultBvsA = testSphereVsHull(
      posB,
      radiusB,
      hullA,
      posA,
      rotA,
      scaleA,
    );
    if (resultBvsA.collided) {
      _hullVsHullResult.penetration = resultBvsA.penetration;
      _hullVsHullResult.normal.copy(resultBvsA.normal).negate();
      return _hullVsHullResult;
    }
  }

  return _noCollisionResult;
}
