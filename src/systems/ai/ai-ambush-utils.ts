/**
 * AI Ambush Mission Utilities - Helper functions for convoy-interceptor behavior.
 *
 * Used by player wingmen in ambush missions to:
 * - Prioritize killing enemy escorts
 * - Approach and stop neutral convoy ships
 */

import { Vector3 } from 'three';
import { areEnemies, Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vector for enemy convoy centroid
const _enemyConvoyCentroid = new Vector3();
const _returnCentroid = new Vector3();

/**
 * Find nearest enemy escort (non-convoy enemy ship) for convoy-interceptor behavior.
 * Used by player wingmen in ambush missions to prioritize killing escorts.
 */
export function findNearestEnemyEscort(
  world: World,
  self: Entity,
  selfFaction: Faction,
): Entity | null {
  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const other of queryEntities(world, [
    'aiControlled',
    'transform',
    'faction',
    'health',
    'shipIdentity',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    if (!otherFaction || !areEnemies(selfFaction, otherFaction.faction))
      continue;

    // Skip convoy ships - we want escorts only
    // (Convoy ships are also Enemy faction in ambush missions, so this filters them out)
    const convoyShip = getComponent(world, other, 'convoyShip');
    if (convoyShip) continue;

    const health = getComponent(world, other, 'health');
    if (health && isDead(health)) continue;

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
 * Find nearest target convoy ship for convoy-interceptor behavior.
 * Used by player wingmen in ambush missions to approach and stop convoy.
 * In ambush missions, convoy ships are Enemy faction (enables weapon targeting).
 */
export function findNearestEnemyConvoyShip(
  world: World,
  self: Entity,
): Entity | null {
  const selfTransform = getComponent(world, self, 'transform');
  if (!selfTransform) return null;

  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const other of queryEntities(world, [
    'convoyShip',
    'transform',
    'faction',
    'health',
  ])) {
    const otherFaction = getComponent(world, other, 'faction');
    // In ambush missions, convoy ships are Enemy faction (enables weapon targeting)
    if (!otherFaction || otherFaction.faction !== Faction.Enemy) continue;

    const health = getComponent(world, other, 'health');
    if (health && isDead(health)) continue;

    // Skip already-stopped convoy ships
    const convoyShip = getComponent(world, other, 'convoyShip');
    if (!convoyShip || convoyShip.isStopped) continue;

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
 * Get the centroid position of all living, non-stopped target convoy ships.
 * Used by convoy-interceptor wingmen to navigate toward convoy.
 * In ambush missions, convoy ships are Enemy faction (enables weapon targeting).
 */
export function getEnemyConvoyCentroid(world: World): Vector3 | null {
  let count = 0;
  _enemyConvoyCentroid.set(0, 0, 0);

  for (const entity of queryEntities(world, [
    'convoyShip',
    'transform',
    'faction',
    'health',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    // In ambush missions, convoy ships are Enemy faction (enables weapon targeting)
    if (!faction || faction.faction !== Faction.Enemy) continue;

    const health = getComponent(world, entity, 'health');
    if (health && isDead(health)) continue;

    // Skip already-stopped convoy ships
    const convoyShip = getComponent(world, entity, 'convoyShip');
    if (!convoyShip || convoyShip.isStopped) continue;

    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;
    _enemyConvoyCentroid.add(transform.position);
    count++;
  }

  if (count === 0) return null;

  _enemyConvoyCentroid.divideScalar(count);
  return _returnCentroid.copy(_enemyConvoyCentroid);
}
