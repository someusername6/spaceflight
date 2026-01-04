/**
 * Projectile System - Moves projectiles, checks hits, and despawns expired.
 * Also handles flak projectile explosions when enemies are in range.
 */

import * as THREE from 'three';
import type { Collision } from '../components/collision';
import type { FactionComponent } from '../components/faction';
import { areEnemies } from '../components/faction';
import type { Projectile, ProjectileCategory } from '../components/projectile';
import { isExpired } from '../components/projectile';
import type { Transform } from '../components/transform';
import {
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import { dealDamage } from './damage';
import { spawnShrapnel } from './weapon-spawning';

/** Queue a hit effect via world state (consumed by rendering layer) */
function queueHitEffect(
  world: World,
  position: THREE.Vector3,
  category: ProjectileCategory,
): void {
  world.systemState.projectileHits.pending.push({
    x: position.x,
    y: position.y,
    z: position.z,
    category,
  });
}

// Reusable vector for distance checks
const distanceVec = new THREE.Vector3();

/** Projectile system - movement and collision handling */
export function projectileSystem(world: World, dt: number): void {
  // Collect projectiles to remove (can't modify during iteration)
  const toRemove: Entity[] = [];

  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    // Query guarantees these components exist
    const projectile = getComponent<Projectile>(
      world,
      entity,
      'projectile',
    ) as Projectile;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    // Move projectile
    const distance = projectile.speed * dt;
    transform.position.addScaledVector(projectile.direction, distance);
    projectile.distanceTraveled += distance;

    // Check if expired
    if (isExpired(projectile)) {
      toRemove.push(entity);
      continue;
    }

    // Check for flak explosion (proximity-based shrapnel burst)
    if (projectile.flakRadius !== undefined && projectile.shrapnelCount) {
      const projectileFaction = getComponent<FactionComponent>(
        world,
        entity,
        'faction',
      );

      // Check all potential targets for proximity
      let shouldExplode = false;
      for (const target of queryEntities(world, ['health', 'transform'])) {
        // Skip self and projectiles
        if (target === entity || hasComponent(world, target, 'projectile'))
          continue;
        // Skip owner
        if (target === projectile.owner) continue;

        // Check faction - flak only triggers on enemies (but shrapnel damages all)
        const targetFaction = getComponent<FactionComponent>(
          world,
          target,
          'faction',
        );
        if (projectileFaction && targetFaction) {
          if (!areEnemies(projectileFaction.faction, targetFaction.faction)) {
            continue;
          }
        }

        // Check distance
        const targetTransform = getComponent<Transform>(
          world,
          target,
          'transform',
        );
        if (targetTransform) {
          distanceVec.copy(targetTransform.position).sub(transform.position);
          const distance = distanceVec.length();

          if (distance <= projectile.flakRadius) {
            shouldExplode = true;
            break;
          }
        }
      }

      if (shouldExplode) {
        // Spawn shrapnel in all directions
        spawnShrapnel(
          world,
          transform.position,
          projectile.shrapnelCount,
          projectile.owner,
          projectileFaction,
        );

        // Queue hit effect for the explosion
        queueHitEffect(world, transform.position, 'ballistic');

        // Remove the flak projectile
        toRemove.push(entity);
        continue;
      }
    }

    // Check for collisions with ships (non-projectile entities)
    const collision = getComponent<Collision>(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      for (const other of collision.collidedWith) {
        // Skip collision with owner
        if (other === projectile.owner) continue;

        // Skip collision with other projectiles
        if (hasComponent(world, other, 'projectile')) continue;

        // Skip collision with missiles (need dedicated point-defense logic)
        if (hasComponent(world, other, 'missile')) continue;

        // Friendly fire enabled - damage anyone except owner

        // Deal damage at projectile's current position
        const result = dealDamage(
          world,
          other,
          projectile.damage,
          transform.position,
        );

        // Track damage stats by weapon
        if (world.systemState.combatStats) {
          const stats = world.systemState.combatStats;
          const totalDamage = result.shieldDamage + result.hullDamage;
          stats.damageDealt[projectile.weaponName] =
            (stats.damageDealt[projectile.weaponName] || 0) + totalDamage;
        }

        // Queue hit effect only if hull took damage (shields-only = no sparks)
        if (result.hullDamage > 0) {
          queueHitEffect(world, transform.position, projectile.category);
        }

        // Projectile is consumed
        toRemove.push(entity);
        break;
      }
    }
  }

  // Remove expired/hit projectiles
  for (const entity of toRemove) {
    removeEntity(world, entity);
  }
}
