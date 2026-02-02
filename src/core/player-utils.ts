/**
 * Player Utilities - Helper functions for finding and working with player entities.
 *
 * In single-player, there's one player entity. In multiplayer, there may be multiple
 * player-controlled entities (host + guests controlling wingmen).
 *
 * This module centralizes player lookups to make the multiplayer transition easier.
 */

import { getComponent, hasComponents } from './ecs';
import type { Entity, World } from './types';

/**
 * Find the local player entity.
 * In single-player, this is the only player-controlled entity.
 * In multiplayer, this finds the entity with isLocalPlayer=true.
 *
 * @returns Entity or null if no player exists
 */
export function findLocalPlayer(world: World): Entity | null {
  // First, look for an entity explicitly marked as local player (multiplayer)
  for (const entity of world.entities) {
    if (!hasComponents(world, entity, ['playerControlled', 'transform'])) {
      continue;
    }
    const pc = getComponent(world, entity, 'playerControlled');
    if (pc?.isLocalPlayer) {
      return entity;
    }
  }
  // Fallback: return first player-controlled entity (single-player compatibility)
  for (const entity of world.entities) {
    if (hasComponents(world, entity, ['playerControlled', 'transform'])) {
      return entity;
    }
  }
  return null;
}
