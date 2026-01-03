/**
 * Ship entity factory - creates ship entities with all required components.
 */

import type { World, Entity } from '../core/types';
import { Faction } from '../core/types';
import { createEntity, addComponent } from '../core/ecs';
import { createTransform } from '../components/transform';
import { createPhysics } from '../components/physics';
import { createHealth } from '../components/health';
import { createFaction } from '../components/faction';
import { createPlayerControlled } from '../components/player';
import { createAIControlled } from '../components/ai';
import { createTargeting } from '../components/targeting';
import { createPrimaryWeapons } from '../components/weapons';
import { createHeat } from '../components/heat';
import { createShields } from '../components/shields';
import { createCollision } from '../systems/collision';
import { Vector3, Quaternion } from 'three';

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
  primaryWeapons: string[];
}

/** Predefined ship archetypes (Slice 1: basic only) */
export const SHIP_ARCHETYPES: Record<string, ShipStats> = {
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
    coolingRate: 20, // Heat units per second
    primaryWeapons: ['plasma'],
  },
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
    primaryWeapons: ['pulse'],
  },
};

/** Creates a player-controlled ship */
export function createPlayerShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion
): Entity {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  const entity = createEntity(world);

  addComponent(world, entity, createTransform(
    position?.x ?? 0,
    position?.y ?? 0,
    position?.z ?? 0,
    rotation
  ));

  addComponent(world, entity, createPhysics({
    maxSpeed: stats.maxSpeed,
    acceleration: stats.acceleration,
    turnRate: stats.turnRate,
    rollRate: stats.rollRate,
  }));

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(world, entity, createShields(stats.shields, stats.shieldRegen, stats.shieldDelay));
  addComponent(world, entity, createFaction(Faction.Player));
  addComponent(world, entity, createPlayerControlled());
  addComponent(world, entity, createTargeting());
  addComponent(world, entity, createHeat(stats.maxHeat, stats.coolingRate));
  addComponent(world, entity, createPrimaryWeapons(stats.primaryWeapons));
  addComponent(world, entity, createCollision(stats.collisionRadius));

  return entity;
}

/** Creates an AI-controlled ship */
export function createAIShip(
  world: World,
  archetype: string,
  faction: Faction,
  position?: Vector3,
  rotation?: Quaternion
): Entity {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown ship archetype: ${archetype}`);
  }

  const entity = createEntity(world);

  addComponent(world, entity, createTransform(
    position?.x ?? 0,
    position?.y ?? 0,
    position?.z ?? 0,
    rotation
  ));

  addComponent(world, entity, createPhysics({
    maxSpeed: stats.maxSpeed,
    acceleration: stats.acceleration,
    turnRate: stats.turnRate,
    rollRate: stats.rollRate,
  }));

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(world, entity, createShields(stats.shields, stats.shieldRegen, stats.shieldDelay));
  addComponent(world, entity, createFaction(faction));
  addComponent(world, entity, createAIControlled());
  addComponent(world, entity, createCollision(stats.collisionRadius * 1.5)); // AI has larger hitbox

  return entity;
}

/** Creates an enemy ship (convenience wrapper) */
export function createEnemyShip(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion
): Entity {
  return createAIShip(world, archetype, Faction.Enemy, position, rotation);
}

/** Creates an allied AI ship (wingman) */
export function createWingman(
  world: World,
  archetype: string,
  position?: Vector3,
  rotation?: Quaternion
): Entity {
  return createAIShip(world, archetype, Faction.Player, position, rotation);
}
