/**
 * Damage System - Applies damage from collisions and weapons.
 *
 * Damage flows: Shields first, then hull.
 */

import type { World, Entity } from '../core/types';
import { queryEntities, getComponent } from '../core/ecs';
import type { Health } from '../components/health';
import { applyDamage } from '../components/health';
import type { Shields } from '../components/shields';
import { damageShields } from '../components/shields';
import type { Collision } from './collision';
import { type FactionComponent, areEnemies } from '../components/faction';

/** Damage dealt on ship-to-ship collision */
const COLLISION_DAMAGE = 10;

/** Damage system - applies damage from collisions */
export function damageSystem(world: World, _dt: number): void {
  // Process collision damage
  for (const entity of queryEntities(world, ['health', 'collision', 'faction'])) {
    const collision = getComponent<Collision>(world, entity, 'collision')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction')!;

    for (const other of collision.collidedWith) {
      const otherFaction = getComponent<FactionComponent>(world, other, 'faction');

      // Only damage from enemies (or if no faction)
      if (otherFaction && !areEnemies(faction.faction, otherFaction.faction)) {
        continue;
      }

      // Apply collision damage (through shields first)
      applyDamageWithShields(world, entity, COLLISION_DAMAGE);
    }
  }
}

/** Apply damage through shields, then hull */
function applyDamageWithShields(world: World, entity: Entity, amount: number): number {
  const shields = getComponent<Shields>(world, entity, 'shields');
  const health = getComponent<Health>(world, entity, 'health');

  let remaining = amount;

  // Shields absorb first
  if (shields) {
    remaining = damageShields(shields, remaining, world.systemState.gameTime);
  }

  // Remaining damage goes to hull
  if (remaining > 0 && health) {
    return applyDamage(health, remaining);
  }

  return amount - remaining;
}

/** Apply direct damage to an entity (for weapons) */
export function dealDamage(world: World, entity: Entity, amount: number): number {
  return applyDamageWithShields(world, entity, amount);
}
