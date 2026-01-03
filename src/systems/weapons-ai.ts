/**
 * AI Weapon System - Handles AI primary and secondary weapon firing.
 *
 * Extracted from weapons.ts to stay under 400 line limit.
 */

import { type AIControlled, AIState } from '../components/ai';
import type { AimError } from '../components/aim-error';
import type { FactionComponent } from '../components/faction';
import type { Heat } from '../components/heat';
import type { Transform } from '../components/transform';
import type { PrimaryWeapons, SecondaryWeapons } from '../components/weapons';
import { entityExists, getComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { spawnMissile } from './weapon-spawning';
import { fireLinkedPrimaries } from './weapons';

/** Handle AI primary weapon firing - AI always fires linked (all weapons) */
export function handleAIPrimaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  // Only fire when in Engage state
  if (ai.state !== AIState.Engage) return;

  // Need a valid target
  if (ai.target === null || !entityExists(world, ai.target)) return;

  // Get aim error if present (makes AI imperfect)
  const aimError = getComponent<AimError>(world, entity, 'aimError');

  // AI always fires all weapons together (linked)
  fireLinkedPrimaries(
    world,
    entity,
    transform,
    weapons,
    heat,
    faction,
    gameTime,
    aimError,
  );
}

/** Handle AI secondary weapon firing - fires first available weapon when locked */
export function handleAISecondaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  if (
    ai.state !== AIState.Engage ||
    !ai.target ||
    !entityExists(world, ai.target)
  ) {
    return;
  }

  const timeSinceFire = gameTime - weapons.lastFireTime;
  for (const weapon of weapons.weapons) {
    if (weapon.count <= 0 || timeSinceFire < weapon.fireRate) continue;
    if (weapon.requiresLock && weapons.lockProgress < 1) continue;
    weapons.lastFireTime = gameTime;
    weapon.count--;
    spawnMissile(world, entity, transform, weapon, faction, weapons.lockTarget);
    return;
  }
}
