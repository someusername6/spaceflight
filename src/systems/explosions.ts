/**
 * Explosion System - Updates explosion age and removes finished explosions.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent, removeEntity, processRemovals, entityExists } from '../core/ecs';
import type { Explosion } from '../components/explosion';
import { isExplosionFinished } from '../components/explosion';
import type { Transform } from '../components/transform';

/** Explosion system - updates explosion lifetimes */
export function explosionSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['explosion', 'transform'])) {
    const explosion = getComponent<Explosion>(world, entity, 'explosion')!;
    const transform = getComponent<Transform>(world, entity, 'transform')!;

    // Follow source entity if it still exists (for coasting dying ships)
    if (explosion.sourceEntity !== undefined && entityExists(world, explosion.sourceEntity)) {
      const sourceTransform = getComponent<Transform>(world, explosion.sourceEntity, 'transform');
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
