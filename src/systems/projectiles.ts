/**
 * Projectile System - Moves projectiles, checks hits, and despawns expired.
 */

import type { FactionComponent } from '../components/faction';
import { areEnemies } from '../components/faction';
import type { Projectile } from '../components/projectile';
import { isExpired } from '../components/projectile';
import type { Transform } from '../components/transform';
import {
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Collision } from './collision';
import { dealDamage } from './damage';

/** Projectile system - movement and collision handling */
export function projectileSystem(world: World, dt: number): void {
  // Collect projectiles to remove (can't modify during iteration)
  const toRemove: Entity[] = [];

  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    // Query guarantees these components exist
    const projectile = getComponent<Projectile>(
      world,
      entity,
      'projectile',
    ) as Projectile;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    // Move projectile
    const distance = projectile.speed * dt;
    transform.position.addScaledVector(projectile.direction, distance);
    projectile.distanceTraveled += distance;

    // Check if expired
    if (isExpired(projectile)) {
      toRemove.push(entity);
      continue;
    }

    // Check for collisions with ships (non-projectile entities)
    const collision = getComponent<Collision>(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      const projectileFaction = getComponent<FactionComponent>(
        world,
        entity,
        'faction',
      );

      for (const other of collision.collidedWith) {
        // Skip collision with owner
        if (other === projectile.owner) continue;

        // Skip collision with other projectiles
        if (hasComponent(world, other, 'projectile')) continue;

        // Check if this is a valid target (enemy or no faction)
        const otherFaction = getComponent<FactionComponent>(
          world,
          other,
          'faction',
        );
        if (projectileFaction && otherFaction) {
          if (!areEnemies(projectileFaction.faction, otherFaction.faction)) {
            continue; // Same team, no damage
          }
        }

        // Deal damage
        dealDamage(world, other, projectile.damage);

        // Projectile is consumed
        toRemove.push(entity);
        break;
      }
    }
  }

  // Remove expired/hit projectiles
  for (const entity of toRemove) {
    removeEntity(world, entity);
  }
}
