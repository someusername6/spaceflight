/**
 * Player Weapon System - Handles player primary and secondary weapon input.
 *
 * Extracted from weapons.ts to stay under 400 line limit.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import type { Heat } from '../../components/heat';
import { addHeat } from '../../components/heat';
import type { Physics } from '../../components/physics';
import type { PlayerControlled } from '../../components/player';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapons,
  SecondaryWeapons,
} from '../../components/weapons';
import {
  cycleNextLinkMode,
  cyclePrevLinkMode,
  findDecoyWeapon,
  getCurrentSecondary,
  getEffectiveHeat,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { entityExists, getComponent } from '../../core/ecs';
import { calculateInterceptPoint } from '../../core/lead-calculation';
import type { Entity, World } from '../../core/types';
import {
  type AutoaimParams,
  spawnDecoy,
  spawnMissile,
  spawnProjectileWithAimError,
} from './weapon-spawning';

const tempZeroVec = new THREE.Vector3(0, 0, 0);

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

  // Cycle link mode (edge-triggered) - cycles through weapon types + 'all'
  if (input.toggleLink && !prevInput.toggleLink) {
    cycleNextLinkMode(weapons);
  }

  // Weapon cycling also cycles link mode (same behavior, different key)
  if (input.cycleWeaponNext && !prevInput.cycleWeaponNext) {
    cycleNextLinkMode(weapons);
  }
  if (input.cycleWeaponPrev && !prevInput.cycleWeaponPrev) {
    cyclePrevLinkMode(weapons);
  }

  // Fire weapons in current link mode (all weapons of selected type)
  if (input.firePrimary) {
    fireByLinkMode(
      world,
      entity,
      transform,
      weapons,
      heat,
      faction,
      gameTime,
      target,
    );
  }
}

/** Fire all weapons matching current link mode */
function fireByLinkMode(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  gameTime: number,
  target?: Entity,
): void {
  const indices = getWeaponIndicesForCurrentMode(weapons);
  if (indices.length === 0) return;

  // Check fire rate (use fastest weapon's fire rate)
  const timeSinceFire = gameTime - weapons.lastFireTime;
  let fastestFireRate = Infinity;
  for (const i of indices) {
    const w = weapons.weapons[i];
    if (w && w.category !== 'beam') {
      fastestFireRate = Math.min(fastestFireRate, w.fireRate);
    }
  }
  if (timeSinceFire < fastestFireRate) return;

  // Fire each weapon in the link mode
  let firedAny = false;
  for (const weaponIndex of indices) {
    const weapon = weapons.weapons[weaponIndex];
    if (!weapon || weapon.category === 'beam') continue; // Beams handled by beam system

    // Check ammo
    if (weapon.ammo !== undefined && weapon.ammo <= 0) continue;

    // Check heat (scaled by bank size)
    if (!addHeat(heat, getEffectiveHeat(weapon))) continue;

    if (weapon.ammo !== undefined) weapon.ammo--;
    firedAny = true;

    // Calculate autoaim if weapon has autoaimFov and we have a target
    let autoaim: AutoaimParams | undefined;
    if (weapon.autoaimFov && target && entityExists(world, target)) {
      const targetTransform = getComponent<Transform>(
        world,
        target,
        'transform',
      );
      const targetPhysics = getComponent<Physics>(world, target, 'physics');
      const ownerPhysics = getComponent<Physics>(world, entity, 'physics');

      if (targetTransform) {
        const interceptPoint = calculateInterceptPoint(
          transform.position,
          ownerPhysics?.velocity ?? tempZeroVec,
          targetTransform.position,
          targetPhysics?.velocity ?? tempZeroVec,
          weapon.projectileSpeed,
        );
        if (interceptPoint) {
          autoaim = { interceptPoint, fovDegrees: weapon.autoaimFov };
        }
      }
    }

    spawnProjectileWithAimError(
      world,
      entity,
      transform,
      weapon,
      faction,
      undefined, // No aim error for player
      weaponIndex,
      weapons.weapons.length,
      autoaim,
    );
  }

  if (firedAny) {
    weapons.lastFireTime = gameTime;
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
    }
  }
}
