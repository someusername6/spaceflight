/** Missile System - Handles missile tracking, movement, and hits. */

import * as THREE from 'three';
import { DECOY_SEDUCE_CHANCE } from '../../components/decoy';
import { isMissileExpired } from '../../components/missile';
import {
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../../core/ecs';
import { random } from '../../core/prng';
import { type Entity, NO_ENTITY, type World } from '../../core/types';
import { dealDamage } from '../damage';
import { recordDamage, recordMissileHit, recordMissileSeduced } from '../stats';
import {
  checkForEnemiesInRange,
  dealAoeDamage,
  destroyProjectilesInRadius,
  findClosestEnemyDistance,
  recordAoeMissileStats,
} from './missile-aoe';
import {
  capitalizeMissileType,
  findNearestDecoy,
  shouldDetonateAtClosestApproach,
  spawnMissileExplosion,
  trackTarget,
} from './missile-helpers';
import { spawnShrapnel } from './shrapnel';

// Safe distance before missile can collide with owner (avoids spawn-inside-hitbox issues)
// Set high enough that missiles never hit their owner in normal combat scenarios
// (torpedoes at 200 m/s with 382m turn radius need significant buffer)
const MISSILE_OWNER_SAFE_DISTANCE = 100;

// Reusable vectors and quaternions (avoid per-frame allocations)
const tempForward = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

/** Missile system - tracking and collision handling */
export function missileSystem(world: World, dt: number): void {
  const toRemove: Entity[] = [];

  for (const entity of queryEntities(world, ['missile', 'transform'])) {
    // Query guarantees these components exist
    const missile = getComponent(world, entity, 'missile')!;
    const transform = getComponent(world, entity, 'transform')!;

    // Check for decoy seduction (any missile with turnRate can be seduced)
    if (
      missile.turnRate > 0 &&
      !hasComponent(world, missile.target ?? -1, 'decoy')
    ) {
      const nearestDecoy = findNearestDecoy(world, transform.position);
      if (nearestDecoy && !missile.resistedDecoys.has(nearestDecoy)) {
        // Seduction chance check - only roll once per (missile, decoy) pair
        if (random(world.prng) < DECOY_SEDUCE_CHANCE) {
          // Get decoy owner for stat tracking
          const decoy = getComponent(world, nearestDecoy, 'decoy');
          const decoyOwner = decoy?.owner;

          missile.target = nearestDecoy;

          // Track per-ship seduction stats
          const missileName = capitalizeMissileType(missile.missileType);
          if (decoyOwner !== undefined) {
            recordMissileSeduced(world, missile.owner, missileName, decoyOwner);
          }

          // Track aggregate seduction stats
          if (world.systemState.combatStats) {
            world.systemState.combatStats.missilesSeduced++;
            world.systemState.combatStats.decoysSuccessful++;
          }
        } else {
          // Missile resisted this decoy - don't re-roll
          missile.resistedDecoys.add(nearestDecoy);
        }
      }
    }

    // Update tracking if we have a target
    if (missile.target !== undefined && missile.turnRate > 0) {
      if (entityExists(world, missile.target)) {
        const targetTransform = getComponent(
          world,
          missile.target,
          'transform',
        );
        if (targetTransform) {
          trackTarget(missile, transform, targetTransform, dt);
        }
      } else {
        // Target destroyed - continue straight
        missile.target = undefined;
      }
    }

    // Move missile
    const distance = missile.speed * dt;
    transform.position.addScaledVector(missile.direction, distance);
    missile.distanceTraveled += distance;

    // Update transform rotation to match direction
    tempForward.set(0, 0, -1);
    tempQuat.setFromUnitVectors(tempForward, missile.direction);
    transform.rotation.copy(tempQuat);

    // Check for AoE proximity detonation (closest-approach logic)
    // Detonates when: A. within AoE radius, and B. distance starts increasing (past closest point)
    if (missile.aoeRadius > 0) {
      const missileFaction = getComponent(world, entity, 'faction');

      // Find closest enemy distance (excludes missiles/projectiles for nukes)
      const closestDistance = findClosestEnemyDistance(
        world,
        transform.position,
        missile.owner,
        missileFaction,
        { includeMissiles: false },
      );

      // Detonate if we're past closest approach (distance increasing while within radius)
      if (
        shouldDetonateAtClosestApproach(
          closestDistance,
          missile.previousClosestEnemyDistance,
          missile.aoeRadius,
        )
      ) {
        const missileName = capitalizeMissileType(missile.missileType);

        // AoE damage to all nearby entities
        const aoeResult = dealAoeDamage(
          world,
          transform.position,
          missile.aoeRadius,
          missile.damage,
          missile.owner,
          NO_ENTITY, // No exclusion
          missileName,
          missile.target, // Track if locked target was hit
        );
        recordAoeMissileStats(world, missile.owner, missileName, aoeResult);

        // Nuke also destroys projectiles within blast radius
        if (missile.isNuke) {
          destroyProjectilesInRadius(
            world,
            transform.position,
            missile.aoeRadius,
            missile.owner,
          );
        }

        spawnMissileExplosion(world, transform.position, missile.isNuke);
        toRemove.push(entity);
        continue;
      }

      // Store current distance for next frame comparison
      missile.previousClosestEnemyDistance = closestDistance;
    }

    // Check for shrapnel proximity detonation (Starburst-like missiles)
    if (missile.flakRadius && missile.flakRadius > 0 && missile.shrapnelCount) {
      const missileFaction = getComponent(world, entity, 'faction');

      // Find closest enemy distance
      const closestDistance = findClosestEnemyDistance(
        world,
        transform.position,
        missile.owner,
        missileFaction,
        { includeMissiles: false },
      );

      // Detonate if we're past closest approach (distance increasing while within radius)
      if (
        shouldDetonateAtClosestApproach(
          closestDistance,
          missile.previousClosestEnemyDistance,
          missile.flakRadius,
        )
      ) {
        const missileName = capitalizeMissileType(missile.missileType);
        spawnShrapnel(
          world,
          transform.position,
          missile.shrapnelCount,
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
          stats.missilesHit[missileName] =
            (stats.missilesHit[missileName] || 0) + 1;
          stats.shrapnelSpawned =
            (stats.shrapnelSpawned || 0) + missile.shrapnelCount;
        }

        spawnMissileExplosion(world, transform.position, false);
        toRemove.push(entity);
        continue;
      }

      // Store current distance for next frame comparison
      missile.previousClosestEnemyDistance = closestDistance;
    }

    // Check if expired
    if (isMissileExpired(missile)) {
      // Track expired missiles
      if (world.systemState.combatStats) {
        world.systemState.combatStats.missilesExpired++;
      }
      // Nukes explode when out of range if enemies are in AoE
      if (missile.isNuke && missile.aoeRadius > 0) {
        const hasEnemiesInRange = checkForEnemiesInRange(
          world,
          transform.position,
          missile.aoeRadius,
          missile.owner,
          getComponent(world, entity, 'faction'),
        );

        if (hasEnemiesInRange) {
          // Trigger AoE explosion (half damage for expired nuke)
          const missileName = capitalizeMissileType(missile.missileType);
          const aoeResult = dealAoeDamage(
            world,
            transform.position,
            missile.aoeRadius,
            missile.damage * 0.5,
            missile.owner,
            NO_ENTITY, // No exclusion
            missileName,
            missile.target, // Track if locked target was hit
          );
          recordAoeMissileStats(world, missile.owner, missileName, aoeResult);

          // Nuke also destroys projectiles within blast radius
          destroyProjectilesInRadius(
            world,
            transform.position,
            missile.aoeRadius,
            missile.owner,
          );
          spawnMissileExplosion(world, transform.position, true);
        }
      }
      toRemove.push(entity);
      continue;
    }

    // Check for collisions
    const collision = getComponent(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      for (const other of collision.collidedWith) {
        // Skip owner collision until missile clears safe distance
        if (other === missile.owner) {
          if (missile.distanceTraveled < MISSILE_OWNER_SAFE_DISTANCE) {
            continue;
          }
          // Missile looped back and hit owner - destroy it (no damage)
          if (world.systemState.combatStats) {
            world.systemState.combatStats.missilesHitOwner++;
          }
          toRemove.push(entity);
          break;
        }
        if (hasComponent(world, other, 'projectile')) continue;
        if (hasComponent(world, other, 'missile')) continue;

        // Friendly fire enabled - missiles damage anyone except owner
        const missileName = capitalizeMissileType(missile.missileType);

        // Handle AoE missiles (nukes): no direct damage, full AoE centered on impact
        if (missile.aoeRadius > 0) {
          // AoE damage includes the hit target (no exclusion)
          const aoeResult = dealAoeDamage(
            world,
            transform.position,
            missile.aoeRadius,
            missile.damage, // Full damage for AoE
            missile.owner,
            NO_ENTITY, // Don't exclude anyone
            missileName,
            missile.target, // Track if locked target was hit
          );
          recordAoeMissileStats(world, missile.owner, missileName, aoeResult);

          // Nuke also destroys projectiles within blast radius
          if (missile.isNuke) {
            destroyProjectilesInRadius(
              world,
              transform.position,
              missile.aoeRadius,
              missile.owner,
            );
          }
        } else {
          // Non-AoE missiles: deal direct damage
          const damageResult = dealDamage(
            world,
            other,
            missile.damage,
            transform.position,
          );
          const totalDamage =
            damageResult.shieldDamage + damageResult.hullDamage;

          // Track per-ship damage stats for direct hit
          recordDamage(
            world,
            missile.owner,
            other,
            missileName,
            'missile',
            totalDamage,
          );

          // Only count as hit if we hit the locked target
          const hitTarget = other === missile.target && totalDamage > 0;
          if (hitTarget) {
            recordMissileHit(world, missile.owner, missileName);
          }

          // Track aggregate stats (for balance analysis)
          if (world.systemState.combatStats && missile.missileType) {
            const stats = world.systemState.combatStats;
            if (hitTarget) {
              stats.missilesHit[missileName] =
                (stats.missilesHit[missileName] || 0) + 1;
            }
            stats.missileDamage[missileName] =
              (stats.missileDamage[missileName] || 0) + totalDamage;
          }
        }

        // Spawn explosion at impact point
        spawnMissileExplosion(world, transform.position, missile.isNuke);
        toRemove.push(entity);
        break;
      }
    }
  }

  for (const entity of toRemove) {
    removeEntity(world, entity);
  }
}
