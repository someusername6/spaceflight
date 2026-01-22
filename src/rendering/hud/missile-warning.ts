/**
 * Missile Warning System - Detects missile threats targeting the player.
 *
 * Tracks three threat states:
 * 1. Being locked - An enemy is acquiring missile lock on player
 * 2. Lock achieved - An enemy has full missile lock (about to fire)
 * 3. Missiles incoming - Active missiles are tracking the player
 */

import { getComponent, queryEntities } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

/** Missile threat state */
export interface MissileThreatState {
  /** Number of missiles currently targeting the player */
  incomingCount: number;
  /** True if any enemy has achieved full lock on player */
  hasEnemyLock: boolean;
  /** Highest lock progress of enemies targeting player (0-1) */
  maxEnemyLockProgress: number;
}

/** Empty threat state (no threats) */
const NO_THREAT: MissileThreatState = {
  incomingCount: 0,
  hasEnemyLock: false,
  maxEnemyLockProgress: 0,
};

/**
 * Get current missile threat state for the player.
 * Returns information about incoming missiles and enemies locking onto player.
 */
export function getMissileThreatState(
  world: World,
  player: Entity,
): MissileThreatState {
  let incomingCount = 0;
  let hasEnemyLock = false;
  let maxEnemyLockProgress = 0;

  // Count missiles targeting the player
  for (const missileEntity of queryEntities(world, ['missile'])) {
    const missile = getComponent(world, missileEntity, 'missile');
    if (missile?.target === player) {
      incomingCount++;
    }
  }

  // Check for enemies locking onto the player
  for (const entity of queryEntities(world, [
    'secondaryWeapons',
    'aiControlled',
  ])) {
    const weapons = getComponent(world, entity, 'secondaryWeapons');
    if (!weapons) continue;

    // Check if this enemy is targeting the player
    if (weapons.lockTarget === player && weapons.lockProgress > 0) {
      maxEnemyLockProgress = Math.max(
        maxEnemyLockProgress,
        weapons.lockProgress,
      );
      if (weapons.lockProgress >= 1) {
        hasEnemyLock = true;
      }
    }
  }

  // Return cached object if no threats (avoid allocation)
  if (incomingCount === 0 && maxEnemyLockProgress === 0) {
    return NO_THREAT;
  }

  return {
    incomingCount,
    hasEnemyLock,
    maxEnemyLockProgress,
  };
}

/**
 * Get list of missile entities targeting the player.
 * Used by radar and reticle systems for visual indicators.
 */
export function getMissilesTargetingPlayer(
  world: World,
  player: Entity,
): Entity[] {
  const missiles: Entity[] = [];

  for (const missileEntity of queryEntities(world, ['missile'])) {
    const missile = getComponent(world, missileEntity, 'missile');
    if (missile?.target === player) {
      missiles.push(missileEntity);
    }
  }

  return missiles;
}
