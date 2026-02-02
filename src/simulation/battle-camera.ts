/**
 * Battle Camera Controller - Manages camera following for AI battles.
 *
 * Automatically switches between combatants for dynamic viewing.
 */

import { Faction } from '../components/faction';
import { isDead } from '../components/health';
import { getComponent, isShip, queryEntities } from '../core/ecs';
import { createPRNG, type PRNGState, random, randomInt } from '../core/prng';
import type { Entity, World } from '../core/types';

/** Camera controller state */
export interface BattleCamera {
  /** Currently followed entity */
  followedEntity: Entity | null;
  /** Time since last camera switch */
  timeSinceSwitch: number;
  /** Minimum time between automatic switches */
  switchInterval: number;
  /** PRNG for camera switching (ephemeral, intentionally non-deterministic) */
  rng: PRNGState;
}

/** Create a new battle camera controller */
export function createBattleCamera(switchInterval = 8): BattleCamera {
  return {
    followedEntity: null,
    timeSinceSwitch: 0,
    switchInterval,
    // Ephemeral PRNG for camera switching - variation is intentional
    rng: createPRNG(Date.now() ^ (performance.now() * 1000)),
  };
}

/** Get all living ships from a specific faction */
function getLivingShips(world: World, faction: Faction): Entity[] {
  const ships: Entity[] = [];
  for (const entity of queryEntities(world, ['faction', 'health'])) {
    if (!isShip(world, entity)) continue;

    const factionComp = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');

    if (factionComp?.faction === faction && health && !isDead(health)) {
      ships.push(entity);
    }
  }
  return ships;
}

/** Get all living ships regardless of faction */
function getAllLivingShips(world: World): Entity[] {
  const ships: Entity[] = [];
  for (const entity of queryEntities(world, ['health'])) {
    if (!isShip(world, entity)) continue;

    const health = getComponent(world, entity, 'health');
    if (health && !isDead(health)) {
      ships.push(entity);
    }
  }
  return ships;
}

/** Check if the currently followed entity is still valid */
function isFollowedEntityValid(camera: BattleCamera, world: World): boolean {
  if (camera.followedEntity === null) return false;

  const health = getComponent(world, camera.followedEntity, 'health');
  return health !== undefined && !isDead(health);
}

/**
 * Update camera following logic.
 * Returns the entity to follow (or null if none available).
 */
export function updateBattleCamera(
  camera: BattleCamera,
  world: World,
  dt: number,
): Entity | null {
  camera.timeSinceSwitch += dt;

  // Check if we need to switch
  const needsSwitch =
    !isFollowedEntityValid(camera, world) ||
    camera.timeSinceSwitch >= camera.switchInterval;

  if (needsSwitch) {
    // Alternate between factions for variety
    const shouldFollowTeamA = random(camera.rng) < 0.5;
    const preferredFaction = shouldFollowTeamA ? Faction.Player : Faction.Enemy;

    let candidates = getLivingShips(world, preferredFaction);
    if (candidates.length === 0) {
      // Fall back to any living ship
      candidates = getAllLivingShips(world);
    }

    if (candidates.length > 0) {
      // Pick random ship, avoiding current if possible
      let newTarget: Entity;
      if (candidates.length > 1 && camera.followedEntity !== null) {
        const filtered = candidates.filter((e) => e !== camera.followedEntity);
        const idx = randomInt(camera.rng, 0, filtered.length - 1);
        newTarget = filtered[idx] as Entity;
      } else {
        const idx = randomInt(camera.rng, 0, candidates.length - 1);
        newTarget = candidates[idx] as Entity;
      }

      camera.followedEntity = newTarget;
      camera.timeSinceSwitch = 0;
    }
  }

  return camera.followedEntity;
}
