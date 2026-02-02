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

import type { Vector3 } from 'three';
import type { Collision } from '../components/collision';
import type { HullCollider } from '../components/hull-collider';
import type { Missile } from '../components/missile';
import type { Projectile } from '../components/projectile';
import type { Transform } from '../components/transform';
import { getComponent, hasComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { type CollidableInfo, checkCollision } from './collision-check';

// Re-export for backward compatibility
export { type Collision, createCollision } from '../components/collision';

/** Info about a hull collision for response system */
export interface HullCollisionInfo {
  entityA: Entity;
  entityB: Entity;
  penetration: number;
}

/** Hull collisions detected this frame (consumed by response system) */
const hullCollisions: HullCollisionInfo[] = [];

/** Get hull collisions detected this frame (read-only for response system) */
export function getHullCollisions(): readonly HullCollisionInfo[] {
  return hullCollisions;
}

// Pool for collidable info objects (avoid per-frame allocations)
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
