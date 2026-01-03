/**
 * Weapon System - Handles firing primary weapons and spawning projectiles.
 */

import type { World, Entity } from '../core/types';
import { queryEntities, getComponent, createEntity, addComponent } from '../core/ecs';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import type { PlayerControlled } from '../components/player';
import type { PrimaryWeapons } from '../components/weapons';
import { getCurrentPrimary, cycleNextPrimary, cyclePrevPrimary } from '../components/weapons';
import type { Heat } from '../components/heat';
import { addHeat, coolDown } from '../components/heat';
import { createProjectile } from '../components/projectile';
import { createCollision } from './collision';
import type { FactionComponent } from '../components/faction';
import { createFaction } from '../components/faction';
import { getForward } from './physics';

/** Game time accumulator */
let gameTime = 0;

/** Previous frame input for edge detection */
const prevInput = {
  cycleWeaponNext: false,
  cycleWeaponPrev: false,
};

/** Projectile spawn offset from ship center */
const PROJECTILE_SPAWN_OFFSET = 3;

/** Projectile collision radius */
const PROJECTILE_RADIUS = 0.5;

/** Weapon system - handles firing and heat */
export function weaponSystem(world: World, dt: number): void {
  gameTime += dt;

  // Process each armed entity
  for (const entity of queryEntities(world, ['transform', 'primaryWeapons', 'heat'])) {
    const transform = getComponent<Transform>(world, entity, 'transform')!;
    const weapons = getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons')!;
    const heat = getComponent<Heat>(world, entity, 'heat')!;
    const faction = getComponent<FactionComponent>(world, entity, 'faction');

    // Cool down heat
    coolDown(heat, dt);

    // Check if this is player (for input handling)
    const player = getComponent<PlayerControlled>(world, entity, 'playerControlled');
    if (player) {
      handlePlayerWeapons(world, entity, transform, weapons, heat, faction, player);
    }
    // AI weapon handling would go here
  }

  // Update previous input state
  const player = getPlayerInput(world);
  if (player) {
    prevInput.cycleWeaponNext = player.input.cycleWeaponNext;
    prevInput.cycleWeaponPrev = player.input.cycleWeaponPrev;
  }
}

/** Handle player weapon input */
function handlePlayerWeapons(
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
        // Can fire!
        weapons.lastFireTime = gameTime;
        spawnProjectile(world, entity, transform, weapon, faction);
      }
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
}
