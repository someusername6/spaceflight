/**
 * Camera Entity Discovery
 *
 * Functions for finding and managing followable entities for the camera system.
 */

import { getComponent, queryEntities } from '../../../core/ecs';
import type { Entity, World } from '../../../core/types';
import { Faction } from '../../../core/types';
import type { ReplayCameraState } from './replay-camera';

/**
 * Set the entity list and validate current target.
 * Use this when you have a custom-filtered list of entities.
 */
export function setEntityList(
  state: ReplayCameraState,
  entities: Entity[],
): void {
  state.entityList = entities;

  // Update target entity if needed
  if (state.targetEntity === null && entities.length > 0) {
    state.entityIndex = 0;
    state.targetEntity = entities[0] ?? null;
  } else if (state.targetEntity !== null) {
    // Check if target still exists
    const idx = entities.indexOf(state.targetEntity);
    if (idx === -1) {
      // Target no longer exists, try to maintain similar position
      if (entities.length > 0) {
        state.entityIndex = Math.min(state.entityIndex, entities.length - 1);
        state.targetEntity = entities[state.entityIndex] ?? null;
      } else {
        state.targetEntity = null;
      }
    } else {
      state.entityIndex = idx;
    }
  }
}

/**
 * Find all followable entities in the world (for replay viewing).
 * Players first, then all other ships including enemies.
 */
export function findAllEntities(world: World): Entity[] {
  const entities: Entity[] = [];

  // Find player first
  for (const entity of queryEntities(world, [
    'playerControlled',
    'transform',
  ])) {
    entities.push(entity);
  }

  // Then add other ships (wingmen and enemies)
  for (const entity of queryEntities(world, ['transform', 'shipIdentity'])) {
    if (!entities.includes(entity)) {
      entities.push(entity);
    }
  }

  return entities;
}

/**
 * Find only friendly (player faction) entities for spectator mode.
 * Excludes dead ships.
 */
export function findFriendlyEntities(world: World): Entity[] {
  const entities: Entity[] = [];

  for (const entity of queryEntities(world, [
    'faction',
    'transform',
    'shipIdentity',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;

    // Skip destroyed ships
    const health = getComponent(world, entity, 'health');
    if (!health || health.hull <= 0) continue;

    entities.push(entity);
  }

  // Sort by callsign for consistent order
  entities.sort((a, b) => {
    const identA = getComponent(world, a, 'shipIdentity');
    const identB = getComponent(world, b, 'shipIdentity');
    return (identA?.callsign ?? '').localeCompare(identB?.callsign ?? '');
  });

  return entities;
}

/**
 * Update entity list from world using default discovery (all ships).
 * For custom filtering, use setEntityList() directly.
 */
export function updateEntityList(state: ReplayCameraState, world: World): void {
  setEntityList(state, findAllEntities(world));
}
