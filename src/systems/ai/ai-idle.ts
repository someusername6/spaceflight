/**
 * AI Idle State - Target selection based on behavior mode.
 *
 * Handles target acquisition for different behavior modes:
 * - standard: Wingmen protect player, enemies attack nearest
 * - defensive: Stay near convoy, protect it from threats
 * - convoy-hunter: Enemies prioritize convoy ships
 * - station-hunter: Enemies prioritize station
 * - station-defense: Stay near station, protect it from threats
 * - convoy-interceptor: Wingmen attack escorts, then approach enemy convoy to stop it
 * - station-assault-high-dps: High DPS ships attack enemy station
 * - station-assault-low-dps: Low DPS ships attack enemy defenders
 */

import { Vector3 } from 'three';
import { type AIControlled, AIState } from '../../components/ai';
import { Faction } from '../../components/faction';
import type { Transform } from '../../components/transform';
import { entityExists, getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
  findNearestEnemyConvoyShip,
  findNearestEnemyEscort,
} from './ai-ambush-utils';
import {
  findNearestConvoyShip,
  findNearestThreatToConvoy,
} from './ai-convoy-utils';
import { setRotationInputs } from './ai-movement';
import {
  findEnemyStation,
  findNearestThreatToStation,
  findStation,
  findStationAttacker,
} from './ai-station-utils';
import { findNearestEnemy, findNearestThreatToPlayer } from './ai-utils';

// Reusable vector to avoid allocations in hot path
const _tempDirection = new Vector3();

/** Time window for damage tracking to trigger aggro (seconds) */
const DAMAGE_AGGRO_WINDOW = 10;

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

/** Distance at which convoy-interceptor ships approach enemy convoy (meters) */
const CONVOY_INTERCEPT_APPROACH_DISTANCE = 300;

/** Idle state - look for enemies based on behavior mode */
export function updateIdle(
  world: World,
  entity: Entity,
  ai: AIControlled,
  faction: Faction,
  transform: Transform,
  convoyCentroid: Vector3 | null,
  stationPosition: Vector3 | null,
  enemyConvoyCentroid: Vector3 | null,
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

    case 'convoy-guard-aggressive':
      // Enemy escorts: proactively attack player/wingmen
      // Attack nearest enemy (player faction) - aggressive pursuit
      target = findNearestEnemy(world, entity, faction);
      break;

    case 'convoy-guard-defensive': {
      // Enemy escorts: reactive only - stay near convoy, only engage if provoked
      // Check damage tracking on self and nearby convoy ships
      const gameTime = world.systemState.gameTime;

      // Check if self was attacked recently
      const selfTracking = getComponent(world, entity, 'damageTracking');
      if (selfTracking && selfTracking.lastAttacker !== null) {
        const attacker = selfTracking.lastAttacker;
        if (
          gameTime - selfTracking.lastDamageTime < DAMAGE_AGGRO_WINDOW &&
          entityExists(world, attacker)
        ) {
          target = attacker;
          break;
        }
      }

      // Check if any Neutral convoy ship was attacked (defend the convoy)
      for (const convoy of queryEntities(world, [
        'convoyShip',
        'faction',
        'damageTracking',
      ])) {
        const convoyFaction = getComponent(world, convoy, 'faction');
        if (convoyFaction?.faction !== Faction.Neutral) continue;

        const tracking = getComponent(world, convoy, 'damageTracking');
        if (tracking && tracking.lastAttacker !== null) {
          const attacker = tracking.lastAttacker;
          if (
            gameTime - tracking.lastDamageTime < DAMAGE_AGGRO_WINDOW &&
            entityExists(world, attacker)
          ) {
            target = attacker;
            // Break exits the for-loop (not the switch); outer break at line 184 exits switch case
            break;
          }
        }
      }
      break;
    }

    case 'convoy-interceptor':
      // Wingmen in ambush missions: prioritize escorts, then approach convoy
      // First: attack enemy escorts (non-convoy enemy ships)
      target = findNearestEnemyEscort(world, entity, faction);
      if (target === null) {
        // No escorts - target enemy convoy ships to approach them
        // (AI will pursue and get close enough to trigger stop)
        target = findNearestEnemyConvoyShip(world, entity);
      }
      break;

    case 'station-assault-high-dps':
      // High DPS ships: prioritize enemy station, fall back to defenders
      target = findEnemyStation(world);
      if (target === null) {
        target = findNearestEnemy(world, entity, faction);
      }
      break;

    case 'station-assault-low-dps':
      // Low DPS ships: attack defenders to protect the bombers
      target = findNearestEnemy(world, entity, faction);
      break;

    case 'station-defender': {
      // Enemy defenders: prioritize station attackers with smart distribution
      const enemyStation = findEnemyStation(world);
      target = findStationAttacker(world, entity, faction, enemyStation);
      if (target === null) {
        target = findNearestEnemy(world, entity, faction);
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
      const direction = _tempDirection
        .copy(convoyCentroid)
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
      const awayFromStation = _tempDirection
        .copy(transform.position)
        .sub(stationPosition)
        .normalize();
      setRotationInputs(ai, transform, awayFromStation);
      ai.input.accelerate = true;
      return;
    }

    // Move toward station if too far away
    if (distanceToStation > STATION_DEFENSE_FOLLOW_DISTANCE) {
      const direction = _tempDirection
        .copy(stationPosition)
        .sub(transform.position)
        .normalize();
      setRotationInputs(ai, transform, direction);
      ai.input.accelerate = true;
    }
  }

  // No target found - convoy-interceptor ships should approach enemy convoy
  if (mode === 'convoy-interceptor' && enemyConvoyCentroid) {
    const distanceToConvoy = transform.position.distanceTo(enemyConvoyCentroid);
    // Approach convoy if too far away (to trigger stop behavior)
    if (distanceToConvoy > CONVOY_INTERCEPT_APPROACH_DISTANCE) {
      const direction = _tempDirection
        .copy(enemyConvoyCentroid)
        .sub(transform.position)
        .normalize();
      setRotationInputs(ai, transform, direction);
      ai.input.accelerate = true;
    }
  }
}
