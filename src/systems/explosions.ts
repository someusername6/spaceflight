/**
 * Explosion System - Updates explosion age and removes finished explosions.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent, removeEntity, processRemovals } from '../core/ecs';
import type { Explosion } from '../components/explosion';
import { isExplosionFinished } from '../components/explosion';

/** Explosion system - updates explosion lifetimes */
export function explosionSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['explosion'])) {
    const explosion = getComponent<Explosion>(world, entity, 'explosion')!;

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
