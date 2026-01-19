/**
 * Missile AoE utilities - Area-of-effect damage and detection helpers.
 *
 * Extracted from missiles.ts to stay under 400 line limit.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../../components/faction';
import { areEnemies } from '../../components/faction';
import {
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { dealDamage } from '../damage';
import { recordDamage, recordMissileHit } from '../stats';

// Reusable vector for AoE distance calculation
const aoeTempVec = new THREE.Vector3();

/** Result of AoE damage for stats tracking */
export interface AoeDamageResult {
  /** Total damage dealt to all entities */
  totalDamage: number;
  /** Whether the specified target (if any) was damaged */
  hitTarget: boolean;
}

/**
 * Record AoE missile stats for debrief and balance analysis.
 * Call this after dealAoeDamage to track hits and damage.
 */
export function recordAoeMissileStats(
  world: World,
  owner: Entity,
  missileName: string,
  aoeResult: AoeDamageResult,
): void {
  // Track per-ship stats: count as hit if locked target was damaged
  if (aoeResult.hitTarget) {
    recordMissileHit(world, owner, missileName);
  }

  // Track aggregate stats (for balance analysis)
  if (world.systemState.combatStats) {
    const stats = world.systemState.combatStats;
    if (aoeResult.hitTarget) {
      stats.missilesHit[missileName] =
        (stats.missilesHit[missileName] || 0) + 1;
    }
    stats.missileDamage[missileName] =
      (stats.missileDamage[missileName] || 0) + aoeResult.totalDamage;
  }
}

/** Damage category for stats attribution */
export type AoeDamageCategory = 'projectile' | 'beam' | 'missile';

/** Deal AoE damage to all entities within radius (including missiles and projectiles) */
export function dealAoeDamage(
  world: World,
  center: THREE.Vector3,
  radius: number,
  maxDamage: number,
  owner: Entity,
  exclude: Entity,
  weaponName?: string,
  /** Optional target entity to check if hit (for stats tracking) */
  target?: Entity,
  /** Damage category for stats attribution (default: 'missile') */
  category: AoeDamageCategory = 'missile',
): AoeDamageResult {
  let totalDamage = 0;
  let hitTarget = false;

  // Find all entities with health and transform within radius
  for (const entity of queryEntities(world, ['transform', 'health'])) {
    if (entity === owner || entity === exclude) continue;
    // Note: missiles AND projectiles CAN be damaged by AoE (e.g., nuke clearing the area)

    const transform = getComponent(world, entity, 'transform');
    const health = getComponent(world, entity, 'health');
    if (!transform || !health) continue;

    // Skip dead entities
    if (health.hull <= 0) continue;

    // Calculate distance
    aoeTempVec.copy(transform.position).sub(center);
    const distance = aoeTempVec.length();

    if (distance <= radius) {
      // Linear falloff: full damage at center, zero at edge
      const falloff = 1 - distance / radius;
      const damage = maxDamage * falloff;
      if (damage > 0) {
        const result = dealDamage(world, entity, damage, center, 1, 1, owner);
        const entityDamage = result.shieldDamage + result.hullDamage;
        totalDamage += entityDamage;

        // Track if we hit the specified target
        if (entity === target && entityDamage > 0) {
          hitTarget = true;
        }

        // Track AoE damage to ships (attribute to weapon that caused it)
        if (weaponName) {
          recordDamage(
            world,
            owner,
            entity,
            weaponName,
            category,
            entityDamage,
          );
        }
      }
    }
  }

  return { totalDamage, hitTarget };
}

/**
 * Options for finding closest enemy distance
 */
export interface ClosestEnemyOptions {
  /** Include enemy missiles in search (default: false) */
  includeMissiles?: boolean;
}

/**
 * Find the closest distance to any enemy entity.
 * Used for AoE proximity detonation (flak, nuke).
 * @returns Closest distance to an enemy, or Infinity if none found
 */
export function findClosestEnemyDistance(
  world: World,
  center: THREE.Vector3,
  owner: Entity,
  ownerFaction: FactionComponent | undefined,
  options: ClosestEnemyOptions = {},
): number {
  let closestDistance = Infinity;

  // Check entities with health (ships, structures, etc.)
  // Missiles are handled separately in the second loop if includeMissiles is true
  for (const entity of queryEntities(world, ['transform', 'health'])) {
    if (entity === owner) continue;
    if (hasComponent(world, entity, 'projectile')) continue;
    if (hasComponent(world, entity, 'missile')) continue; // Always skip, handled below

    // Check faction - only consider enemies (non-faction entities cannot trigger detonation)
    const entityFaction = getComponent(world, entity, 'faction');
    if (!ownerFaction || !entityFaction) continue;
    if (!areEnemies(ownerFaction.faction, entityFaction.faction)) continue;

    const transform = getComponent(world, entity, 'transform');
    const health = getComponent(world, entity, 'health');
    if (!transform || !health) continue;

    // Skip dead entities
    if (health.hull <= 0) continue;

    aoeTempVec.copy(transform.position).sub(center);
    const distance = aoeTempVec.length();

    if (distance < closestDistance) {
      closestDistance = distance;
    }
  }

  // Additionally check missiles if requested (for flak point-defense)
  if (options.includeMissiles) {
    for (const entity of queryEntities(world, ['missile', 'transform'])) {
      if (entity === owner) continue;

      // Check faction - only consider enemy missiles (non-faction cannot trigger)
      const entityFaction = getComponent(world, entity, 'faction');
      if (!ownerFaction || !entityFaction) continue;
      if (!areEnemies(ownerFaction.faction, entityFaction.faction)) continue;

      const transform = getComponent(world, entity, 'transform');
      if (!transform) continue;

      aoeTempVec.copy(transform.position).sub(center);
      const distance = aoeTempVec.length();

      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }
  }

  return closestDistance;
}

/** Check if any enemies are within range (for smart nuke detonation) */
export function checkForEnemiesInRange(
  world: World,
  center: THREE.Vector3,
  radius: number,
  owner: Entity,
  missileFaction: FactionComponent | undefined,
): boolean {
  for (const entity of queryEntities(world, ['transform', 'health'])) {
    if (entity === owner) continue;
    if (hasComponent(world, entity, 'projectile')) continue;
    if (hasComponent(world, entity, 'missile')) continue;

    // Check faction - only count enemies
    const entityFaction = getComponent(world, entity, 'faction');
    if (missileFaction && entityFaction) {
      if (!areEnemies(missileFaction.faction, entityFaction.faction)) {
        continue;
      }
    }

    const transform = getComponent(world, entity, 'transform');
    const health = getComponent(world, entity, 'health');
    if (!transform || !health) continue;

    // Skip dead entities
    if (health.hull <= 0) continue;

    // Calculate distance
    aoeTempVec.copy(transform.position).sub(center);
    const distance = aoeTempVec.length();

    if (distance <= radius) {
      return true;
    }
  }
  return false;
}

/** Destroy all projectiles within radius (for nuke AoE) */
export function destroyProjectilesInRadius(
  world: World,
  center: THREE.Vector3,
  radius: number,
  owner: Entity,
): void {
  const toDestroy: Entity[] = [];

  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    const projectile = getComponent(world, entity, 'projectile');
    if (!projectile) continue;
    // Don't destroy owner's projectiles
    if (projectile.owner === owner) continue;

    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;

    aoeTempVec.copy(transform.position).sub(center);
    const distance = aoeTempVec.length();

    if (distance <= radius) {
      toDestroy.push(entity);
    }
  }

  for (const entity of toDestroy) {
    removeEntity(world, entity);
  }
}
