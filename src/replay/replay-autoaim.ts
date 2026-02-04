/**
 * Replay Autoaim - Set per-entity autoaim from replay data.
 */

import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

/**
 * Set autoaimBonus on all playerControlled entities from a single autoaim value.
 * Used for single-player replays and as fallback for old multiplayer replays.
 */
export function setReplayAutoaimOnPlayers(
  world: World,
  autoaimDegrees: number,
): void {
  for (const entity of queryEntities(world, ['playerControlled'])) {
    const player = getComponent(world, entity, 'playerControlled');
    if (player) {
      player.autoaimBonus = autoaimDegrees;
    }
  }
}

/**
 * Set autoaimBonus on a specific playerControlled entity by campaign ship ID.
 * Used for multiplayer replays with per-player autoaim.
 */
export function setReplayAutoaimByShipId(
  world: World,
  campaignShipId: string,
  autoaimDegrees: number,
): void {
  for (const entity of queryEntities(world, [
    'playerControlled',
    'shipIdentity',
  ])) {
    const identity = getComponent(world, entity, 'shipIdentity');
    if (identity?.campaignShipId === campaignShipId) {
      const player = getComponent(world, entity, 'playerControlled');
      if (player) {
        player.autoaimBonus = autoaimDegrees;
      }
      return;
    }
  }
}
