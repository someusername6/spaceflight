/**
 * Missile AoE utilities - Area-of-effect damage and detection helpers.
 *
 * Extracted from missiles.ts to stay under 400 line limit.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../components/faction';
import { areEnemies } from '../components/faction';
import type { Health } from '../components/health';
import type { Projectile } from '../components/projectile';
import type { Transform } from '../components/transform';
import {
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { dealDamage } from './damage';
import { recordDamage } from './stats';

// Reusable vector for AoE distance calculation
const aoeTempVec = new THREE.Vector3();

/** Deal AoE damage to all entities within radius (including missiles and projectiles) */
export function dealAoeDamage(
  world: World,
  center: THREE.Vector3,
  radius: number,
  maxDamage: number,
  owner: Entity,
  exclude: Entity,
  weaponName?: string,
): void {
  // Find all entities with health and transform within radius
  for (const entity of queryEntities(world, ['transform', 'health'])) {
    if (entity === owner || entity === exclude) continue;
    // Note: missiles AND projectiles CAN be damaged by AoE (e.g., nuke clearing the area)

    // Query guarantees these components exist
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const health = getComponent<Health>(world, entity, 'health') as Health;

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
        const result = dealDamage(world, entity, damage, center);
        // Track AoE damage to ships (attribute to weapon that caused it)
        if (weaponName) {
          const totalDamage = result.shieldDamage + result.hullDamage;
          recordDamage(
            world,
            owner,
            entity,
            weaponName,
            'missile',
            totalDamage,
          );
        }
      }
    }
  }
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
    const entityFaction = getComponent<FactionComponent>(
      world,
      entity,
      'faction',
    );
    if (missileFaction && entityFaction) {
      if (!areEnemies(missileFaction.faction, entityFaction.faction)) {
        continue;
      }
    }

    // Query guarantees transform component exists
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    const health = getComponent<Health>(world, entity, 'health') as Health;

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
    const projectile = getComponent<Projectile>(
      world,
      entity,
      'projectile',
    ) as Projectile;
    // Don't destroy owner's projectiles
    if (projectile.owner === owner) continue;

    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

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
