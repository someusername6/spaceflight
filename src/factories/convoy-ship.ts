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

/** Stats for convoy freighter ships */
const CONVOY_FREIGHTER_STATS = {
  maxSpeed: 120,
  acceleration: 25,
  turnRate: 0.3,
  rollRate: 0.2,
  hull: 150,
  shields: 80,
  shieldRegen: 4,
  shieldDelay: 3,
  collisionRadius: 20,
};

/** Stats for convoy transport ships (larger, slower) */
const CONVOY_TRANSPORT_STATS = {
  maxSpeed: 80,
  acceleration: 15,
  turnRate: 0.2,
  rollRate: 0.15,
  hull: 300,
  shields: 150,
  shieldRegen: 6,
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

/** Get initial speed for convoy ships (for matching player/wingmen speed) */
export function getConvoyInitialSpeed(shipType: ConvoyShipType): number {
  const stats = getConvoyStats(shipType);
  return stats.maxSpeed * 0.5;
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
      initialSpeed: getConvoyInitialSpeed(shipType),
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

  // Convoy-specific components
  addComponent(world, entity, createConvoyShip(index));
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
    );
    entities.push(entity);
  }

  return entities;
}
