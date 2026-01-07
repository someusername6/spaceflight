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
import { getComponent, hasComponent, queryEntities } from '../core/ecs';
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
    // Skip missiles and decoys - they handle their own impact logic
    // and shouldn't receive "ramming" damage from ships
    if (hasComponent(world, entity, 'missile')) continue;
    if (hasComponent(world, entity, 'decoy')) continue;

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

/** Result of applying damage - for conditional visual effects */
export interface DamageResult {
  /** Amount of damage absorbed by shields */
  shieldDamage: number;
  /** Amount of damage dealt to hull */
  hullDamage: number;
}

/** Apply damage through shields, then hull */
function applyDamageWithShields(
  world: World,
  entity: Entity,
  amount: number,
  hitPosition?: THREE.Vector3,
  shieldDamageMultiplier = 1,
): DamageResult {
  const shields = getComponent<Shields>(world, entity, 'shields');
  const health = getComponent<Health>(world, entity, 'health');

  let remaining = amount;
  let shieldDamage = 0;

  // Shields absorb first (with optional damage multiplier for Ion weapons)
  if (shields && shields.current > 0) {
    const shieldsBefore = shields.current;
    // Apply multiplied damage to shields
    const shieldDamageAmount = amount * shieldDamageMultiplier;
    remaining = damageShields(
      shields,
      shieldDamageAmount,
      world.systemState.gameTime,
    );
    shieldDamage = shieldsBefore - shields.current;
    // Remaining damage to hull uses base amount, not multiplied
    // If shields absorbed less than the multiplied damage, scale remaining back
    if (remaining > 0) {
      // Calculate how much of the original damage would pass through
      // remaining is in "multiplied" units, convert back to base
      remaining = remaining / shieldDamageMultiplier;
    }

    // Record shield hit for visual effects
    if (shieldDamage > 0 && hitPosition) {
      const shieldHit = getComponent<ShieldHit>(world, entity, 'shieldHit');
      if (shieldHit) {
        recordShieldHit(
          shieldHit,
          hitPosition,
          shieldDamage,
          shields.max,
          world.systemState.gameTime,
        );
      }
    }
  }

  // Remaining damage goes to hull
  let hullDamage = 0;
  if (remaining > 0 && health) {
    hullDamage = applyDamage(health, remaining);
  }

  return { shieldDamage, hullDamage };
}

/** Apply direct damage to an entity (for weapons) */
export function dealDamage(
  world: World,
  entity: Entity,
  amount: number,
  hitPosition?: THREE.Vector3,
  shieldDamageMultiplier = 1,
): DamageResult {
  return applyDamageWithShields(
    world,
    entity,
    amount,
    hitPosition,
    shieldDamageMultiplier,
  );
}
