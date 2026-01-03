/**
 * Weapon System - Handles firing primary and secondary weapons.
 */

import type { World, Entity } from '../core/types';
import { queryEntities, getComponent, createEntity, addComponent, entityExists } from '../core/ecs';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import type { PlayerControlled } from '../components/player';
import type { PrimaryWeapons, SecondaryWeapons, SecondaryWeapon } from '../components/weapons';
import { getCurrentPrimary, getCurrentSecondary, cycleNextPrimary, cyclePrevPrimary } from '../components/weapons';
import type { Heat } from '../components/heat';
import { addHeat } from '../components/heat';
import { createProjectile } from '../components/projectile';
import { createMissile } from '../components/missile';
import { createCollision } from './collision';
import type { FactionComponent } from '../components/faction';
import { createFaction } from '../components/faction';
import type { Targeting } from '../components/targeting';
import { getForward } from './physics';

/** Game time accumulator */
let gameTime = 0;

/** Previous frame input for edge detection */
const prevInput = {
  cycleWeaponNext: false,
  cycleWeaponPrev: false,
  fireSecondary: false,
};

/** Projectile spawn offset from ship center */
const PROJECTILE_SPAWN_OFFSET = 3;
const MISSILE_SPAWN_OFFSET = 4;

/** Collision radii */
const PROJECTILE_RADIUS = 0.5;
const MISSILE_RADIUS = 1.0;

/** Weapon system - handles firing and heat */
export function weaponSystem(world: World, dt: number): void {
  gameTime += dt;

  // Process entities with primary weapons
  for (const entity of queryEntities(world, ['transform', 'primaryWeapons', 'heat'])) {
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const weapons = getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons')!;
    const heat = getComponent<Heat>(world, entity, 'heat')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled');

    if (player) {
      handlePlayerPrimaryWeapons(world, entity, transform, weapons, heat, faction, player);
    }
  }

  // Process entities with secondary weapons
  for (const entity of queryEntities(world, ['transform', 'secondaryWeapons'])) {
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const weapons = getComponent<SecondaryWeapons>(world, entity, 'secondaryWeapons')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');
    const targeting = getComponent<Targeting>(world, entity, 'targeting');
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled');

    // Update lock progress
    updateLockProgress(world, weapons, targeting, dt);

    if (player) {
      handlePlayerSecondaryWeapons(world, entity, transform, weapons, faction, player);
    }
  }

  // Update previous input state
  const player = getPlayerInput(world);
  if (player) {
    prevInput.cycleWeaponNext = player.input.cycleWeaponNext;
    prevInput.cycleWeaponPrev = player.input.cycleWeaponPrev;
    prevInput.fireSecondary = player.input.fireSecondary;
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
  player: PlayerControlled
): void {
  const input = player.input;

  // Weapon cycling (edge-triggered)
  if (input.cycleWeaponNext && !prevInput.cycleWeaponNext) {
    cycleNextPrimary(weapons);
  }
  if (input.cycleWeaponPrev && !prevInput.cycleWeaponPrev) {
    cyclePrevPrimary(weapons);
  }

  // Fire primary weapon
  if (input.firePrimary) {
    const weapon = getCurrentPrimary(weapons);
    if (weapon) {
      const timeSinceFire = gameTime - weapons.lastFireTime;
      if (timeSinceFire >= weapon.fireRate && addHeat(heat, weapon.heatPerShot)) {
        weapons.lastFireTime = gameTime;
        spawnProjectile(world, entity, transform, weapon, faction);
      }
    }
  }
}

/** Update lock-on progress for secondary weapons */
function updateLockProgress(
  world: World,
  weapons: SecondaryWeapons,
  targeting: Targeting | undefined,
  dt: number
): void {
  const weapon = getCurrentSecondary(weapons);
  if (!weapon) return;

  const target = targeting?.currentTarget;

  // If no target or target doesn't exist, decay lock
  if (target === undefined || !entityExists(world, target)) {
    weapons.lockProgress = Math.max(0, weapons.lockProgress - dt * 2);
    weapons.lockTarget = undefined;
    return;
  }

  // If target changed, reset lock
  if (weapons.lockTarget !== target) {
    weapons.lockProgress = 0;
    weapons.lockTarget = target;
  }

  // Build lock if weapon requires it
  if (weapon.requiresLock && weapon.lockSpeed > 0) {
    weapons.lockProgress = Math.min(1, weapons.lockProgress + weapon.lockSpeed * dt);
  } else {
    // No lock required - always ready
    weapons.lockProgress = 1;
  }
}

/** Handle player secondary weapon input */
function handlePlayerSecondaryWeapons(
  world: World,
  entity: Entity,
  transform: Transform,
  weapons: SecondaryWeapons,
  faction: FactionComponent | undefined,
  player: PlayerControlled
): void {
  const input = player.input;

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

/** Spawn a projectile entity */
function spawnProjectile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: { damage: number; projectileSpeed: number; range: number },
  ownerFaction: FactionComponent | undefined
): void {
  const forward = getForward(ownerTransform);
  const spawnPos = ownerTransform.position.clone().addScaledVector(forward, PROJECTILE_SPAWN_OFFSET);

  const projectile = createEntity(world);

  addComponent(world, projectile, createTransform(spawnPos.x, spawnPos.y, spawnPos.z));
  addComponent(
    world,
    projectile,
    createProjectile(owner, weapon.damage, weapon.projectileSpeed, weapon.range, forward)
  );
  addComponent(world, projectile, createCollision(PROJECTILE_RADIUS));

  // Projectiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, projectile, createFaction(ownerFaction.faction));
  }
}

/** Spawn a missile entity */
function spawnMissile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: SecondaryWeapon,
  ownerFaction: FactionComponent | undefined,
  target: Entity | undefined
): void {
  const forward = getForward(ownerTransform);
  const spawnPos = ownerTransform.position.clone().addScaledVector(forward, MISSILE_SPAWN_OFFSET);

  const missile = createEntity(world);

  // Create transform at spawn position
  const missileTransform = createTransform(spawnPos.x, spawnPos.y, spawnPos.z);
  missileTransform.rotation.copy(ownerTransform.rotation);
  addComponent(world, missile, missileTransform);

  // Create missile component
  addComponent(
    world,
    missile,
    createMissile(owner, target, weapon.damage, weapon.speed, weapon.turnRate, weapon.range, forward)
  );

  // Add collision
  addComponent(world, missile, createCollision(MISSILE_RADIUS));

  // Missiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, missile, createFaction(ownerFaction.faction));
  }
}

/** Get player input (if player exists) */
function getPlayerInput(world: World): PlayerControlled | undefined {
  for (const entity of queryEntities(world, ['playerControlled'])) {
    return getComponent<PlayerControlled>(world, entity, 'playerControlled');
  }
  return undefined;
}

/** Reset weapon system state (for new game) */
export function resetWeaponSystem(): void {
  gameTime = 0;
  prevInput.cycleWeaponNext = false;
  prevInput.cycleWeaponPrev = false;
  prevInput.fireSecondary = false;
}
