/**
 * Player Weapon System - Handles player primary and secondary weapon input.
 *
 * Extracted from weapons.ts to stay under 400 line limit.
 */

import type { FactionComponent } from '../../components/faction';
import type { Heat } from '../../components/heat';
import type { PlayerControlled } from '../../components/player';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapons,
  SecondaryWeapons,
} from '../../components/weapons';
import {
  cycleNextLinkMode,
  cycleNextSecondary,
  findDecoyWeapon,
  getCurrentSecondary,
  switchToNonEmptySecondary,
} from '../../components/weapons';
import type { Entity, World } from '../../core/types';
import { spawnDecoy, spawnMissile } from './weapon-spawning';
import { fireWeaponsByLinkMode } from './weapons';

/** Handle player primary weapon input */
export function handlePlayerPrimaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  player: PlayerControlled,
  state: World['systemState']['weapons'],
  gameTime: number,
  target?: Entity,
): void {
  const input = player.input;
  const prevInput = state.prevInput;

  // Cycle primary weapons (edge-triggered) - cycles through weapon types + 'all'
  if (input.cyclePrimary && !prevInput.cyclePrimary) {
    cycleNextLinkMode(weapons);
  }

  // Fire weapons in current link mode (all weapons of selected type)
  if (input.firePrimary) {
    fireWeaponsByLinkMode(
      world,
      entity,
      transform,
      weapons,
      heat,
      faction,
      gameTime,
      undefined, // No aim error for player
      target,
      true, // isPlayer - gets autoaim bonus
    );
  }
}

/** Handle player secondary weapon input */
export function handlePlayerSecondaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  player: PlayerControlled,
  state: World['systemState']['weapons'],
  gameTime: number,
): void {
  const input = player.input;
  const prevInput = state.prevInput;

  // Cycle secondary weapons (edge-triggered)
  if (input.cycleSecondary && !prevInput.cycleSecondary) {
    cycleNextSecondary(weapons);
  }

  // Launch decoy with dedicated key (edge-triggered)
  if (input.launchDecoy && !prevInput.launchDecoy) {
    const decoyResult = findDecoyWeapon(weapons);
    if (decoyResult) {
      const timeSinceFire = gameTime - state.lastDecoyFireTime;
      if (timeSinceFire >= decoyResult.weapon.fireRate) {
        state.lastDecoyFireTime = gameTime;
        decoyResult.weapon.count--;
        spawnDecoy(world, entity, transform, faction);
      }
    }
  }

  // Fire secondary weapon (edge-triggered to prevent rapid fire)
  if (input.fireSecondary && !prevInput.fireSecondary) {
    const weapon = getCurrentSecondary(weapons);
    if (weapon && weapon.count > 0) {
      const timeSinceFire = gameTime - weapons.lastFireTime;

      // Check fire rate
      if (timeSinceFire < weapon.fireRate) return;

      // Decoys don't require lock and use dedicated spawn
      if (weapon.isDecoy) {
        weapons.lastFireTime = gameTime;
        weapon.count--;
        spawnDecoy(world, entity, transform, faction);
        return;
      }

      // Check lock requirement
      if (weapon.requiresLock && weapons.lockProgress < 1) return;

      // Fire missile
      weapons.lastFireTime = gameTime;
      weapon.count--;

      const target = weapons.lockProgress >= 1 ? weapons.lockTarget : undefined;
      spawnMissile(world, entity, transform, weapon, faction, target);

      // Reset lock progress - must re-acquire lock for next missile
      weapons.lockProgress = 0;

      // Auto-switch to next non-empty secondary if this one is depleted
      if (weapon.count <= 0) {
        switchToNonEmptySecondary(weapons);
      }
    }
  }
}
