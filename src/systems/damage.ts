/**
 * Damage System - Applies damage from collisions and weapons.
 *
 * Damage flows: Shields first, then hull.
 */

import type * as THREE from 'three';
import { areEnemies, type FactionComponent } from '../components/faction';
import type { Health } from '../components/health';
import { applyDamage } from '../components/health';
import { recordShieldHit, type ShieldHit } from '../components/shield-hit';
import type { Shields } from '../components/shields';
import { damageShields } from '../components/shields';
import { getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Collision } from './collision';

/** Damage dealt on ship-to-ship collision */
const COLLISION_DAMAGE = 10;

/** Damage system - applies damage from collisions */
export function damageSystem(world: World, _dt: number): void {
  // Process collision damage
  for (const entity of queryEntities(world, [
    'health',
    'collision',
    'faction',
  ])) {
    // Query guarantees these components exist
    const collision = getComponent<Collision>(
      world,
      entity,
      'collision',
    ) as Collision;
    const faction = getComponent<FactionComponent>(
      world,
      entity,
      'faction',
    ) as FactionComponent;

    for (const other of collision.collidedWith) {
      const otherFaction = getComponent<FactionComponent>(
        world,
        other,
        'faction',
      );

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
function applyDamageWithShields(
  world: World,
  entity: Entity,
  amount: number,
  hitPosition?: THREE.Vector3,
): number {
  const shields = getComponent<Shields>(world, entity, 'shields');
  const health = getComponent<Health>(world, entity, 'health');

  let remaining = amount;

  // Shields absorb first
  if (shields && shields.current > 0) {
    const shieldsBefore = shields.current;
    remaining = damageShields(shields, remaining, world.systemState.gameTime);
    const absorbed = shieldsBefore - shields.current;

    // Record shield hit for visual effects
    if (absorbed > 0 && hitPosition) {
      const shieldHit = getComponent<ShieldHit>(world, entity, 'shieldHit');
      if (shieldHit) {
        recordShieldHit(
          shieldHit,
          hitPosition,
          absorbed,
          shields.max,
          world.systemState.gameTime,
        );
      }
    }
  }

  // Remaining damage goes to hull
  if (remaining > 0 && health) {
    return applyDamage(health, remaining);
  }

  return amount - remaining;
}

/** Apply direct damage to an entity (for weapons) */
export function dealDamage(
  world: World,
  entity: Entity,
  amount: number,
  hitPosition?: THREE.Vector3,
): number {
  return applyDamageWithShields(world, entity, amount, hitPosition);
}
