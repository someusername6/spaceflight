/**
 * AI Idle State - Target selection based on behavior mode.
 *
 * Handles target acquisition for different behavior modes:
 * - standard: Wingmen protect player, enemies attack nearest
 * - defensive: Stay near convoy, protect it from threats
 * - convoy-hunter: Enemies prioritize convoy ships
 * - station-hunter: Enemies prioritize station
 * - station-defense: Stay near station, protect it from threats
 */

import type { Vector3 } from 'three';
import { type AIControlled, AIState } from '../../components/ai';
import { Faction } from '../../components/faction';
import type { Transform } from '../../components/transform';
import type { Entity, World } from '../../core/types';
import { setRotationInputs } from './ai-movement';
import {
  findNearestConvoyShip,
  findNearestEnemy,
  findNearestThreatToConvoy,
  findNearestThreatToPlayer,
  findNearestThreatToStation,
  findStation,
} from './ai-utils';

/** Distance at which defensive ships disengage from combat to follow convoy (meters) */
export const DEFENSIVE_DISENGAGE_DISTANCE = 600;
/** Distance at which defensive ships start moving toward convoy (meters) */
const DEFENSIVE_FOLLOW_DISTANCE = 300;

/** Distance at which station-defense ships disengage from combat (meters) */
export const STATION_DEFENSE_DISENGAGE_DISTANCE = 1000;
/** Distance at which station-defense ships start moving toward station (meters) */
const STATION_DEFENSE_FOLLOW_DISTANCE = 600;
/** Minimum distance to keep from station center to avoid collision (meters) */
const STATION_AVOID_DISTANCE = 350;

/** Idle state - look for enemies based on behavior mode */
export function updateIdle(
  world: World,
  entity: Entity,
  ai: AIControlled,
  faction: Faction,
  transform: Transform,
  convoyCentroid: Vector3 | null,
  stationPosition: Vector3 | null,
): void {
  let target: Entity | null = null;
  const mode = ai.behaviorMode ?? 'standard';

  // Target selection based on behavior mode
  switch (mode) {
    case 'convoy-hunter':
      // Enemies: prioritize convoy ships, fall back to player squadron
      target = findNearestConvoyShip(world, entity);
      if (target === null) {
        target = findNearestEnemy(world, entity, faction);
      }
      break;

    case 'station-hunter':
      // Enemies: prioritize station, fall back to player squadron
      target = findStation(world);
      if (target === null) {
        target = findNearestEnemy(world, entity, faction);
      }
      break;

    case 'defensive': {
      // Wingmen: prioritize threats near convoy, stay close
      const distToConvoy = convoyCentroid
        ? transform.position.distanceTo(convoyCentroid)
        : Infinity;

      // If convoy is too far ahead, don't engage - follow the convoy
      if (distToConvoy > DEFENSIVE_DISENGAGE_DISTANCE) {
        target = null;
        break;
      }

      target = findNearestThreatToConvoy(
        world,
        entity,
        faction,
        convoyCentroid,
      );
      if (target === null) {
        // Fall back to threats to player if no convoy threats
        target = findNearestThreatToPlayer(world, entity, faction);
      }
      break;
    }

    case 'station-defense': {
      // Wingmen: prioritize threats near station, stay close
      const distToStation = stationPosition
        ? transform.position.distanceTo(stationPosition)
        : Infinity;

      // If too far from station, don't engage - return to station
      if (distToStation > STATION_DEFENSE_DISENGAGE_DISTANCE) {
        target = null;
        break;
      }

      target = findNearestThreatToStation(
        world,
        entity,
        faction,
        stationPosition,
      );
      if (target === null) {
        // Fall back to threats to player if no station threats
        target = findNearestThreatToPlayer(world, entity, faction);
      }
      break;
    }

    default:
      // Standard behavior: wingmen protect player, enemies attack nearest
      if (faction === Faction.Player) {
        target = findNearestThreatToPlayer(world, entity, faction);
      }
      if (target === null) {
        target = findNearestEnemy(world, entity, faction);
      }
      break;
  }

  if (target !== null) {
    ai.target = target;
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
    return;
  }

  // No target found - defensive ships should follow the convoy
  if (mode === 'defensive' && convoyCentroid) {
    const distanceToConvoy = transform.position.distanceTo(convoyCentroid);
    // Follow convoy if too far away
    if (distanceToConvoy > DEFENSIVE_FOLLOW_DISTANCE) {
      const direction = convoyCentroid
        .clone()
        .sub(transform.position)
        .normalize();
      setRotationInputs(ai, transform, direction);
      ai.input.accelerate = true;
    }
  }

  // No target found - station-defense ships should patrol near station
  if (mode === 'station-defense' && stationPosition) {
    const distanceToStation = transform.position.distanceTo(stationPosition);

    // Avoid station if too close
    if (distanceToStation < STATION_AVOID_DISTANCE) {
      const awayFromStation = transform.position
        .clone()
        .sub(stationPosition)
        .normalize();
      setRotationInputs(ai, transform, awayFromStation);
      ai.input.accelerate = true;
      return;
    }

    // Move toward station if too far away
    if (distanceToStation > STATION_DEFENSE_FOLLOW_DISTANCE) {
      const direction = stationPosition
        .clone()
        .sub(transform.position)
        .normalize();
      setRotationInputs(ai, transform, direction);
      ai.input.accelerate = true;
    }
  }
}
