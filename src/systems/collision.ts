/**
 * Collision System - Detects collisions between entities.
 *
 * Supports two collision modes:
 * - Sphere collision: Fast, used for projectiles and small ships
 * - Hull collision: Accurate convex hull, used for ship-ship and large ships
 *
 * Collision mode selection:
 * - Ship vs Ship: Hull collision (if both have hull colliders)
 * - Projectile vs Ship: Sphere (or hull if ship.useHullForWeapons)
 * - Missile vs Ship: Same as projectile
 *
 * Fast-moving projectiles use swept collision detection (ray-sphere intersection)
 * to prevent tunneling through targets.
 */

import { Vector3 } from 'three';
import { type Collision, createCollision } from '../components/collision';
import type { HullCollider } from '../components/hull-collider';
import type { Missile } from '../components/missile';
import type { Projectile } from '../components/projectile';
import type { Transform } from '../components/transform';
import {
  addComponent,
  getComponent,
  hasComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { SHIP_MODEL_SCALE } from '../rendering/constants';
import {
  type HullCollisionResult,
  testHullVsHull,
  testSphereVsHull,
} from './hull-collision';
import { testRayVsHull, testRayVsSphere } from './ray-collision';

// Re-export for backward compatibility
export { type Collision, createCollision } from '../components/collision';

// Reusable result object for sphere-sphere collisions (avoids allocation in hot path)
const _sphereCollisionResult: HullCollisionResult = {
  collided: true,
  penetration: 0,
  normal: new Vector3(),
};

/** Info about a hull collision for response system */
export interface HullCollisionInfo {
  entityA: Entity;
  entityB: Entity;
  penetration: number;
}

/** Hull collisions detected this frame (consumed by response system) */
export const hullCollisions: HullCollisionInfo[] = [];

// Reusable vectors for swept collision
const _prevPosition = new Vector3();
const _rayDir = new Vector3();

// Pool for collidable info objects (avoid per-frame allocations)
interface CollidableInfo {
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
const collidablePool: CollidableInfo[] = [];

function getCollidableInfo(
  world: World,
  entity: Entity,
  transform: Transform,
  collision: Collision,
  hull: HullCollider | null,
  isProjectile: boolean,
  isMissile: boolean,
  speed: number,
  direction: Vector3 | null,
): CollidableInfo {
  const poolIndex = world.systemState.pools.collidable;
  if (poolIndex >= collidablePool.length) {
    collidablePool.push({
      entity: 0 as Entity,
      transform: null as unknown as Transform,
      collision: null as unknown as Collision,
      hull: null,
      isProjectile: false,
      isMissile: false,
      speed: 0,
      direction: null,
    });
  }
  const info = collidablePool[poolIndex] as CollidableInfo;
  world.systemState.pools.collidable++;
  info.entity = entity;
  info.transform = transform;
  info.collision = collision;
  info.hull = hull;
  info.isProjectile = isProjectile;
  info.isMissile = isMissile;
  info.speed = speed;
  info.direction = direction;
  return info;
}

// Reusable array for collidables (stores pool references)
const collidables: CollidableInfo[] = [];

/**
 * Check collision between two entities, using appropriate method.
 * Returns collision result if detected, null otherwise.
 *
 * For fast-moving projectiles/missiles, uses swept collision detection
 * (ray intersection) to prevent tunneling through targets.
 */
function checkCollision(
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

/** Collision detection system */
export function collisionSystem(world: World, dt: number): void {
  // Clear previous frame's collisions and hull collision list
  hullCollisions.length = 0;
  for (const entity of queryEntities(world, ['collision'])) {
    const collision = getComponent(world, entity, 'collision');
    if (collision) collision.collidedWith.length = 0; // Clear without allocation
  }

  // Reset pool and clear collidables array
  world.systemState.pools.collidable = 0;
  collidables.length = 0;

  for (const entity of queryEntities(world, ['transform', 'collision'])) {
    const transform = getComponent(world, entity, 'transform');
    const collision = getComponent(world, entity, 'collision');
    if (!transform || !collision) continue;
    const hull = getComponent(world, entity, 'hullCollider') ?? null;
    const isProjectile = hasComponent(world, entity, 'projectile');
    const isMissile = hasComponent(world, entity, 'missile');

    // Extract speed and direction for swept collision detection
    let speed = 0;
    let direction: Vector3 | null = null;

    if (isProjectile) {
      const proj = getComponent(world, entity, 'projectile') as Projectile;
      if (proj) {
        speed = proj.speed;
        direction = proj.direction;
      }
    } else if (isMissile) {
      const missile = getComponent(world, entity, 'missile') as Missile;
      if (missile) {
        speed = missile.speed;
        direction = missile.direction;
      }
    }

    collidables.push(
      getCollidableInfo(
        world,
        entity,
        transform,
        collision,
        hull,
        isProjectile,
        isMissile,
        speed,
        direction,
      ),
    );
  }

  // Check all pairs - O(n²) but appropriate for this game's scale:
  // - Typical combat: 5-8 ships + 10-20 missiles = ~15-30 entities
  // - 30 entities = 435 pair checks = <0.1ms per frame
  // - Spatial partitioning (grid/octree) has overhead that only pays off at 100+ entities
  // - If scaling beyond 100 collidables: profile first, then try spatial hash grid
  for (let i = 0; i < collidables.length; i++) {
    for (let j = i + 1; j < collidables.length; j++) {
      const a = collidables[i] as (typeof collidables)[0];
      const b = collidables[j] as (typeof collidables)[0];

      const result = checkCollision(a, b, dt);
      if (result) {
        // Collision detected
        a.collision.collidedWith.push(b.entity);
        b.collision.collidedWith.push(a.entity);

        // Track hull collisions for response system (ship-ship only)
        if (
          a.hull &&
          b.hull &&
          !a.isProjectile &&
          !a.isMissile &&
          !b.isProjectile &&
          !b.isMissile
        ) {
          hullCollisions.push({
            entityA: a.entity,
            entityB: b.entity,
            penetration: result.penetration,
          });
        }
      }
    }
  }
}

/** Check if entity collided with anything this frame */
export function hasCollision(world: World, entity: Entity): boolean {
  const collision = getComponent(world, entity, 'collision');
  return collision !== undefined && collision.collidedWith.length > 0;
}

/** Get entities this entity collided with */
export function getCollisions(world: World, entity: Entity): Entity[] {
  const collision = getComponent(world, entity, 'collision');
  return collision?.collidedWith ?? [];
}

/** Ensure entity has collision component */
export function ensureCollision(
  world: World,
  entity: Entity,
  radius?: number,
): void {
  if (!hasComponent(world, entity, 'collision')) {
    addComponent(world, entity, createCollision(radius));
  }
}
