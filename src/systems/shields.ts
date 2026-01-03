/**
 * Shield System - Regenerates shields after damage delay.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Shields } from '../components/shields';
import { regenerateShields } from '../components/shields';

/** Shield system - handles regeneration */
export function shieldSystem(world: World, dt: number): void {
  const gameTime = world.systemState.gameTime;

  for (const entity of queryEntities(world, ['shields'])) {
    const shields = getComponent<Shields>(world, entity, 'shields')!;
    regenerateShields(shields, gameTime, dt);
  }
}
