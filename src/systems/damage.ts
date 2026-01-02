/**
 * Damage System - Applies damage from collisions.
 *
 * Slice 1: Collision damage only.
 */

import type { World } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Health } from '../components/health';
import { applyDamage } from '../components/health';
import type { Collision } from './collision';
import { type FactionComponent, areEnemies } from '../components/faction';

/** Damage dealt on ship-to-ship collision */
const COLLISION_DAMAGE = 10;

/** Damage system - applies damage from collisions */
export function damageSystem(world: World, _dt: number): void {
  // Process collision damage
  for (const entity of queryEntities(world, ['health', 'collision', 'faction'])) {
    const health = getComponent<Health>(world, entity, 'health')!;
    const collision = getComponent<Collision>(world, entity, 'collision')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction')!;

    for (const other of collision.collidedWith) {
      const otherFaction = getComponent<FactionComponent>(world, other, 'faction');

      // Only damage from enemies (or if no faction)
      if (otherFaction && !areEnemies(faction.faction, otherFaction.faction)) {
        continue;
      }

      // Apply collision damage
      applyDamage(health, COLLISION_DAMAGE);
    }
  }
}

/** Apply direct damage to an entity (for weapons) */
export function dealDamage(world: World, entity: number, amount: number): number {
  const health = getComponent<Health>(world, entity, 'health');
  if (!health) return 0;
  return applyDamage(health, amount);
}
