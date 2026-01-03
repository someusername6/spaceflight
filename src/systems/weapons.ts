/**
 * Weapon System - Handles firing primary and secondary weapons.
 */

import type { AIControlled } from '../components/ai';
import type { AimError } from '../components/aim-error';
import type { FactionComponent } from '../components/faction';
import type { Health } from '../components/health';
import { isDying } from '../components/health';
import type { Heat } from '../components/heat';
import { addHeat } from '../components/heat';
import type { PlayerControlled } from '../components/player';
import type { Targeting } from '../components/targeting';
import type { Transform } from '../components/transform';
import type {
  PrimaryWeapon,
  PrimaryWeapons,
  SecondaryWeapons,
} from '../components/weapons';
import {
  cycleNextPrimary,
  cyclePrevPrimary,
  getCurrentPrimary,
  getCurrentSecondary,
} from '../components/weapons';
import { entityExists, getComponent, queryEntities } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
  spawnMissile,
  spawnProjectile,
  spawnProjectileWithAimError,
} from './weapon-spawning';
import { handleAIPrimaryWeapons, handleAISecondaryWeapons } from './weapons-ai';

// Reusable array for projectile weapons in linked fire (avoid per-frame allocations)
interface WeaponWithIndex {
  weapon: PrimaryWeapon;
  index: number;
}
const projectileWeaponsCollector: WeaponWithIndex[] = [];

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
    // Skip dying entities (can't fire while exploding)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDying(health)) continue;

    // Query guarantees these components exist
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
    // Skip dying entities (can't fire while exploding)
    const health = getComponent<Health>(world, entity, 'health');
    if (health && isDying(health)) continue;

    // Query guarantees these components exist
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
      updateLockProgress(world, weapons, targeting?.currentTarget, dt);
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
        updateLockProgress(world, weapons, ai.target, dt);
        handleAISecondaryWeapons(
          world,
          entity,
          transform,
          weapons,
          faction,
          ai,
          gameTime,
        );
      }
    }
  }

  // Update previous input state
  const player = getPlayerInput(world);
  if (player) {
    state.prevInput.cycleWeaponNext = player.input.cycleWeaponNext;
    state.prevInput.cycleWeaponPrev = player.input.cycleWeaponPrev;
    state.prevInput.fireSecondary = player.input.fireSecondary;
    state.prevInput.toggleLink = player.input.toggleLink;
  }
}

/** Handle player primary weapon input */
function handlePlayerPrimaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  player: PlayerControlled,
  state: World['systemState']['weapons'],
  gameTime: number,
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
): void {
  const weapon = getCurrentPrimary(weapons);
  if (!weapon || weapon.category === 'beam') return; // Beams handled by beam system

  const timeSinceFire = gameTime - weapons.lastFireTime;
  if (timeSinceFire >= weapon.fireRate) {
    // Check ammo
    if (weapon.ammo !== undefined && weapon.ammo <= 0) return;

    // Check heat
    if (!addHeat(heat, weapon.heatPerShot)) return;

    weapons.lastFireTime = gameTime;
    if (weapon.ammo !== undefined) weapon.ammo--;
    spawnProjectile(
      world,
      entity,
      transform,
      weapon,
      faction,
      weapons.currentIndex,
      weapons.weapons.length,
    );
  }
}

/** Fire all primary weapons together (linked mode) */
export function fireLinkedPrimaries(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: PrimaryWeapons,
  heat: Heat,
  faction: FactionComponent | undefined,
  gameTime: number,
  aimError?: AimError,
): void {
  // Clear and reuse collector (avoid per-frame allocations)
  projectileWeaponsCollector.length = 0;

  // Find projectile weapons (non-beam) that can fire, with their indices
  for (let i = 0; i < weapons.weapons.length; i++) {
    const w = weapons.weapons[i];
    if (w && w.category !== 'beam' && (w.ammo === undefined || w.ammo > 0)) {
      projectileWeaponsCollector.push({ weapon: w, index: i });
    }
  }

  if (projectileWeaponsCollector.length === 0) return;

  // Calculate slowest fire rate among projectile weapons (avoid .map() allocation)
  let slowestRate = 0;
  for (const { weapon } of projectileWeaponsCollector) {
    if (weapon.fireRate > slowestRate) slowestRate = weapon.fireRate;
  }

  // Check if enough time has passed
  const timeSinceFire = gameTime - weapons.lastFireTime;
  if (timeSinceFire < slowestRate) return;

  // Calculate total heat for all weapons (avoid .reduce() allocation)
  let totalHeat = 0;
  for (const { weapon } of projectileWeaponsCollector) {
    totalHeat += weapon.heatPerShot;
  }

  // Check if we can add all heat
  if (!addHeat(heat, totalHeat)) return;

  // Fire all projectile weapons (with optional aim error for AI)
  weapons.lastFireTime = gameTime;
  const totalBanks = weapons.weapons.length;
  for (const { weapon, index } of projectileWeaponsCollector) {
    if (weapon.ammo !== undefined) weapon.ammo--;
    spawnProjectileWithAimError(
      world,
      entity,
      transform,
      weapon,
      faction,
      aimError,
      index,
      totalBanks,
    );
  }
}

/** Update lock-on progress for secondary weapons (shared by player and AI) */
function updateLockProgress(
  world: World,
  weapons: SecondaryWeapons,
  target: Entity | null | undefined,
  dt: number,
): void {
  const weapon = getCurrentSecondary(weapons);
  if (!weapon) return;

  if (target === undefined || target === null || !entityExists(world, target)) {
    weapons.lockProgress = Math.max(0, weapons.lockProgress - dt * 2);
    weapons.lockTarget = undefined;
    return;
  }

  if (weapons.lockTarget !== target) {
    weapons.lockProgress = 0;
    weapons.lockTarget = target;
  }

  weapons.lockProgress =
    weapon.requiresLock && weapon.lockSpeed > 0
      ? Math.min(1, weapons.lockProgress + weapon.lockSpeed * dt)
      : 1;
}

/** Handle player secondary weapon input */
function handlePlayerSecondaryWeapons(
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

  // Fire secondary weapon (edge-triggered to prevent rapid fire)
  if (input.fireSecondary && !prevInput.fireSecondary) {
    const weapon = getCurrentSecondary(weapons);
    if (weapon && weapon.count > 0) {
      const timeSinceFire = gameTime - weapons.lastFireTime;

      // Check fire rate
      if (timeSinceFire < weapon.fireRate) return;

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

/** Get player input (if player exists) */
function getPlayerInput(world: World): PlayerControlled | undefined {
  for (const entity of queryEntities(world, ['playerControlled'])) {
    return getComponent<PlayerControlled>(world, entity, 'playerControlled');
  }
  return undefined;
}
