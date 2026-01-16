/**
 * Explosion System - Updates explosion age and removes finished explosions.
 */

import { isExplosionFinished } from '../components/explosion';
import {
  entityExists,
  getComponent,
  processRemovals,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { World } from '../core/types';

/** Explosion system - updates explosion lifetimes */
export function explosionSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['explosion', 'transform'])) {
    // Query guarantees these components exist
    const explosion = getComponent(world, entity, 'explosion')!;
    const transform = getComponent(world, entity, 'transform')!;

    // Follow source entity if it still exists (for coasting dying ships)
    if (
      explosion.sourceEntity !== undefined &&
      entityExists(world, explosion.sourceEntity)
    ) {
      const sourceTransform = getComponent(
        world,
        explosion.sourceEntity,
        'transform',
      );
      if (sourceTransform) {
        transform.position.copy(sourceTransform.position);
      }
    }

    // Update age
    explosion.age += dt;

    // Mark for removal when finished
    if (isExplosionFinished(explosion)) {
      removeEntity(world, entity);
    }
  }

  // Process removals
  processRemovals(world);
}
