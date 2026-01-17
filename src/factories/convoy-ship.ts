/**
 * Convoy Ship Factory - creates defenseless escort ships for convoy missions.
 *
 * Convoy ships are slow, vulnerable NPCs that fly toward the escape zone.
 * They have no weapons and use a simple autopilot instead of combat AI.
 */

import { Quaternion, Vector3 } from 'three';
import { createCollision } from '../components/collision';
import { createConvoyAutopilot, createConvoyShip } from '../components/convoy';
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

/**
 * Create a convoy ship entity.
 *
 * Convoy ships are Neutral faction, have no weapons, and use
 * a simple autopilot to fly toward the escape zone destination.
 */
export function createConvoyShipEntity(
  world: World,
  shipType: ConvoyShipType,
  position: Vector3,
  destination: Vector3,
  escapeZoneRadius: number,
  index: number,
  jumpChargeTime: number,
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

  // Neutral faction - non-combatant (enemies must explicitly target via convoy-hunter mode)
  addComponent(world, entity, createFaction(Faction.Neutral));

  // Ship identity for rendering and HUD
  const callsign = `Convoy ${index + 1}`;
  addComponent(world, entity, createShipIdentity(shipType, callsign));

  addComponent(world, entity, createCollision(stats.collisionRadius));

  // Add hull collider for ship-ship collision and weapon detection
  // Large convoy ships use hull for everything (useHullForWeapons = true)
  addHullColliderFromClass(world, entity, shipType, true);

  // Convoy-specific components
  addComponent(world, entity, createConvoyShip(index, jumpChargeTime));
  addComponent(
    world,
    entity,
    createConvoyAutopilot(destination, escapeZoneRadius),
  );

  return entity;
}

/**
 * Spawn a formation of convoy ships.
 *
 * Ships are arranged in a line perpendicular to the direction of travel.
 */
export function spawnConvoyFormation(
  world: World,
  shipType: ConvoyShipType,
  count: number,
  startPosition: Vector3,
  destination: Vector3,
  escapeZoneRadius: number,
  jumpChargeTime: number,
  spacing: number = 60,
): Entity[] {
  const entities: Entity[] = [];

  // Calculate right vector for formation spread
  const forward = destination.clone().sub(startPosition).normalize();
  const up = new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(forward, up).normalize();

  for (let i = 0; i < count; i++) {
    // Spread ships left/right of center
    const offset = (i - (count - 1) / 2) * spacing;
    const shipPosition = startPosition.clone().addScaledVector(right, offset);

    const entity = createConvoyShipEntity(
      world,
      shipType,
      shipPosition,
      destination,
      escapeZoneRadius,
      i,
      jumpChargeTime,
    );
    entities.push(entity);
  }

  return entities;
}
