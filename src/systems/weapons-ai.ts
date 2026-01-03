/**
 * AI Weapon System - Handles AI primary and secondary weapon firing.
 *
 * Extracted from weapons.ts to stay under 400 line limit.
 */

import { type AIControlled, AIState } from '../components/ai';
import type { AimError } from '../components/aim-error';
import type { FactionComponent } from '../components/faction';
import type { Heat } from '../components/heat';
import type { Missile } from '../components/missile';
import type { Transform } from '../components/transform';
import type { PrimaryWeapons, SecondaryWeapons } from '../components/weapons';
import { findDecoyWeapon } from '../components/weapons';
import { entityExists, getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { spawnDecoy, spawnMissile } from './weapon-spawning';
import { fireLinkedPrimaries } from './weapons';

/** Minimum time between AI decoy launches */
const AI_DECOY_COOLDOWN = 2.0;

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

/** Handle AI secondary weapon firing - fires missiles and decoys */
export function handleAISecondaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  // Check for incoming missiles and launch decoys defensively
  handleAIDecoys(world, entity, transform, weapons, faction, ai, gameTime);

  // Only fire offensive weapons when engaging
  if (
    ai.state !== AIState.Engage ||
    !ai.target ||
    !entityExists(world, ai.target)
  ) {
    return;
  }

  const timeSinceFire = gameTime - weapons.lastFireTime;
  for (const weapon of weapons.weapons) {
    if (weapon.isDecoy) continue; // Skip decoys here - handled above
    if (weapon.count <= 0 || timeSinceFire < weapon.fireRate) continue;
    if (weapon.requiresLock && weapons.lockProgress < 1) continue;
    weapons.lastFireTime = gameTime;
    weapon.count--;
    spawnMissile(world, entity, transform, weapon, faction, weapons.lockTarget);
    return;
  }
}

/** Check if any missiles are targeting this entity */
function hasIncomingMissiles(world: World, entity: Entity): boolean {
  for (const missileEntity of queryEntities(world, ['missile'])) {
    const missile = getComponent<Missile>(world, missileEntity, 'missile');
    if (missile?.target === entity) return true;
  }
  return false;
}

/** Handle AI decoy launching when under missile threat */
function handleAIDecoys(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  ai: AIControlled,
  gameTime: number,
): void {
  // Check cooldown
  if (gameTime - ai.lastDecoyTime < AI_DECOY_COOLDOWN) return;

  // Check if we have decoys
  const decoyResult = findDecoyWeapon(weapons);
  if (!decoyResult || decoyResult.weapon.count <= 0) return;

  // Check if there are incoming missiles
  if (!hasIncomingMissiles(world, entity)) return;

  // Launch decoy
  ai.lastDecoyTime = gameTime;
  decoyResult.weapon.count--;
  spawnDecoy(world, entity, transform, faction);
}
