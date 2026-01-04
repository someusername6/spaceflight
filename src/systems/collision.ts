/**
 * Collision System - Detects collisions between ships.
 *
 * Slice 1: Simple sphere-sphere collision only.
 */

import { type Collision, createCollision } from '../components/collision';
import type { Transform } from '../components/transform';
import {
  addComponent,
  getComponent,
  hasComponent,
  queryEntities,
} from '../core/ecs';
import type { Entity, World } from '../core/types';

// Re-export for backward compatibility
export { type Collision, createCollision } from '../components/collision';

// Pool for collidable info objects (avoid per-frame allocations)
interface CollidableInfo {
  entity: Entity;
  transform: Transform;
  collision: Collision;
}
const collidablePool: CollidableInfo[] = [];

function getCollidableInfo(
  world: World,
  entity: Entity,
  transform: Transform,
  collision: Collision,
): CollidableInfo {
  const poolIndex = world.systemState.pools.collidable;
  if (poolIndex >= collidablePool.length) {
    collidablePool.push({
      entity: 0 as Entity,
      transform: null as unknown as Transform,
      collision: null as unknown as Collision,
    });
  }
  const info = collidablePool[poolIndex] as CollidableInfo;
  world.systemState.pools.collidable++;
  info.entity = entity;
  info.transform = transform;
  info.collision = collision;
  return info;
}

// Reusable array for collidables (stores pool references)
const collidables: CollidableInfo[] = [];

/** Collision detection system */
export function collisionSystem(world: World, _dt: number): void {
  // Clear previous frame's collisions
  for (const entity of queryEntities(world, ['collision'])) {
    // Query guarantees this component exists
    const collision = getComponent<Collision>(
      world,
      entity,
      'collision',
    ) as Collision;
    collision.collidedWith.length = 0; // Clear without allocation
  }

  // Reset pool and clear collidables array
  world.systemState.pools.collidable = 0;
  collidables.length = 0;

  for (const entity of queryEntities(world, ['transform', 'collision'])) {
    // Query guarantees these components exist
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const collision = getComponent<Collision>(
      world,
      entity,
      'collision',
    ) as Collision;
    collidables.push(getCollidableInfo(world, entity, transform, collision));
  }

  // Check all pairs (O(n²) - fine for small entity counts)
  for (let i = 0; i < collidables.length; i++) {
    for (let j = i + 1; j < collidables.length; j++) {
      const a = collidables[i] as (typeof collidables)[0];
      const b = collidables[j] as (typeof collidables)[0];

      const dist = a.transform.position.distanceTo(b.transform.position);
      const minDist = a.collision.radius + b.collision.radius;

      if (dist < minDist) {
        // Collision detected
        a.collision.collidedWith.push(b.entity);
        b.collision.collidedWith.push(a.entity);
      }
    }
  }
}

/** Check if entity collided with anything this frame */
export function hasCollision(world: World, entity: Entity): boolean {
  const collision = getComponent<Collision>(world, entity, 'collision');
  return collision !== undefined && collision.collidedWith.length > 0;
}

/** Get entities this entity collided with */
export function getCollisions(world: World, entity: Entity): Entity[] {
  const collision = getComponent<Collision>(world, entity, 'collision');
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
