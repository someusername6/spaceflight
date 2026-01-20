/**
 * Ray Collision Detection - Swept collision for fast-moving projectiles.
 *
 * Uses the slab method for ray-vs-hull: the hull is the intersection of
 * half-spaces defined by face planes. We find where the ray enters/exits
 * each half-space to determine if it passes through the hull.
 */

import { Quaternion, Ray, Vector3 } from 'three';
import type {
  HullCollider,
  HullPlane,
  SubHull,
} from '../components/hull-collider';
import { type HullCollisionResult, noCollisionResult } from './hull-collision';

// Reusable objects for ray intersection (avoid per-frame allocations)
const _ray = new Ray();
const _localOrigin = new Vector3();
const _localDir = new Vector3();
const _inverseQuat = new Quaternion();
const _toHull = new Vector3();

const _rayResult: HullCollisionResult = {
  collided: false,
  penetration: 0,
  normal: new Vector3(),
};

const _hullRayResult: HullCollisionResult = {
  collided: false,
  penetration: 0,
  normal: new Vector3(),
};

/**
 * Test if a ray intersects a sphere (swept collision detection).
 * Uses quadratic formula: solve |O + t*D - C|² = r²
 */
export function testRayVsSphere(
  rayOrigin: Vector3,
  rayDir: Vector3,
  rayLength: number,
  rayRadius: number,
  sphereCenter: Vector3,
  sphereRadius: number,
): HullCollisionResult {
  const combinedRadius = sphereRadius + rayRadius;

  // Vector from sphere center to ray origin
  const ocX = rayOrigin.x - sphereCenter.x;
  const ocY = rayOrigin.y - sphereCenter.y;
  const ocZ = rayOrigin.z - sphereCenter.z;

  // Quadratic: a=1 (normalized dir), b=2*(oc·D), c=oc·oc-r²
  const b = 2 * (ocX * rayDir.x + ocY * rayDir.y + ocZ * rayDir.z);
  const c = ocX * ocX + ocY * ocY + ocZ * ocZ - combinedRadius * combinedRadius;
  const discriminant = b * b - 4 * c;

  if (discriminant < 0) {
    _rayResult.collided = false;
    return _rayResult;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / 2; // Entry
  const t2 = (-b + sqrtDisc) / 2; // Exit

  if (t1 > rayLength || t2 < 0) {
    _rayResult.collided = false;
    return _rayResult;
  }

  // Collision - compute normal from hit point
  const tHit = t1 >= 0 ? t1 : 0;
  const nx = rayOrigin.x + rayDir.x * tHit - sphereCenter.x;
  const ny = rayOrigin.y + rayDir.y * tHit - sphereCenter.y;
  const nz = rayOrigin.z + rayDir.z * tHit - sphereCenter.z;
  const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);

  _rayResult.collided = true;
  _rayResult.penetration = Math.min(t2, rayLength) - Math.max(t1, 0);
  if (nLen > 0.001) {
    _rayResult.normal.set(nx / nLen, ny / nLen, nz / nLen);
  } else {
    _rayResult.normal.copy(rayDir);
  }
  return _rayResult;
}

/** Result from slab method plane testing */
interface SlabResult {
  tEnter: number;
  tExit: number;
  hitPlane: HullPlane;
}

/**
 * Slab method: test ray against planes defining a convex hull.
 * Returns entry/exit t values and hit plane, or null if no intersection.
 */
function testRayVsPlanes(
  origin: Vector3,
  dir: Vector3,
  rayLength: number,
  expandRadius: number,
  planes: HullPlane[],
): SlabResult | null {
  let tEnter = 0;
  let tExit = rayLength;
  let hitPlane: HullPlane | null = null;

  for (const plane of planes) {
    const expandedD = plane.d + expandRadius;
    const denom = plane.nx * dir.x + plane.ny * dir.y + plane.nz * dir.z;
    const numer =
      expandedD -
      (plane.nx * origin.x + plane.ny * origin.y + plane.nz * origin.z);

    if (Math.abs(denom) < 1e-10) {
      // Parallel to plane - outside means no intersection
      if (numer < 0) return null;
      continue;
    }

    const t = numer / denom;
    if (denom < 0) {
      // Entering half-space
      if (t > tEnter) {
        tEnter = t;
        hitPlane = plane;
      }
    } else {
      // Exiting half-space
      if (t < tExit) tExit = t;
    }

    if (tEnter > tExit) return null;
  }

  if (tEnter > rayLength || tExit < 0) return null;

  // Ray started inside hull - find exit plane for normal
  if (!hitPlane) {
    let minExitT = Infinity;
    for (const plane of planes) {
      const denom = plane.nx * dir.x + plane.ny * dir.y + plane.nz * dir.z;
      if (denom > 1e-10) {
        const expandedD = plane.d + expandRadius;
        const numer =
          expandedD -
          (plane.nx * origin.x + plane.ny * origin.y + plane.nz * origin.z);
        const t = numer / denom;
        if (t < minExitT && t >= 0) {
          minExitT = t;
          hitPlane = plane;
        }
      }
    }
  }

  return hitPlane ? { tEnter, tExit, hitPlane } : null;
}

