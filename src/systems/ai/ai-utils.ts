/**
 * AI Utility Functions - Helper functions used by AI system.
 */

import { Vector3 } from 'three';
import { type AIControlled, AIState } from '../../components/ai';
import { areEnemies, type Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vectors to avoid allocations in hot path
const _centroid = new Vector3();
const _returnCentroid = new Vector3();

/** Count how many AI are currently engaging a specific target */
export function countEngagingTarget(world: World, target: Entity): number {
  let count = 0;
  for (const entity of queryEntities(world, ['aiControlled'])) {
    const ai = getComponent(world, entity, 'aiControlled');
    if (ai && ai.state === AIState.Engage && ai.target === target) {
      count++;
    }
  }
  return count;
}

/** Check if an entity is the player */
export function isPlayer(world: World, entity: Entity): boolean {
  return getComponent(world, entity, 'playerControlled') !== undefined;
}

/** Find the player entity */
export function findPlayer(world: World): Entity | null {
  for (const entity of queryEntities(world, [
    'playerControlled',
    'transform',
  ])) {
    return entity;
  }
  return null;
}

/** Find the nearest enemy that is actively threatening (targeting) the player */
export function findNearestThreatToPlayer(
  world: World,
  self: Entity,
  selfFaction: Faction,
): Entity | null {
  const player = findPlayer(world);
  if (!player) return null;

  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  let nearestThreat: Entity | null = null;
  let nearestDist = Infinity;

  for (const entity of queryEntities(world, [
    'aiControlled',
    'transform',
    'faction',
    'health',
  ])) {
    const entityFaction = getComponent(world, entity, 'faction');
    if (!entityFaction || !areEnemies(selfFaction, entityFaction.faction))
      continue;

    const health = getComponent(world, entity, 'health');
    if (!health || isDead(health)) continue;

    // Check if this enemy is targeting the player
    const ai = getComponent(world, entity, 'aiControlled');
    if (!ai || ai.target !== player) continue;
    if (ai.state !== AIState.Pursue && ai.state !== AIState.Engage) continue;

    const entityTransform = getComponent(world, entity, 'transform');
    if (!entityTransform) continue;
    const dist = selfTransform.position.distanceTo(entityTransform.position);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestThreat = entity;
    }
  }

  return nearestThreat;
}

/** Find the nearest enemy entity */
export function findNearestEnemy(
  world: World,
  self: Entity,
  selfFaction: Faction,
): Entity | null {
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  for (const other of queryEntities(world, [
    'transform',
    'faction',
    'health',
  ])) {
    if (other === self) continue;

    // Skip dead or dying enemies
    const otherHealth = getComponent(world, other, 'health');
    if (otherHealth && isDead(otherHealth)) continue;

    const otherFaction = getComponent(world, other, 'faction');
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction))
      continue;

    const otherTransform = getComponent(world, other, 'transform');
    if (!otherTransform) continue;
    const dist = selfTransform.position.distanceTo(otherTransform.position);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

/** Set AI target directly (for external systems) */
export function setAITarget(ai: AIControlled, target: Entity | null): void {
  ai.target = target;
}

/**
 * Find the nearest convoy ship (for convoy-hunter enemies).
 * Convoy ships are Neutral faction with convoyShip component.
 */
