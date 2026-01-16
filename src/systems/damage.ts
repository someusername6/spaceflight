/**
 * Damage System - Applies damage from collisions and weapons.
 *
 * Damage flows: Shields first, then hull.
 *
 * Victory Protection: Once victory is achieved, allied ships become
 * immune to damage. This prevents the frustrating scenario where
 * the player wins but dies to in-flight projectiles.
 */

import type * as THREE from 'three';
import { areEnemies, Faction } from '../components/faction';
import { applyDamage } from '../components/health';
import { recordShieldHit } from '../components/shield-hit';
import { damageShields } from '../components/shields';
import { getComponent, hasComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { MissionResult } from '../core/types';

/** Damage dealt on ship-to-ship collision */
const COLLISION_DAMAGE = 10;

/**
 * Check if an entity is protected from damage due to victory.
 * Allied ships (player faction) become immune once victory is achieved.
 */
function isProtectedByVictory(world: World, entity: Entity): boolean {
  if (world.systemState.mission.result !== MissionResult.Victory) {
    return false;
  }
  const faction = getComponent(world, entity, 'faction');
  return faction?.faction === Faction.Player;
}

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

    // Victory protection: allied ships are immune after victory
    if (isProtectedByVictory(world, entity)) continue;

    // Query guarantees these components exist
    const collision = getComponent(world, entity, 'collision')!;
    const faction = getComponent(world, entity, 'faction')!;

    for (const other of collision.collidedWith) {
      const otherFaction = getComponent(world, other, 'faction');

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
  hullDamageMultiplier = 1,
): DamageResult {
  const shields = getComponent(world, entity, 'shields');
  const health = getComponent(world, entity, 'health');

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
      const shieldHit = getComponent(world, entity, 'shieldHit');
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

  // Remaining damage goes to hull (with optional multiplier for Torch-type weapons)
  let hullDamage = 0;
  if (remaining > 0 && health) {
    const hullDamageAmount = remaining * hullDamageMultiplier;
    hullDamage = applyDamage(health, hullDamageAmount);
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
  hullDamageMultiplier = 1,
): DamageResult {
  // Victory protection: allied ships are immune after victory
  if (isProtectedByVictory(world, entity)) {
    return { shieldDamage: 0, hullDamage: 0 };
  }

  return applyDamageWithShields(
    world,
    entity,
    amount,
    hitPosition,
    shieldDamageMultiplier,
    hullDamageMultiplier,
  );
}
