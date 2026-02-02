/**
 * Convoy Ship Factory - creates defenseless escort ships for convoy missions.
 *
 * Convoy ships are slow, vulnerable NPCs that fly toward the escape zone.
 * They have no weapons and use a simple autopilot instead of combat AI.
 */

import { Quaternion, Vector3 } from 'three';
import { createCollision } from '../components/collision';
import { createConvoyAutopilot, createConvoyShip } from '../components/convoy';
import { createDamageTracking } from '../components/damage-tracking';
import { createFaction } from '../components/faction';
import { createHealth } from '../components/health';
import { createPhysics } from '../components/physics';
import { createShieldHit } from '../components/shield-hit';
import { createShields } from '../components/shields';
import { createShipIdentity } from '../components/ship-identity';
import { createTransform } from '../components/transform';
import { addComponent, createEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { Faction } from '../core/types';
import { addHullColliderFromClass } from './ship';

/**
 * Stats for convoy freighter ships (medium cargo hauler).
 * Compared to fighters: slower, less maneuverable, but tougher.
 * Reference: Fighter has hull=90, shields=65, maxSpeed=125, turnRate=100°/s
 */
const CONVOY_FREIGHTER_STATS = {
  maxSpeed: 70, // Slower than all fighters (slowest fighter: 90)
  acceleration: 20,
  turnRate: 45, // Degrees/sec - sluggish compared to fighters (70-120)
  rollRate: 60, // Degrees/sec
  hull: 200, // ~2x fighter
  shields: 100, // ~1.5x fighter
  shieldRegen: 6,
  shieldDelay: 3,
  collisionRadius: 20,
};

/**
 * Stats for convoy transport ships (large cargo hauler).
 * Very slow and unwieldy, but heavily armored.
 * Reference: Defender (tankiest fighter) has hull=165, shields=130
 *
 * Tuned for ~65-85% win rate across all sectors. Higher durability compensates
 * for AI limitations (can't dodge well) and continuous enemy spawns over ~180s.
 */
const CONVOY_TRANSPORT_STATS = {
  maxSpeed: 55, // Very slow - lumbering cargo ship
  acceleration: 12,
  turnRate: 30, // Degrees/sec - very sluggish
  rollRate: 40, // Degrees/sec
  hull: 600, // ~4x defender - high to survive sustained attacks
  shields: 300, // ~2.3x defender - regenerates during lulls in combat
  shieldRegen: 10,
  shieldDelay: 4,
  collisionRadius: 35,
};

export type ConvoyShipType = 'freighter' | 'transport';

/** Get stats for a convoy ship type */
function getConvoyStats(shipType: ConvoyShipType) {
  switch (shipType) {
    case 'transport':
      return CONVOY_TRANSPORT_STATS;
    default:
      return CONVOY_FREIGHTER_STATS;
  }
}

/** Get max speed for convoy ships (for matching player/wingmen initial speed) */
export function getConvoyMaxSpeed(shipType: ConvoyShipType): number {
  const stats = getConvoyStats(shipType);
  return stats.maxSpeed;
}

/** Get collision radius for convoy ships (for spawn spacing calculations) */
export function getConvoyCollisionRadius(shipType: ConvoyShipType): number {
  const stats = getConvoyStats(shipType);
  return stats.collisionRadius;
}

/** Options for creating convoy ships (ambush missions need different settings) */
export interface ConvoyShipOptions {
  /** Faction of the convoy ship. Escort=Player, Ambush=Enemy (default: Neutral) */
  faction?: Faction;
  /** For ambush missions: distance threshold for stop behavior */
  stopDistance?: number;
  /** For ambush missions: add damage tracking for escort aggro */
  addDamageTracking?: boolean;
}

/**
 * Create a convoy ship entity.
 *
 * Convoy ships have no weapons and use a simple autopilot to fly toward
 * the escape zone destination.
 *
 * For escort missions: Neutral faction (default)
 * For ambush missions: Enemy faction with stopDistance and damageTracking
 */
export function createConvoyShipEntity(
  world: World,
  shipType: ConvoyShipType,
  position: Vector3,
  destination: Vector3,
  escapeZoneRadius: number,
  index: number,
  jumpChargeTime: number,
  options: ConvoyShipOptions = {},
): Entity {
  const stats = getConvoyStats(shipType);
  const entity = createEntity(world);

  // Face toward destination
  const direction = destination.clone().sub(position).normalize();
  const forward = new Vector3(0, 0, -1);
  const rotation = new Quaternion().setFromUnitVectors(forward, direction);

  addComponent(
    world,
    entity,
    createTransform(position.x, position.y, position.z, rotation),
  );

  addComponent(
    world,
    entity,
    createPhysics({
      maxSpeed: stats.maxSpeed,
      acceleration: stats.acceleration,
      turnRate: stats.turnRate,
      rollRate: stats.rollRate,
      initialSpeed: stats.maxSpeed, // Start at max speed to match player/wingmen
    }),
  );

  addComponent(world, entity, createHealth(stats.hull));
  addComponent(
    world,
    entity,
    createShields(stats.shields, stats.shieldRegen, stats.shieldDelay),
  );
  addComponent(world, entity, createShieldHit());

  // Faction: Player for escort, Enemy for ambush (both render yellow via visual override)
  const faction = options.faction ?? Faction.Neutral;
  addComponent(world, entity, createFaction(faction));

  // Ship identity for rendering and HUD
  const callsign =
    faction === Faction.Enemy ? `Target ${index + 1}` : `Convoy ${index + 1}`;
  addComponent(world, entity, createShipIdentity(shipType, callsign));

  addComponent(world, entity, createCollision(stats.collisionRadius));

  // Add hull collider for ship-ship collision and weapon detection
  // Large convoy ships use hull for everything (useHullForWeapons = true)
  addHullColliderFromClass(world, entity, shipType, true);

  // Convoy-specific components
  addComponent(
    world,
    entity,
    createConvoyShip(index, jumpChargeTime, options.stopDistance),
  );
  addComponent(
    world,
    entity,
    createConvoyAutopilot(destination, escapeZoneRadius),
  );

  // Add damage tracking for ambush missions (escort aggro)
  if (options.addDamageTracking) {
    addComponent(world, entity, createDamageTracking());
  }

  return entity;
}
