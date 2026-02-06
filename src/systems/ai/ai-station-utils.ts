/**
 * AI Station Utility Functions - Station-related helpers for AI system.
 *
 * Extracted from ai-utils.ts for modularity.
 */

import { Vector3 } from 'three';
import type { AIControlled } from '../../components/ai';
import { areEnemies, Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vectors to avoid allocations in hot path
const _stationPosition = new Vector3();
const _enemyStationPosition = new Vector3();

/** Maximum distance from station for station-defense wingmen to engage */
const MAX_STATION_DEFENSE_RANGE = 1000;

// Reusable collections for findStationAttacker (avoids per-call allocation)
const _targetCounts = new Map<Entity, number>();
const _candidates: Array<{ entity: Entity; isAttackingStation: boolean }> = [];

/**
 * Find the station entity (for station defense missions).
 * Stations are Player faction structures with structureType 'station'.
 */
export function findStation(world: World): Entity | null {
  for (const entity of queryEntities(world, [
    'structure',
    'transform',
    'faction',
  ])) {
    const structure = getComponent(world, entity, 'structure');
    if (structure?.structureType !== 'station') continue;

    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;

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
  return _stationPosition.copy(transform.position);
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

/**
 * Check if the AI is currently targeting a station.
 * Used to apply station-specific attack patterns.
 */
export function isTargetingStation(world: World, ai: AIControlled): boolean {
  if (!ai.target) return false;
  const structure = getComponent(world, ai.target, 'structure');
  return structure?.structureType === 'station';
}

/**
 * Find the enemy station entity (for attack station missions).
 * Enemy stations are Enemy faction structures with structureType 'station'.
 */
export function findEnemyStation(world: World): Entity | null {
  for (const entity of queryEntities(world, [
    'structure',
    'transform',
    'faction',
  ])) {
    const structure = getComponent(world, entity, 'structure');
    if (structure?.structureType !== 'station') continue;

    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Enemy) continue;

    // Check it's not destroyed
    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    return entity;
  }
  return null;
}

/**
 * Get the enemy station position (for attack station missions).
 * Returns null if no living enemy station exists.
 */
export function getEnemyStationPosition(world: World): Vector3 | null {
  const station = findEnemyStation(world);
  if (!station) return null;

  const transform = getComponent(world, station, 'transform');
  if (!transform) return null;

  // Return a copy to avoid mutation issues
  return _enemyStationPosition.copy(transform.position);
}

/**
 * Find an enemy ship attacking the station that needs a defender.
 * Prioritizes enemies that have fewer defenders targeting them.
 * Used by enemy defenders in attack-station missions.
 */
export function findStationAttacker(
  world: World,
  self: Entity,
  selfFaction: Faction,
  stationEntity: Entity | null,
): Entity | null {
  if (!stationEntity) return null;

  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  // Single pass: collect defender target counts and enemy candidates
  _targetCounts.clear();
  _candidates.length = 0;

  for (const other of queryEntities(world, [
    'aiControlled',
    'faction',
    'health',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    if (!otherFaction) continue;

    const otherAi = getComponent(world, other, 'aiControlled');
    if (!otherAi) continue;

    if (otherFaction.faction === selfFaction) {
      // Same faction = fellow defender, count their target
      if (other !== self && otherAi.target) {
        _targetCounts.set(
          otherAi.target,
          (_targetCounts.get(otherAi.target) ?? 0) + 1,
        );
      }
    } else if (areEnemies(selfFaction, otherFaction.faction)) {
      // Enemy faction = potential target
      const health = getComponent(world, other, 'health');
      if (health && isDead(health)) continue;

      _candidates.push({
        entity: other,
        isAttackingStation: otherAi.target === stationEntity,
      });
    }
  }

  // Score candidates: prefer station attackers with fewer defenders
  let best: Entity | null = null;
  let bestScore = Infinity;

  for (const { entity, isAttackingStation } of _candidates) {
    const defenderCount = _targetCounts.get(entity) ?? 0;
    const score = isAttackingStation
      ? defenderCount // 0, 1, 2, etc - lower is better
      : 1000 + defenderCount; // Non-attackers are lower priority

    if (score < bestScore) {
      bestScore = score;
      best = entity;
    }
  }

  return best;
}
