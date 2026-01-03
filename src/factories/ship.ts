/**
 * Ship entity factory - creates ship entities with all required components.
 */

import type { Quaternion, Vector3 } from 'three';
import { createAIControlled } from '../components/ai';
import { createAimError } from '../components/aim-error';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createHeat } from '../components/heat';
import { createSecondaryWeaponFromDef } from '../components/missile';
import { createPhysics } from '../components/physics';
import { createPlayerControlled } from '../components/player';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import {
  createShipIdentity,
  generateCallsign,
} from '../components/ship-identity';
import { createTargeting } from '../components/targeting';
import { createTransform } from '../components/transform';
import {
  createPrimaryWeapons,
  createSecondaryWeapons,
  type WeaponBankSpec,
} from '../components/weapons';
import { addComponent, createEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { createCollision } from '../systems/collision';

/** Secondary weapon bank specification */
export interface SecondaryBankSpec {
  name: string;
  count: number;
  size: number;
}

/** Ship archetype stats */
export interface ShipStats {
  hull: number;
  shields: number;
  shieldRegen: number;
  shieldDelay: number;
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  rollRate: number;
  collisionRadius: number;
  maxHeat: number;
  coolingRate: number;
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
}

/** Predefined ship archetypes - bank sizes from SHIPS.md */
export const SHIP_ARCHETYPES: Record<string, ShipStats> = {
  // Interceptor: Primary 3 (size 1, 1, 2), Secondary 2 (size 1, 2)
  interceptor: {
    hull: 80,
    shields: 60,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 250,
    acceleration: 100,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 5,
    maxHeat: 100,
    coolingRate: 20,
    primaryWeapons: [
      { name: 'plasma', size: 1 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 1 },
      { name: 'rocket', count: 12, size: 2 },
    ],
  },
  // Scout: Primary 2 (size 1, 1), Secondary 1 (size 1)
  scout: {
    hull: 50,
    shields: 30,
    shieldRegen: 8,
    shieldDelay: 2,
    maxSpeed: 300,
    acceleration: 150,
    turnRate: 120,
    rollRate: 180,
    collisionRadius: 4,
    maxHeat: 80,
    coolingRate: 25,
    primaryWeapons: [{ name: 'pulse', size: 1 }],
    secondaryWeapons: [{ name: 'dart', count: 6, size: 1 }],
  },
};

/** Creates a player-controlled ship */
export function createPlayerShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      rotation,
    ),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
    }),
  );

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled());
  addComponent(world, entity, createShipIdentity(archetype, 'Alpha 1'));
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));

  // Add secondary weapons if defined (count scaled by bank size)
  if (stats.secondaryWeapons && stats.secondaryWeapons.length > 0) {
    const secondaryWeapons = stats.secondaryWeapons.map((w) =>
      createSecondaryWeaponFromDef(w.name, w.count, w.size),
    );
    addComponent(world, entity, createSecondaryWeapons(secondaryWeapons));
  }

  addComponent(world, entity, createCollision(stats.collisionRadius));

  return entity;
}

/** Creates an AI-controlled ship */
export function createAIShip(
  world: World,
  archetype: string,
  faction: Faction,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  const entity = createEntity(world);

  addComponent(
    world,
    entity,
    createTransform(
      position?.x ?? 0,
      position?.y ?? 0,
      position?.z ?? 0,
      rotation,
    ),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
    }),
  );

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());
  addComponent(world, entity, createFaction(faction));

  // Generate callsign based on faction
  const callsignPrefix = faction === Faction.Player ? 'Alpha' : 'Bandit';
  const callsign = generateCallsign(callsignPrefix);
  addComponent(world, entity, createShipIdentity(archetype, callsign));

  addComponent(world, entity, createAIControlled());
  addComponent(world, entity, createAimError(world.prng)); // AI has imperfect aim
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));
  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5)); // AI has larger hitbox

  return entity;
}

/** Creates an enemy ship (convenience wrapper) */
export function createEnemyShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  return createAIShip(world, archetype, Faction.Enemy, position, rotation);
}

/** Creates an allied AI ship (wingman) */
export function createWingman(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion,
): Entity {
  return createAIShip(world, archetype, Faction.Player, position, rotation);
}
