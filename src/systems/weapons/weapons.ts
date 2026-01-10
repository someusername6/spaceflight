/** Weapon System - Handles firing primary and secondary weapons. */

import * as THREE from 'three';
import type { AIControlled } from '../../components/ai';
import type { AimError } from '../../components/aim-error';
import type { FactionComponent } from '../../components/faction';
import type { Health } from '../../components/health';
import { isDead } from '../../components/health';
import type { Heat } from '../../components/heat';
import { addHeat } from '../../components/heat';
import type { Physics } from '../../components/physics';
import type { PlayerControlled } from '../../components/player';
import type { Targeting } from '../../components/targeting';
import type { Transform } from '../../components/transform';
import type {
  PrimaryWeapon,
  PrimaryWeapons,
  SecondaryWeapons,
} from '../../components/weapons';
import {
  getCurrentSecondary,
  getEffectiveHeat,
  getWeaponIndicesForCurrentMode,
} from '../../components/weapons';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import { calculateInterceptPoint } from '../../core/lead-calculation';
import type { Entity, World } from '../../core/types';
import {
  type AutoaimParams,
  spawnProjectileWithAimError,
} from './weapon-spawning';
import { handleAIPrimaryWeapons, handleAISecondaryWeapons } from './weapons-ai';
import {
  handlePlayerPrimaryWeapons,
  handlePlayerSecondaryWeapons,
} from './weapons-player';

// Reusable vectors for lock cone calculation (avoid per-frame allocations)
const tempForward = new THREE.Vector3();
const tempToTarget = new THREE.Vector3();
const tempZeroVec = new THREE.Vector3(0, 0, 0);
const DEG_TO_RAD = Math.PI / 180;

/** Player gets +1 degree autoaim on all weapons */
export const PLAYER_AUTOAIM_BONUS = 1;

/** Weapon info for firing (avoids per-frame allocations) */
interface FireableWeapon {
  weapon: PrimaryWeapon;
  index: number;
}
const fireableWeaponsCollector: FireableWeapon[] = [];

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
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const weapons = getComponent<PrimaryWeapons>(
      world,
      entity,
      'primaryWeapons',
    ) as PrimaryWeapons;
    const heat = getComponent<Heat>(world, entity, 'heat') as Heat;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );

    if (player) {
      // Get targeting for autoaim (use current target if locked)
      const targeting = getComponent<Targeting>(world, entity, 'targeting');
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
      const ai = getComponent<AIControlled>(world, entity, 'aiControlled');
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
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const weapons = getComponent<SecondaryWeapons>(
      world,
      entity,
      'secondaryWeapons',
    ) as SecondaryWeapons;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    const player = getComponent<PlayerControlled>(
      world,
      entity,
      'playerControlled',
    );

    if (player) {
      const targeting = getComponent<Targeting>(world, entity, 'targeting');
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
      const ai = getComponent<AIControlled>(world, entity, 'aiControlled');
      if (ai) {
        updateLockProgress(world, weapons, ai.target, transform, dt);
        const aimError = getComponent<AimError>(world, entity, 'aimError');
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

  // No valid target - lose lock
  if (target === undefined || target === null || !entityExists(world, target)) {
    weapons.lockProgress = 0;
    weapons.lockTarget = undefined;
    return;
  }

  // Check if target is within missile range and lock cone
  const targetTransform = getComponent<Transform>(world, target, 'transform');
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
    return getComponent<PlayerControlled>(world, entity, 'playerControlled');
  }
  return undefined;
}

/**
 * Fire all weapons matching current link mode (shared by player and AI).
 *
 * Uses all-or-nothing heat check: either all linked weapons fire together,
 * or none fire. This prevents the weird visual of only some linked weapons
 * firing when near overheat.
 */
export function fireWeaponsByLinkMode(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  gameTime: number,
  aimError?: AimError,
  target?: Entity,
  isPlayer = false,
): void {
  const indices = getWeaponIndicesForCurrentMode(weapons);
  if (indices.length === 0) return;

  // Clear collector (reuse to avoid per-frame allocations)
  fireableWeaponsCollector.length = 0;

  // First pass: collect fireable weapons and find fastest fire rate
  let fastestFireRate = Infinity;
  for (const i of indices) {
    const w = weapons.weapons[i];
    if (!w || w.category === 'beam') continue; // Beams handled by beam system
    if (w.ammo !== undefined && w.ammo <= 0) continue; // No ammo
    fireableWeaponsCollector.push({ weapon: w, index: i });
    fastestFireRate = Math.min(fastestFireRate, w.fireRate);
  }

  if (fireableWeaponsCollector.length === 0) return;

  // Check fire rate
  const timeSinceFire = gameTime - weapons.lastFireTime;
  if (timeSinceFire < fastestFireRate) return;

  // Calculate total heat for all weapons (all-or-nothing for linked fire)
  let totalHeat = 0;
  for (const { weapon } of fireableWeaponsCollector) {
    totalHeat += getEffectiveHeat(weapon);
  }

  // Check if we can afford ALL the heat at once
  if (!addHeat(heat, totalHeat)) return;

  // Pre-calculate target info for autoaim (once, not per-weapon)
  let targetTransform: Transform | undefined;
  let targetVelocity = tempZeroVec;
  let ownerVelocity = tempZeroVec;
  if (target && entityExists(world, target)) {
    targetTransform = getComponent<Transform>(world, target, 'transform');
    const targetPhysics = getComponent<Physics>(world, target, 'physics');
    const ownerPhysics = getComponent<Physics>(world, entity, 'physics');
    if (targetPhysics) targetVelocity = targetPhysics.velocity;
    if (ownerPhysics) ownerVelocity = ownerPhysics.velocity;
  }

  // Fire all collected weapons
  weapons.lastFireTime = gameTime;
  const totalBanks = weapons.weapons.length;
  for (const { weapon, index } of fireableWeaponsCollector) {
    if (weapon.ammo !== undefined) weapon.ammo--;

    // Calculate autoaim if weapon has autoaimFov or isPlayer, and we have a target
    let autoaim: AutoaimParams | undefined;
    const baseAutoaim = weapon.autoaimFov ?? 0;
    const effectiveAutoaim = isPlayer
      ? baseAutoaim + PLAYER_AUTOAIM_BONUS
      : baseAutoaim;
    if (effectiveAutoaim > 0 && targetTransform) {
      const interceptPoint = calculateInterceptPoint(
        transform.position,
        ownerVelocity,
        targetTransform.position,
        targetVelocity,
        weapon.projectileSpeed,
      );
      if (interceptPoint) {
        autoaim = { interceptPoint, fovDegrees: effectiveAutoaim };
      }
    }

    spawnProjectileWithAimError(
      world,
      entity,
      transform,
      weapon,
      faction,
      aimError,
      index,
      totalBanks,
      autoaim,
    );
  }
}
