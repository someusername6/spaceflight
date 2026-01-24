/**
 * Collision Check - Low-level collision detection between two collidables.
 *
 * Extracted from collision.ts to keep files under 400 lines.
 * Contains the core collision detection algorithms:
 * - Hull vs Hull (ship-ship)
 * - Sphere vs Hull (weapon vs large ship)
 * - Sphere vs Sphere (default)
 * - Swept collision (ray-based) for fast-moving projectiles
 */

import { Vector3 } from 'three';
import type { Collision } from '../components/collision';
import type { HullCollider } from '../components/hull-collider';
import type { Transform } from '../components/transform';
import type { Entity } from '../core/types';
import { SHIP_MODEL_SCALE } from '../rendering/constants';
import {
  type HullCollisionResult,
  testHullVsHull,
  testSphereVsHull,
} from './hull-collision';
import { testRayVsHull, testRayVsSphere } from './ray-collision';

/** Information about a collidable entity for collision detection */
export interface CollidableInfo {
  entity: Entity;
  transform: Transform;
  collision: Collision;
  hull: HullCollider | null;
  isProjectile: boolean;
  isMissile: boolean;
  /** Speed of projectile/missile (0 for non-weapons) */
  speed: number;
  /** Direction of movement (only valid for projectiles/missiles) */
  direction: Vector3 | null;
}

// Reusable result object for sphere-sphere collisions (avoids allocation in hot path)
const _sphereCollisionResult: HullCollisionResult = {
  collided: true,
  penetration: 0,
  normal: new Vector3(),
};

// Reusable vectors for swept collision
const _prevPosition = new Vector3();
const _rayDir = new Vector3();

/**
 * Check collision between two entities, using appropriate method.
 * Returns collision result if detected, null otherwise.
 *
 * For fast-moving projectiles/missiles, uses swept collision detection
 * (ray intersection) to prevent tunneling through targets.
 */
export function checkCollision(
  a: CollidableInfo,
  b: CollidableInfo,
  dt: number,
): HullCollisionResult | null {
  const aIsWeapon = a.isProjectile || a.isMissile;
  const bIsWeapon = b.isProjectile || b.isMissile;

  // Case 1: Ship vs Ship (both have hulls)
  if (a.hull && b.hull && !aIsWeapon && !bIsWeapon) {
    const result = testHullVsHull(
      a.hull,
      a.transform.position,
      a.transform.rotation,
      SHIP_MODEL_SCALE,
      b.hull,
      b.transform.position,
      b.transform.rotation,
      SHIP_MODEL_SCALE,
    );
    return result.collided ? result : null;
  }

  // Case 2: Weapon vs Ship with hull (if ship uses hull for weapons)
  if (aIsWeapon && b.hull?.useHullForWeapons) {
    // Check if weapon needs swept collision (fast enough to tunnel)
    const distanceTraveled = a.speed * dt;
    const needsSwept =
      distanceTraveled > a.collision.radius + b.collision.radius;

    if (needsSwept && a.direction) {
      // Compute previous position
      _prevPosition.copy(a.transform.position);
      _prevPosition.addScaledVector(a.direction, -distanceTraveled);
      _rayDir.copy(a.direction);

      const result = testRayVsHull(
        _prevPosition,
        _rayDir,
        distanceTraveled,
        a.collision.radius,
        b.hull,
        b.transform.position,
        b.transform.rotation,
        SHIP_MODEL_SCALE,
      );
      return result.collided ? result : null;
    }

    // Standard sphere-vs-hull test
    const result = testSphereVsHull(
      a.transform.position,
      a.collision.radius,
      b.hull,
      b.transform.position,
      b.transform.rotation,
      SHIP_MODEL_SCALE,
    );
    return result.collided ? result : null;
  }

  if (bIsWeapon && a.hull?.useHullForWeapons) {
    // Check if weapon needs swept collision
    const distanceTraveled = b.speed * dt;
    const needsSwept =
      distanceTraveled > b.collision.radius + a.collision.radius;

    if (needsSwept && b.direction) {
      // Compute previous position
      _prevPosition.copy(b.transform.position);
      _prevPosition.addScaledVector(b.direction, -distanceTraveled);
      _rayDir.copy(b.direction);

      const result = testRayVsHull(
        _prevPosition,
        _rayDir,
        distanceTraveled,
        b.collision.radius,
        a.hull,
        a.transform.position,
        a.transform.rotation,
        SHIP_MODEL_SCALE,
      );
      if (result.collided) {
        result.normal.negate(); // Flip normal for consistent direction
      }
      return result.collided ? result : null;
    }

    // Standard sphere-vs-hull test
    const result = testSphereVsHull(
      b.transform.position,
      b.collision.radius,
      a.hull,
      a.transform.position,
      a.transform.rotation,
      SHIP_MODEL_SCALE,
    );
    if (result.collided) {
      result.normal.negate();
    }
    return result.collided ? result : null;
  }

  // Case 3: Default sphere-sphere collision (with swept detection for fast weapons)
  const aDistanceTraveled = aIsWeapon ? a.speed * dt : 0;
  const bDistanceTraveled = bIsWeapon ? b.speed * dt : 0;
  const combinedRadius = a.collision.radius + b.collision.radius;

  // Check if either weapon is fast enough to need swept collision
  if (aDistanceTraveled > combinedRadius && a.direction) {
    // Fast-moving 'a' (weapon) vs slow 'b' (target)
    _prevPosition.copy(a.transform.position);
    _prevPosition.addScaledVector(a.direction, -aDistanceTraveled);
    _rayDir.copy(a.direction);

    const result = testRayVsSphere(
      _prevPosition,
      _rayDir,
      aDistanceTraveled,
      a.collision.radius,
      b.transform.position,
      b.collision.radius,
    );
    return result.collided ? result : null;
  }

  if (bDistanceTraveled > combinedRadius && b.direction) {
    // Fast-moving 'b' (weapon) vs slow 'a' (target)
    _prevPosition.copy(b.transform.position);
    _prevPosition.addScaledVector(b.direction, -bDistanceTraveled);
    _rayDir.copy(b.direction);

    const result = testRayVsSphere(
      _prevPosition,
      _rayDir,
      bDistanceTraveled,
      b.collision.radius,
      a.transform.position,
      a.collision.radius,
    );
    if (result.collided) {
      result.normal.negate(); // Flip normal
    }
    return result.collided ? result : null;
  }

  // Standard sphere-sphere test
  const dist = a.transform.position.distanceTo(b.transform.position);

  if (dist < combinedRadius) {
    _sphereCollisionResult.penetration = combinedRadius - dist;
    _sphereCollisionResult.normal
      .copy(b.transform.position)
      .sub(a.transform.position)
      .normalize();
    return _sphereCollisionResult;
  }

  return null;
}
