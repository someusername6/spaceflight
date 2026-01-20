/**
 * Shared helpers for convoy and station targeting tests.
 */

import { Vector3 } from 'three';
import { createCollision } from '../../../src/components/collision.ts';
import { createFaction, Faction } from '../../../src/components/faction.ts';
import { createHealth } from '../../../src/components/health.ts';
import { createMissile } from '../../../src/components/missile.ts';
import { createPhysics } from '../../../src/components/physics.ts';
import { createProjectile } from '../../../src/components/projectile.ts';
import { createShipIdentity } from '../../../src/components/ship-identity.ts';
import { createTransform } from '../../../src/components/transform.ts';
import {
  addComponent,
  createEntity,
  getComponent,
} from '../../../src/core/ecs.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';
import { createConvoyShipEntity } from '../../../src/factories/convoy-ship.ts';
import { createStationEntity } from '../../../src/factories/station.ts';

/**
 * Create an enemy ship with weapons capable of attacking.
 */
export function createEnemyWithWeapons(world, position) {
  const entity = createEntity(world);
  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z),
  );
  addComponent(world, entity, createFaction(Faction.Enemy));
  addComponent(world, entity, createShipIdentity('fighter', 'Enemy'));
  addComponent(world, entity, createHealth(100));
  addComponent(world, entity, createCollision(10));
  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: 100,
      acceleration: 50,
      turnRate: 90,
      rollRate: 90,
    }),
  );

  return entity;
}

/**
 * Create a player/allied ship with weapons.
 */
export function createPlayerWithWeapons(world, position) {
  const entity = createEntity(world);
  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z),
  );
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createShipIdentity('fighter', 'Player'));
  addComponent(world, entity, createHealth(100));
  addComponent(world, entity, createCollision(10));
  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: 100,
      acceleration: 50,
      turnRate: 90,
      rollRate: 90,
    }),
  );

  return entity;
}

/**
 * Create a convoy ship (Player for escort, Enemy for ambush).
 */
export function createTestConvoy(world, position, faction = Faction.Neutral) {
  const dest = new Vector3(position.x, position.y, position.z - 1000);
  return createConvoyShipEntity(
    world,
    'freighter',
    position,
    dest,
    100,
    0,
    10,
    { faction },
  );
}

/**
 * Create a station.
 */
export function createTestStation(world, position) {
  return createStationEntity(world, position);
}

/**
 * Spawn a missile directly (for testing).
 */
export function spawnTestMissile(
  world,
  missileKey,
  startPos,
  direction,
  owner,
  target,
) {
  const stats = MISSILES[missileKey];
  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(startPos.x, startPos.y, startPos.z),
  );

  const ownerFaction = getComponent(world, owner, 'faction');
  addComponent(
    world,
    entity,
    createFaction(ownerFaction?.faction ?? Faction.Enemy),
  );
  addComponent(world, entity, createCollision(1.0));
  addComponent(world, entity, createHealth(1));

  let shrapnelConfig;
  if (stats.flakRadius !== undefined) {
    shrapnelConfig = {
      flakRadius: stats.flakRadius,
      shrapnelCount: stats.shrapnelCount,
      shrapnelDamage: stats.shrapnelDamage,
      shrapnelSpeed: stats.shrapnelSpeed,
      shrapnelRange: stats.shrapnelRange,
    };
  }

  const missile = createMissile(
    owner,
    target,
    stats.damage,
    stats.speed,
    stats.turnRate,
    stats.range,
    direction,
    stats.aoeRadius ?? 0,
    stats.isNuke ?? false,
    missileKey,
    shrapnelConfig,
  );

  addComponent(world, entity, missile);
  return entity;
}

/**
 * Spawn a flak projectile.
 */
export function spawnFlakProjectile(world, startPos, direction, owner) {
  const weapon = PRIMARY_WEAPONS.flak;
  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(startPos.x, startPos.y, startPos.z),
  );

  const ownerFaction = getComponent(world, owner, 'faction');
  addComponent(
    world,
    entity,
    createFaction(ownerFaction?.faction ?? Faction.Enemy),
  );
  addComponent(world, entity, createCollision(0.5));

  const projectile = createProjectile(
    owner,
    weapon.damage,
    weapon.projectileSpeed,
    weapon.range,
    direction,
    weapon.category,
    weapon.name,
    {
      flakRadius: weapon.flakRadius,
      shrapnelCount: weapon.shrapnelCount,
      shrapnelDamage: weapon.shrapnelDamage,
      shrapnelSpeed: weapon.shrapnelSpeed,
      shrapnelRange: weapon.shrapnelRange,
    },
  );

  addComponent(world, entity, projectile);
  return entity;
}