export function findNearestConvoyShip(
  world: World,
  self: Entity,
): Entity | null {
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  for (const other of queryEntities(world, [
    'convoyShip',
    'transform',
    'health',
  ])) {
    // Skip dead convoy ships
    const otherHealth = getComponent(world, other, 'health');
    if (otherHealth && isDead(otherHealth)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    if (!otherTransform) continue;
    const dist = selfTransform.position.distanceTo(otherTransform.position);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

/**
 * Get the centroid position of all living convoy ships.
 * Used for defensive wingmen to stay near convoy.
 * Returns a copy to avoid mutation issues.
 */
export function getConvoyCentroid(world: World): Vector3 | null {
  let count = 0;
  _centroid.set(0, 0, 0);

  for (const entity of queryEntities(world, [
    'convoyShip',
    'transform',
    'health',
  ])) {
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;
    _centroid.add(transform.position);
    count++;
  }

  if (count === 0) return null;

  _centroid.divideScalar(count);
  // Return a copy so callers can safely modify it
  return _returnCentroid.copy(_centroid);
}

/** Maximum distance from convoy for defensive wingmen to engage */
const MAX_DEFENSIVE_RANGE = 800;

/** Maximum distance from station for station-defense wingmen to engage */
const MAX_STATION_DEFENSE_RANGE = 1000;

/**
 * Find nearest enemy that is threatening the convoy (for defensive wingmen).
 * Only returns enemies within MAX_DEFENSIVE_RANGE of convoy centroid.
 *
 * @param convoyCentroid - Pre-computed convoy centroid (pass to avoid redundant computation)
 */
export function findNearestThreatToConvoy(
  world: World,
  self: Entity,
  selfFaction: Faction,
  convoyCentroid: Vector3 | null,
): Entity | null {
  if (!convoyCentroid) return null;

  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const other of queryEntities(world, [
    'aiControlled',
    'transform',
    'faction',
    'health',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction))
      continue;

    const health = getComponent(world, other, 'health');
    if (health && isDead(health)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    if (!otherTransform) continue;

    // Only consider enemies near the convoy
    const distToConvoy = otherTransform.position.distanceTo(convoyCentroid);
    if (distToConvoy > MAX_DEFENSIVE_RANGE) continue;

    // Find nearest to self among convoy threats
    const distToSelf = selfTransform.position.distanceTo(
      otherTransform.position,
    );
    if (distToSelf < nearestDist) {
      nearestDist = distToSelf;
      nearest = other;
    }
  }

  return nearest;
}

/**
 * Find the station entity (for station defense missions).
 * Stations are Player faction structures with structureType 'station'.
 */
export function findStation(world: World): Entity | null {
  for (const entity of queryEntities(world, ['structure', 'transform'])) {
    const structure = getComponent(world, entity, 'structure');
    if (structure?.structureType !== 'station') continue;

    // Check it's not destroyed
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    return entity;
  }
  return null;
}

/**
 * Get the station position (for station defense missions).
 * Returns null if no living station exists.
 */
export function getStationPosition(world: World): Vector3 | null {
  const station = findStation(world);
  if (!station) return null;

  const transform = getComponent(world, station, 'transform');
  if (!transform) return null;

  // Return a copy to avoid mutation issues
  return _returnCentroid.copy(transform.position);
}

/**
 * Find nearest enemy that is threatening the station (for station-defense wingmen).
 * Only returns enemies within MAX_STATION_DEFENSE_RANGE of station.
 *
 * @param stationPosition - Pre-computed station position (pass to avoid redundant lookup)
 */
export function findNearestThreatToStation(
  world: World,
  self: Entity,
  selfFaction: Faction,
  stationPosition: Vector3 | null,
): Entity | null {
  if (!stationPosition) return null;

  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const other of queryEntities(world, [
    'aiControlled',
    'transform',
    'faction',
    'health',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction))
      continue;

    const health = getComponent(world, other, 'health');
    if (health && isDead(health)) continue;

    const otherTransform = getComponent(world, other, 'transform');
    if (!otherTransform) continue;

    // Only consider enemies near the station
    const distToStation = otherTransform.position.distanceTo(stationPosition);
    if (distToStation > MAX_STATION_DEFENSE_RANGE) continue;

    // Find nearest to self among station threats
    const distToSelf = selfTransform.position.distanceTo(
      otherTransform.position,
    );
    if (distToSelf < nearestDist) {
      nearestDist = distToSelf;
      nearest = other;
    }
  }

  return nearest;
}

// Re-export ambush mission utilities for backward compatibility
export {
  findNearestEnemyConvoyShip,
  findNearestEnemyEscort,
  getEnemyConvoyCentroid,
} from './ai-ambush-utils';
