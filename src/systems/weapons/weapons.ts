/** Weapon System - Handles firing primary and secondary weapons. */

import * as THREE from 'three';
import { isDead } from '../../components/health';
import type { PlayerControlled } from '../../components/player';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapons,
  SecondaryWeapons,
} from '../../components/weapons';
import { getCurrentSecondary } from '../../components/weapons';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { handleAIPrimaryWeapons, handleAISecondaryWeapons } from './weapons-ai';
import {
  handlePlayerPrimaryWeapons,
  handlePlayerSecondaryWeapons,
} from './weapons-player';

// Re-export from weapon-firing for backwards compatibility
export { fireWeaponsByLinkMode, getPlayerAutoaimBonus } from './weapon-firing';

// Reusable vectors for lock cone calculation (avoid per-frame allocations)
const tempForward = new THREE.Vector3();
const tempToTarget = new THREE.Vector3();
const DEG_TO_RAD = Math.PI / 180;

/** Weapon system - handles firing and heat */
export function weaponSystem(world: World, dt: number): void {
  const state = world.systemState.weapons;
  const gameTime = world.systemState.gameTime;

  // Process entities with primary weapons
  for (const entity of queryEntities(world, [
    'transform',
    'primaryWeapons',
    'heat',
  ])) {
    // Skip dead or dying entities (can't fire while exploding)
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent(world, entity, 'transform')!;
    const weapons = getComponent(
      world,
      entity,
      'primaryWeapons',
    ) as PrimaryWeapons;
    const heat = getComponent(world, entity, 'heat')!;
    const faction = getComponent(world, entity, 'faction');
    const player = getComponent(world, entity, 'playerControlled');

    if (player) {
      // Get targeting for autoaim (use current target if locked)
      const targeting = getComponent(world, entity, 'targeting');
      handlePlayerPrimaryWeapons(
        world,
        entity,
        transform,
        weapons,
        heat,
        faction,
        player,
        state,
        gameTime,
        targeting?.currentTarget,
      );
    } else {
      // Check for AI-controlled entity
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai) {
        handleAIPrimaryWeapons(
          world,
          entity,
          transform,
          weapons,
          heat,
          faction,
          ai,
          gameTime,
        );
      }
    }
  }

  // Process entities with secondary weapons
  for (const entity of queryEntities(world, [
    'transform',
    'secondaryWeapons',
  ])) {
    // Skip dead or dying entities (can't fire while exploding)
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent(world, entity, 'transform')!;
    const weapons = getComponent(
      world,
      entity,
      'secondaryWeapons',
    ) as SecondaryWeapons;
    const faction = getComponent(world, entity, 'faction');
    const player = getComponent(world, entity, 'playerControlled');

    if (player) {
      const targeting = getComponent(world, entity, 'targeting');
      updateLockProgress(
        world,
        weapons,
        targeting?.currentTarget,
        transform,
        dt,
      );
      handlePlayerSecondaryWeapons(
        world,
        entity,
        transform,
        weapons,
        faction,
        player,
        state,
        gameTime,
      );
    } else {
      const ai = getComponent(world, entity, 'aiControlled');
      if (ai) {
        updateLockProgress(world, weapons, ai.target, transform, dt);
        const aimError = getComponent(world, entity, 'aimError');
        handleAISecondaryWeapons(
          world,
          entity,
          transform,
          weapons,
          faction,
          ai,
          gameTime,
          aimError,
        );
      }
    }
  }

  // Update previous input state
  const player = getPlayerInput(world);
  if (player) {
    state.prevInput.cyclePrimary = player.input.cyclePrimary;
    state.prevInput.cycleSecondary = player.input.cycleSecondary;
    state.prevInput.fireSecondary = player.input.fireSecondary;
    state.prevInput.launchDecoy = player.input.launchDecoy;
  }
}

/**
 * Update lock-on progress for secondary weapons (shared by player and AI).
 *
 * Lock resets when:
 * - Target changes (different enemy)
 * - Weapon changes (different missile type has different lock speed)
 * - Target moves outside missile range
 * - Target moves outside lock cone (ship must face target)
 *
 * This ensures consistent behavior between player and AI.
 */
function updateLockProgress(
  world: World,
  weapons: SecondaryWeapons,
  target: Entity | null | undefined,
  selfTransform: Transform,
  dt: number,
): void {
  const weapon = getCurrentSecondary(weapons);
  if (!weapon) return;

  // Don't lock if current weapon is empty - no point locking with no ammo
  if (weapon.count <= 0) {
    weapons.lockProgress = 0;
    weapons.lockTarget = undefined;
    return;
  }

  // No valid target - lose lock
  if (target === undefined || target === null || !entityExists(world, target)) {
    weapons.lockProgress = 0;
    weapons.lockTarget = undefined;
    return;
  }

  // Check if target is within missile range and lock cone
  const targetTransform = getComponent(world, target, 'transform');
  if (targetTransform) {
    const distance = selfTransform.position.distanceTo(
      targetTransform.position,
    );
    if (distance > weapon.range) {
      // Target out of range - lose lock
      weapons.lockProgress = 0;
      weapons.lockTarget = undefined;
      return;
    }

    // Check if target is within lock cone (ship must face target)
    if (weapon.lockConeAngle !== undefined) {
      // Calculate ship's forward direction
      tempForward.set(0, 0, -1).applyQuaternion(selfTransform.rotation);

      // Calculate direction to target (normalized)
      tempToTarget
        .copy(targetTransform.position)
        .sub(selfTransform.position)
        .normalize();

      // Calculate angle between forward and target direction
      const dot = tempForward.dot(tempToTarget);
      const angleRad = Math.acos(Math.min(1, Math.max(-1, dot)));
      const coneRad = weapon.lockConeAngle * DEG_TO_RAD;

      if (angleRad > coneRad) {
        // Target outside lock cone - lose lock
        weapons.lockProgress = 0;
        weapons.lockTarget = undefined;
        return;
      }
    }
  }

  // Reset lock if target changed
  if (weapons.lockTarget !== target) {
    weapons.lockProgress = 0;
    weapons.lockTarget = target;
    weapons.lockWeaponIndex = weapons.currentIndex;
  }

  // Reset lock if weapon changed between lock-requiring weapons
  // (different missiles have different lock speeds)
  // BUT: Don't reset when switching to/from dumbfire - preserve lock for homing missiles
  if (weapons.lockWeaponIndex !== weapons.currentIndex) {
    const oldWeapon = weapons.weapons[weapons.lockWeaponIndex];
    const newWeapon = weapons.weapons[weapons.currentIndex];
    const oldRequiresLock = oldWeapon?.requiresLock ?? false;
    const newRequiresLock = newWeapon?.requiresLock ?? false;

    // Only reset lock when switching between two lock-requiring weapons
    if (oldRequiresLock && newRequiresLock) {
      weapons.lockProgress = 0;
    }
    weapons.lockWeaponIndex = weapons.currentIndex;
  }

  // Accumulate lock progress using current weapon's lock speed
  weapons.lockProgress =
    weapon.requiresLock && weapon.lockSpeed > 0
      ? Math.min(1, weapons.lockProgress + weapon.lockSpeed * dt)
      : 1;
}

/** Get player input (if player exists) */
function getPlayerInput(world: World): PlayerControlled | undefined {
  for (const entity of queryEntities(world, ['playerControlled'])) {
    return getComponent(world, entity, 'playerControlled');
  }
  return undefined;
}
