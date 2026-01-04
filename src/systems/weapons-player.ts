/**
 * Player Weapon System - Handles player primary and secondary weapon input.
 *
 * Extracted from weapons.ts to stay under 400 line limit.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../components/faction';
import type { Heat } from '../components/heat';
import { addHeat } from '../components/heat';
import type { Physics } from '../components/physics';
import type { PlayerControlled } from '../components/player';
import type { Transform } from '../components/transform';
import type { PrimaryWeapons, SecondaryWeapons } from '../components/weapons';
import {
  cycleNextPrimary,
  cyclePrevPrimary,
  findDecoyWeapon,
  getCurrentPrimary,
  getCurrentSecondary,
  getEffectiveHeat,
} from '../components/weapons';
import { entityExists, getComponent } from '../core/ecs';
import { calculateInterceptPoint } from '../core/lead-calculation';
import type { Entity, World } from '../core/types';
import {
  type AutoaimParams,
  spawnDecoy,
  spawnMissile,
  spawnProjectileWithAimError,
} from './weapon-spawning';
import { fireLinkedPrimaries } from './weapons';

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

  // Toggle linked mode (edge-triggered)
  if (input.toggleLink && !prevInput.toggleLink) {
    weapons.linked = !weapons.linked;
  }

  // Weapon cycling (edge-triggered) - only meaningful in single mode
  if (input.cycleWeaponNext && !prevInput.cycleWeaponNext) {
    cycleNextPrimary(weapons);
  }
  if (input.cycleWeaponPrev && !prevInput.cycleWeaponPrev) {
    cyclePrevPrimary(weapons);
  }

  // Fire primary weapon(s)
  if (input.firePrimary) {
    if (weapons.linked) {
      fireLinkedPrimaries(
        world,
        entity,
        transform,
        weapons,
        heat,
        faction,
        gameTime,
        undefined, // No aim error for player
        target,
      );
    } else {
      fireSinglePrimary(
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
}

/** Fire only the currently selected primary weapon */
function fireSinglePrimary(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  gameTime: number,
  target?: Entity,
): void {
  const weapon = getCurrentPrimary(weapons);
  if (!weapon || weapon.category === 'beam') return; // Beams handled by beam system

  const timeSinceFire = gameTime - weapons.lastFireTime;
  if (timeSinceFire >= weapon.fireRate) {
    // Check ammo
    if (weapon.ammo !== undefined && weapon.ammo <= 0) return;

    // Check heat (scaled by bank size)
    if (!addHeat(heat, getEffectiveHeat(weapon))) return;

    weapons.lastFireTime = gameTime;
    if (weapon.ammo !== undefined) weapon.ammo--;

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
      weapons.currentIndex,
      weapons.weapons.length,
      autoaim,
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
    }
  }
}
