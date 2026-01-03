/**
 * Weapon Spawning - Creates projectile and missile entities.
 */

import { Vector3 } from 'three';
import type { AimError } from '../components/aim-error';
import { applyAimError } from '../components/aim-error';
import type { FactionComponent } from '../components/faction';
import { createFaction } from '../components/faction';
import { createMissile } from '../components/missile';
import { createProjectile } from '../components/projectile';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import type { SecondaryWeapon } from '../components/weapons';
import { addComponent, createEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createCollision } from './collision';
import { getForward } from './physics';

/** Projectile spawn offset from ship center */
const PROJECTILE_SPAWN_OFFSET = 3;
const MISSILE_SPAWN_OFFSET = 4;

/** Collision radii */
const PROJECTILE_RADIUS = 0.5;
const MISSILE_RADIUS = 1.0;

// Reusable spawn position vector (avoid per-spawn allocations)
const spawnPos = new Vector3();

/** Spawn a projectile entity */
export function spawnProjectile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: { damage: number; projectileSpeed: number; range: number },
  ownerFaction: FactionComponent | undefined,
): void {
  const forward = getForward(ownerTransform);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(forward, PROJECTILE_SPAWN_OFFSET);

  const projectile = createEntity(world);

  addComponent(
    world,
    projectile,
    createTransform(spawnPos.x, spawnPos.y, spawnPos.z),
  );
  addComponent(
    world,
    projectile,
    createProjectile(
      owner,
      weapon.damage,
      weapon.projectileSpeed,
      weapon.range,
      forward,
    ),
  );
  addComponent(world, projectile, createCollision(PROJECTILE_RADIUS));

  // Projectiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, projectile, createFaction(ownerFaction.faction));
  }
}

/** Spawn a projectile with aim error (for AI) */
export function spawnProjectileWithAimError(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: { damage: number; projectileSpeed: number; range: number },
  ownerFaction: FactionComponent | undefined,
  aimError: AimError | undefined,
): void {
  const forward = getForward(ownerTransform);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(forward, PROJECTILE_SPAWN_OFFSET);

  // Apply aim error if present, otherwise use forward direction
  const direction = aimError ? applyAimError(forward, aimError) : forward;

  const projectile = createEntity(world);

  addComponent(
    world,
    projectile,
    createTransform(spawnPos.x, spawnPos.y, spawnPos.z),
  );
  addComponent(
    world,
    projectile,
    createProjectile(
      owner,
      weapon.damage,
      weapon.projectileSpeed,
      weapon.range,
      direction,
    ),
  );
  addComponent(world, projectile, createCollision(PROJECTILE_RADIUS));

  // Projectiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, projectile, createFaction(ownerFaction.faction));
  }
}

/** Spawn a missile entity */
export function spawnMissile(
  world: World,
  owner: Entity,
  ownerTransform: Transform,
  weapon: SecondaryWeapon,
  ownerFaction: FactionComponent | undefined,
  target: Entity | undefined,
): void {
  const forward = getForward(ownerTransform);
  spawnPos
    .copy(ownerTransform.position)
    .addScaledVector(forward, MISSILE_SPAWN_OFFSET);

  const missile = createEntity(world);

  // Create transform at spawn position
  const missileTransform = createTransform(spawnPos.x, spawnPos.y, spawnPos.z);
  missileTransform.rotation.copy(ownerTransform.rotation);
  addComponent(world, missile, missileTransform);

  // Create missile component
  addComponent(
    world,
    missile,
    createMissile(
      owner,
      target,
      weapon.damage,
      weapon.speed,
      weapon.turnRate,
      weapon.range,
      forward,
    ),
  );

  // Add collision
  addComponent(world, missile, createCollision(MISSILE_RADIUS));

  // Missiles inherit owner's faction
  if (ownerFaction) {
    addComponent(world, missile, createFaction(ownerFaction.faction));
  }
}
