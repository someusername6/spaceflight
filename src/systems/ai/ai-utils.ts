/**
 * AI Utility Functions - Helper functions used by AI system.
 */

import { type AIControlled, AIState } from '../../components/ai';
import { areEnemies, type Faction } from '../../components/faction';
import { isDead } from '../../components/health';
import type { Transform } from '../../components/transform';
import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/** Count how many AI are currently engaging a specific target */
export function countEngagingTarget(world: World, target: Entity): number {
  let count = 0;
  for (const entity of queryEntities(world, ['aiControlled'])) {
    // Query guarantees this component exists
    const ai = getComponent(world, entity, 'aiControlled')!;
    if (ai.state === AIState.Engage && ai.target === target) {
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
    const ai = getComponent(world, entity, 'aiControlled')!;
    if (ai.target !== player) continue;
    if (ai.state !== AIState.Pursue && ai.state !== AIState.Engage) continue;

    const entityTransform = getComponent(
      world,
      entity,
      'transform',
    ) as Transform;
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

    // Query guarantees transform component exists
    const otherTransform = getComponent(world, other, 'transform')!;
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
