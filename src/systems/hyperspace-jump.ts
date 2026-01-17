/**
 * Hyperspace Jump System - Updates jump animation progress.
 *
 * This system advances the progress of hyperspace jump animations.
 * When progress reaches 1, the entity is removed from the world.
 */

import { isJumpComplete } from '../components/hyperspace-jump';
import {
  getComponent,
  processRemovals,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { World } from '../core/types';

/**
 * Hyperspace jump system - updates jump progress and removes completed jumps.
 */
export function hyperspaceJumpSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['hyperspaceJump'])) {
    const jump = getComponent(world, entity, 'hyperspaceJump')!;

    // Update progress
    jump.progress += dt / jump.duration;

    // Remove entity when jump completes
    if (isJumpComplete(jump)) {
      removeEntity(world, entity);
    }
  }

  // Process removals
  processRemovals(world);
}
