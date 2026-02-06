/**
 * Projectile System - Moves projectiles, checks hits, and despawns expired.
 * Also handles flak projectile explosions when enemies are in range.
 */

import * as THREE from 'three';
import type { ProjectileCategory } from '../../components/projectile';
import { isExpired } from '../../components/projectile';
import { ionizeShields } from '../../components/shields';
import {
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { dealDamage } from '../damage';
import { recordDamage, recordShotHit, recordShrapnelHit } from '../stats';
import { findClosestEnemyDistance } from './missile-aoe';
import { spawnShrapnel } from './shrapnel';

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
    gameTime: world.systemState.gameTime,
  });
}

// Reusable vectors
const toTarget = new THREE.Vector3();
const desiredDirection = new THREE.Vector3();

// Reusable removal list (hoisted to avoid per-frame allocation)
const toRemove: Entity[] = [];

/** Projectile system - movement and collision handling */
export function projectileSystem(world: World, dt: number): void {
  // Reset reusable removal list
  toRemove.length = 0;

  for (const entity of queryEntities(world, ['projectile', 'transform'])) {
    const projectile = getComponent(world, entity, 'projectile');
    const transform = getComponent(world, entity, 'transform');
    if (!projectile || !transform) continue;

    // === Gyrojet-style acceleration ===
    if (
      projectile.acceleration !== undefined &&
      projectile.maxSpeed !== undefined
    ) {
      // Accelerate toward max speed
      projectile.speed = Math.min(
        projectile.speed + projectile.acceleration * dt,
        projectile.maxSpeed,
      );
    }

    // === Speed-based damage scaling ===
    if (
      projectile.speedDamageScale &&
      projectile.baseDamage !== undefined &&
      projectile.maxSpeed !== undefined
    ) {
      const speedRatio = projectile.speed / projectile.maxSpeed;
      projectile.damage = projectile.baseDamage * speedRatio;
    }

    // === Gentle in-flight tracking (Gyrojet-style) ===
    if (
      projectile.trackingRate !== undefined &&
      projectile.trackingCone !== undefined &&
      projectile.trackingTarget !== undefined
    ) {
      // Check if target still exists
      if (!entityExists(world, projectile.trackingTarget)) {
        // Target died - stop tracking
        projectile.trackingTarget = undefined;
      } else {
        const targetTransform = getComponent(
          world,
          projectile.trackingTarget,
          'transform',
        );
        if (targetTransform) {
          // Calculate direction to target
          toTarget
            .copy(targetTransform.position)
            .sub(transform.position)
            .normalize();

          // Check if target is within tracking cone
          const dot = projectile.direction.dot(toTarget);
          const angleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
          const angleDeg = angleRad * (180 / Math.PI);

          if (angleDeg <= projectile.trackingCone) {
            // Target is within cone - apply gentle tracking
            const maxTurnRad = ((projectile.trackingRate * Math.PI) / 180) * dt;

            // Interpolate direction toward target
            if (angleRad > 0.001) {
              // How much we can turn this frame
              const turnAmount = Math.min(maxTurnRad / angleRad, 1);
              desiredDirection.lerpVectors(
                projectile.direction,
                toTarget,
                turnAmount,
              );
              projectile.direction.copy(desiredDirection).normalize();
            }
          }
        }
      }
    }

    // Move projectile
    const distance = projectile.speed * dt;
    transform.position.addScaledVector(projectile.direction, distance);
    projectile.distanceTraveled += distance;

    // Check if expired
    if (isExpired(projectile)) {
      toRemove.push(entity);
      continue;
    }

    // Check for flak explosion (closest-approach detonation)
    // Detonates when: A. within flak radius, and B. distance starts increasing (past closest point)
    if (projectile.flakRadius !== undefined && projectile.shrapnelCount) {
      const projectileFaction = getComponent(world, entity, 'faction');

      // Find closest enemy distance (includes missiles for point-defense)
      const closestDistance = findClosestEnemyDistance(
        world,
        transform.position,
        projectile.owner,
        projectileFaction,
        { includeMissiles: true },
      );

      const previousDistance = projectile.previousClosestEnemyDistance;
      const withinRadius = closestDistance < projectile.flakRadius;
      const wasWithinRadius =
        previousDistance !== undefined &&
        previousDistance < projectile.flakRadius;
      const distanceIncreasing =
        previousDistance !== undefined && closestDistance > previousDistance;

      // Detonate if we're past closest approach (distance increasing while within radius)
      if (withinRadius && wasWithinRadius && distanceIncreasing) {
        // Spawn shrapnel in all directions, attributed to parent weapon
        spawnShrapnel(
          world,
          transform.position,
          projectile.shrapnelCount,
          projectile.owner,
          projectileFaction,
          projectile.weaponName,
          {
            damage: projectile.shrapnelDamage,
            speed: projectile.shrapnelSpeed,
            range: projectile.shrapnelRange,
          },
        );

        // Queue hit effect for the explosion
        queueHitEffect(world, transform.position, 'ballistic');

        // Remove the flak projectile
        toRemove.push(entity);
        continue;
      }

      // Store current distance for next frame comparison
      projectile.previousClosestEnemyDistance = closestDistance;
    }

    // Check for collisions with ships (non-projectile entities)
    const collision = getComponent(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      for (const other of collision.collidedWith) {
        // Skip entities that no longer exist (stale collision data)
        if (!entityExists(world, other)) continue;

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
          projectile.shieldDamageMultiplier ?? 1,
          1, // hullDamageMultiplier
          projectile.owner,
        );

        // Apply ionization effect if projectile has ionize flag
        if (projectile.ionize) {
          const targetShields = getComponent(world, other, 'shields');
          if (targetShields) {
            ionizeShields(targetShields, world.systemState.gameTime);
          }
        }

        // Track per-ship damage stats
        const totalDamage = result.shieldDamage + result.hullDamage;
        recordDamage(
          world,
          projectile.owner,
          other,
          projectile.weaponName,
          'projectile',
          totalDamage,
        );

        // Track per-ship hits: shrapnel vs regular projectiles
        if (projectile.isShrapnel) {
          recordShrapnelHit(world, projectile.owner, projectile.weaponName);
        } else {
          recordShotHit(world, projectile.owner, projectile.weaponName);
        }

        // Track aggregate stats by weapon (for balance analysis)
        if (world.systemState.combatStats) {
          const stats = world.systemState.combatStats;
          stats.damageDealt[projectile.weaponName] =
            (stats.damageDealt[projectile.weaponName] || 0) + totalDamage;
          // Track hits separately: shrapnel vs regular projectiles
          if (projectile.isShrapnel) {
            stats.shrapnelHit[projectile.weaponName] =
              (stats.shrapnelHit[projectile.weaponName] || 0) + 1;
          } else {
            stats.shotsHit[projectile.weaponName] =
              (stats.shotsHit[projectile.weaponName] || 0) + 1;
          }
        }

        // Queue hit effect only if hull took damage (shields-only = no sparks)
        if (result.hullDamage > 0) {
          queueHitEffect(world, transform.position, projectile.category);
        }

        // If flak projectile, spawn shrapnel on direct impact
        if (projectile.flakRadius !== undefined && projectile.shrapnelCount) {
          const projectileFaction = getComponent(world, entity, 'faction');
          spawnShrapnel(
            world,
            transform.position,
            projectile.shrapnelCount,
            projectile.owner,
            projectileFaction,
            projectile.weaponName,
            {
              damage: projectile.shrapnelDamage,
              speed: projectile.shrapnelSpeed,
              range: projectile.shrapnelRange,
            },
          );
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
