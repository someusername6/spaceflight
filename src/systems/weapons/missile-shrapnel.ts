/**
 * Shrapnel detonation logic for missiles with shrapnel warheads.
 *
 * Handles proximity detonation of shrapnel-type missiles (e.g., Starburst).
 * When a shrapnel missile detects it has passed closest approach to an enemy,
 * it detonates and spawns shrapnel projectiles.
 */

import type * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import type { Missile } from '../../components/missile';
import type { World } from '../../core/types';
import { recordMissileHit } from '../stats';
import {
  capitalizeMissileType,
  spawnMissileExplosion,
} from './missile-helpers';
import { spawnShrapnel } from './shrapnel';

/**
 * Handle shrapnel detonation for a missile that has reached closest approach.
 * Spawns shrapnel projectiles and records stats.
 *
 * @param world - ECS world
 * @param position - Missile's position at detonation
 * @param missile - Missile component data
 * @param missileFaction - Faction of the missile entity
 */
export function handleShrapnelDetonation(
  world: World,
  position: THREE.Vector3,
  missile: Missile,
  missileFaction: FactionComponent | undefined,
): void {
  const missileName = capitalizeMissileType(missile.missileType);
  const count = missile.shrapnelCount ?? 0;
  spawnShrapnel(
    world,
    position,
    count,
    missile.owner,
    missileFaction,
    missileName,
    {
      damage: missile.shrapnelDamage,
      speed: missile.shrapnelSpeed,
      range: missile.shrapnelRange,
    },
  );

  // Record proximity detonation as a hit (missile achieved its purpose)
  recordMissileHit(world, missile.owner, missileName);

  // Track aggregate stats (for balance analysis)
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    stats.missilesHit[missileName] = (stats.missilesHit[missileName] || 0) + 1;
    stats.shrapnelSpawned = (stats.shrapnelSpawned || 0) + count;
  }

  spawnMissileExplosion(world, position, false);
}
