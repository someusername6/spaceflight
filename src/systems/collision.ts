/**
 * Collision System - Detects collisions between ships.
 *
 * Slice 1: Simple sphere-sphere collision only.
 */

import type { World, Entity } from '../core/types';
import { queryEntities, getComponent, addComponent, hasComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import type { ComponentBase } from '../core/types';

/** Default collision radius for ships */
const DEFAULT_SHIP_RADIUS = 5;

/** Collision component - stores collision info for this frame */
export interface Collision extends ComponentBase {
  readonly type: 'collision';
  collidedWith: Entity[];
  radius: number;
}

/** Creates a Collision component */
export function createCollision(radius = DEFAULT_SHIP_RADIUS): Collision {
  return {
    type: 'collision',
    collidedWith: [],
    radius,
  };
}

/** Collision detection system */
export function collisionSystem(world: World, _dt: number): void {
  // Clear previous frame's collisions
  for (const entity of queryEntities(world, ['collision'])) {
    const collision = getComponent<Collision>(world, entity, 'collision')!;
    collision.collidedWith = [];
  }

  // Get all collidable entities
  const collidables: Array<{
    entity: Entity;
    transform: Transform;
    collision: Collision;
  }> = [];

  for (const entity of queryEntities(world, ['transform', 'collision'])) {
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const collision = getComponent<Collision>(world, entity, 'collision')!;
    collidables.push({ entity, transform, collision });
  }

  // Check all pairs (O(n²) - fine for small entity counts)
  for (let i = 0; i < collidables.length; i++) {
    for (let j = i + 1; j < collidables.length; j++) {
      const a = collidables[i]!;
      const b = collidables[j]!;

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
export function ensureCollision(world: World, entity: Entity, radius?: number): void {
  if (!hasComponent(world, entity, 'collision')) {
    addComponent(world, entity, createCollision(radius));
  }
}
