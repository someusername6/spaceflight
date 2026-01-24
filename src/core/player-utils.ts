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
 * Find the first player-controlled entity (primary/local player).
 * In single-player, this is the only player.
 * In multiplayer, this will be the local player.
 *
 * @returns Entity or null if no player exists
 */
export function findLocalPlayer(world: World): Entity | null {
  for (const entity of world.entities) {
    if (hasComponents(world, entity, ['playerControlled', 'transform'])) {
      return entity;
    }
  }
  return null;
}

/**
 * Find all player-controlled entities.
 * In single-player, returns array with one element.
 * In multiplayer, returns all player-controlled ships.
 *
 * @returns Array of player entities (may be empty)
 */
export function findAllPlayers(world: World): Entity[] {
  const players: Entity[] = [];
  for (const entity of world.entities) {
    if (hasComponents(world, entity, ['playerControlled', 'transform'])) {
      players.push(entity);
    }
  }
  return players;
}

/**
 * Check if an entity is player-controlled.
 */
export function isPlayerControlled(world: World, entity: Entity): boolean {
  return getComponent(world, entity, 'playerControlled') !== undefined;
}

/**
 * Get the player entity by their network/local ID.
 * Placeholder for multiplayer - in single-player, always returns the local player.
 *
 * @param playerId - Network player ID (unused in single-player)
 */
export function getPlayerById(world: World, _playerId: string): Entity | null {
  // In single-player, there's only one player
  // In multiplayer, this will look up by the ID stored in a component
  return findLocalPlayer(world);
}

/**
 * Get the count of player-controlled entities.
 * Useful for UI that needs to know if playing solo vs coop.
 */
export function getPlayerCount(world: World): number {
  let count = 0;
  for (const entity of world.entities) {
    if (hasComponents(world, entity, ['playerControlled'])) {
      count++;
    }
  }
  return count;
}