/**
 * Test ray vs convex hull using the slab method.
 * Mathematically exact - no sampling artifacts.
 */
export function testRayVsHull(
  rayOrigin: Vector3,
  rayDir: Vector3,
  rayLength: number,
  rayRadius: number,
  hull: HullCollider,
  hullPosition: Vector3,
  hullRotation: Quaternion,
  hullScale: number,
): HullCollisionResult {
  if (hullScale <= 0) return noCollisionResult;

  // Early out: bounding sphere check using Three.js Ray
  _ray.origin.copy(rayOrigin);
  _ray.direction.copy(rayDir);
  const boundingDist = _ray.distanceToPoint(hullPosition);
  const maxDist = hull.boundingRadius * hullScale + rayRadius;
  if (boundingDist > maxDist) return noCollisionResult;

  // Also check ray length reaches the hull
  _toHull.copy(hullPosition).sub(rayOrigin);
  const projDist = _toHull.dot(rayDir);
  if (projDist > rayLength + maxDist || projDist < -maxDist)
    return noCollisionResult;

  // Transform ray to hull local space
  _localOrigin.copy(rayOrigin).sub(hullPosition);
  _inverseQuat.copy(hullRotation).invert();
  _localOrigin.applyQuaternion(_inverseQuat).divideScalar(hullScale);
  _localDir.copy(rayDir).applyQuaternion(_inverseQuat);

  const localRayLength = rayLength / hullScale;
  const expandedRadius = rayRadius / hullScale;

  // Handle compound hulls
  if (hull.subHulls && hull.subHulls.length > 0) {
    return testRayVsSubHulls(
      _localOrigin,
      _localDir,
      localRayLength,
      expandedRadius,
      hull.subHulls,
      hullRotation,
      hullScale,
    );
  }

  const result = testRayVsPlanes(
    _localOrigin,
    _localDir,
    localRayLength,
    expandedRadius,
    hull.planes,
  );
  if (!result) return noCollisionResult;

  // Build result
  _hullRayResult.collided = true;
  const actualEntry = Math.max(0, result.tEnter);
  const actualExit = Math.min(localRayLength, result.tExit);
  _hullRayResult.penetration = (actualExit - actualEntry) * hullScale;
  _hullRayResult.normal.set(
    result.hitPlane.nx,
    result.hitPlane.ny,
    result.hitPlane.nz,
  );
  _hullRayResult.normal.applyQuaternion(hullRotation);
  return _hullRayResult;
}

/** Test ray against compound hull, returning earliest intersection. */
function testRayVsSubHulls(
  origin: Vector3,
  dir: Vector3,
  rayLength: number,
  expandRadius: number,
  subHulls: SubHull[],
  hullRotation: Quaternion,
  hullScale: number,
): HullCollisionResult {
  let earliestEntry = Infinity;
  let bestResult: SlabResult | null = null;

  for (const subHull of subHulls) {
    const result = testRayVsPlanes(
      origin,
      dir,
      rayLength,
      expandRadius,
      subHull.planes,
    );
    if (result && result.tEnter < earliestEntry) {
      earliestEntry = result.tEnter;
      bestResult = result;
    }
  }

  if (!bestResult) return noCollisionResult;

  _hullRayResult.collided = true;
  const actualEntry = Math.max(0, bestResult.tEnter);
  const actualExit = Math.min(rayLength, bestResult.tExit);
  _hullRayResult.penetration = (actualExit - actualEntry) * hullScale;
  _hullRayResult.normal.set(
    bestResult.hitPlane.nx,
    bestResult.hitPlane.ny,
    bestResult.hitPlane.nz,
  );
  _hullRayResult.normal.applyQuaternion(hullRotation);
  return _hullRayResult;
}
