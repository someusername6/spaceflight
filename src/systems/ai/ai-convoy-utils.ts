/**
 * AI Convoy Utilities - Helper functions for escort mission AI behavior.
 *
 * Includes convoy ship finding, centroid calculation, and threat detection
 * for defensive wingmen protecting convoy ships.
 */

import { Vector3 } from 'three';
import { areEnemies, type Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vectors to avoid allocations in hot path
const _centroid = new Vector3();
const _returnCentroid = new Vector3();

/** Maximum distance from convoy for defensive wingmen to engage */
const MAX_DEFENSIVE_RANGE = 800;

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
