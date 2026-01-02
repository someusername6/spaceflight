/**
 * Cleanup System - Removes dead entities and processes removal queue.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent, removeEntity, processRemovals } from '../core/ecs';
import type { Health } from '../components/health';
import { isDead } from '../components/health';

/** Cleanup system - marks dead entities for removal and processes queue */
export function cleanupSystem(world: World, _dt: number): void {
  // Mark dead entities for removal
  for (const entity of queryEntities(world, ['health'])) {
    const health = getComponent<Health>(world, entity, 'health')!;
    if (isDead(health)) {
      removeEntity(world, entity);
    }
  }

  // Process the removal queue
  processRemovals(world);
}
