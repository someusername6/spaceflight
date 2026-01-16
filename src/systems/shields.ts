/**
 * Shield System - Regenerates shields after damage delay.
 */

import { regenerateShields } from '../components/shields';
import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

/** Shield system - handles regeneration */
export function shieldSystem(world: World, dt: number): void {
  const gameTime = world.systemState.gameTime;

  for (const entity of queryEntities(world, ['shields'])) {
    // Query guarantees this component exists
    const shields = getComponent(world, entity, 'shields')!;
    regenerateShields(shields, gameTime, dt);
  }
}
