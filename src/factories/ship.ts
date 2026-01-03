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
  afterburnerHeatRate: number;
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
}

/** Predefined ship archetypes - all stats from SHIPS.md */
export const SHIP_ARCHETYPES: Record<string, ShipStats> = {
  // Scout: Fast, fragile gun platform - GUNS focus
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
    coolingRate: 15,
    afterburnerHeatRate: 25,
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 6, size: 1 }],
  },
  // Interceptor: Balanced fighter - BALANCED focus
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
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryWeapons: [
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 1 },
      { name: 'rocket', count: 6, size: 2 },
    ],
  },
  // Striker: Heavy gun platform - GUNS focus
  striker: {
    hull: 120,
    shields: 80,
    shieldRegen: 12,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 80,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 6,
    maxHeat: 150,
    coolingRate: 25,
    afterburnerHeatRate: 60,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'redLaser', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 4, size: 1 }],
  },
  // Bomber: Dedicated missile boat - MISSILES focus
  bomber: {
    hull: 100,
    shields: 70,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 75,
    rollRate: 110,
    collisionRadius: 7,
    maxHeat: 80,
    coolingRate: 12,
    afterburnerHeatRate: 55,
    primaryWeapons: [{ name: 'plasma', size: 2 }],
    secondaryWeapons: [
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
  },
  // Defender: Tanky missile platform - MISSILES focus
  defender: {
    hull: 150,
    shields: 120,
    shieldRegen: 18,
    shieldDelay: 2.5,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 70,
    rollRate: 100,
    collisionRadius: 7,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 50,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
  },
  // Raider: Glass cannon gun platform - GUNS focus
  raider: {
    hull: 60,
    shields: 40,
    shieldRegen: 6,
    shieldDelay: 4,
    maxSpeed: 280,
    acceleration: 120,
    turnRate: 110,
    rollRate: 160,
    collisionRadius: 5,
    maxHeat: 140,
    coolingRate: 22,
    afterburnerHeatRate: 35,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 4, size: 1 },
      { name: 'rocket', count: 4, size: 1 },
    ],
  },
  // Sentinel: Long-range support - BALANCED (beam-optimized)
  sentinel: {
    hull: 100,
    shields: 100,
    shieldRegen: 15,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 90,
    turnRate: 90,
    rollRate: 130,
    collisionRadius: 6,
    maxHeat: 130,
    coolingRate: 22,
    afterburnerHeatRate: 45,
    primaryWeapons: [
      { name: 'blueLaser', size: 3 },
      { name: 'greenLaser', size: 2 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'torpedo', count: 2, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
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
      afterburnerHeatRate: stats.afterburnerHeatRate,
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
      afterburnerHeatRate: stats.afterburnerHeatRate,
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
