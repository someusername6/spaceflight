/**
 * Shield System - Regenerates shields after damage delay.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Shields } from '../components/shields';
import { regenerateShields } from '../components/shields';

/** Game time accumulator for shield regen timing */
let gameTime = 0;

/** Shield system - handles regeneration */
export function shieldSystem(world: World, dt: number): void {
  gameTime += dt;

  for (const entity of queryEntities(world, ['shields'])) {
    const shields = getComponent<Shields>(world, entity, 'shields')!;
    regenerateShields(shields, gameTime, dt);
  }
}

/** Get current game time (for damage tracking) */
export function getGameTime(): number {
  return gameTime;
}

/** Reset shield system state (for new game) */
export function resetShieldSystem(): void {
  gameTime = 0;
}
