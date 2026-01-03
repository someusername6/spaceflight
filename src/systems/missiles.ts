/** Missile System - Handles missile tracking, movement, and hits. */

import * as THREE from 'three';
import { DECOY_SEDUCE_CHANCE, DECOY_SEDUCE_RANGE } from '../components/decoy';
import { createExplosion } from '../components/explosion';
import type { FactionComponent } from '../components/faction';
import { areEnemies } from '../components/faction';
import type { Health } from '../components/health';
import type { Missile } from '../components/missile';
import { isMissileExpired } from '../components/missile';
import type { Projectile } from '../components/projectile';
import type { Transform } from '../components/transform';
import { createTransform } from '../components/transform';
import {
  addComponent,
  createEntity,
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import { random } from '../core/prng';
import type { Entity, World } from '../core/types';
import type { Collision } from './collision';
import { dealDamage } from './damage';

const MISSILE_EXPLOSION_SIZE = 4;
const MISSILE_EXPLOSION_COLOR = new THREE.Color(1.0, 0.5, 0.1);
const NUKE_EXPLOSION_SIZE = 15;

// Reusable vectors and quaternions (avoid per-frame allocations)
const toTarget = new THREE.Vector3();
const rotationAxis = new THREE.Vector3();
const tempForward = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const toDecoy = new THREE.Vector3();

/** Missile system - tracking and collision handling */
export function missileSystem(world: World, dt: number): void {
  const toRemove: Entity[] = [];

  for (const entity of queryEntities(world, ['missile', 'transform'])) {
    // Query guarantees these components exist
    const missile = getComponent<Missile>(world, entity, 'missile') as Missile;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    // Check for decoy seduction (any missile with turnRate can be seduced)
    if (
      missile.turnRate > 0 &&
      !hasComponent(world, missile.target ?? -1, 'decoy')
    ) {
      const nearestDecoy = findNearestDecoy(world, transform.position);
      if (nearestDecoy) {
        // Seduction chance check (deterministic using world prng)
        if (random(world.prng) < DECOY_SEDUCE_CHANCE) {
          missile.target = nearestDecoy;
        }
      }
    }

    // Update tracking if we have a target
    if (missile.target !== undefined && missile.turnRate > 0) {
      if (entityExists(world, missile.target)) {
        const targetTransform = getComponent<Transform>(
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

    // Check if expired
    if (isMissileExpired(missile)) {
      // Nukes explode when out of range if enemies are in AoE
      if (missile.isNuke && missile.aoeRadius > 0) {
        const hasEnemiesInRange = checkForEnemiesInRange(
          world,
          transform.position,
          missile.aoeRadius,
          missile.owner,
          getComponent<FactionComponent>(world, entity, 'faction'),
        );

        if (hasEnemiesInRange) {
          // Trigger AoE explosion
          dealAoeDamage(
            world,
            transform.position,
            missile.aoeRadius,
            missile.damage * 0.5,
            missile.owner,
            -1 as Entity, // No direct hit target to exclude
          );
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
    const collision = getComponent<Collision>(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      for (const other of collision.collidedWith) {
        if (other === missile.owner) continue;
        if (hasComponent(world, other, 'projectile')) continue;
        if (hasComponent(world, other, 'missile')) continue;

        // Friendly fire enabled - missiles damage anyone except owner

        // Deal direct damage to the hit target
        dealDamage(world, other, missile.damage, transform.position);

        // Handle AoE damage if missile has AoE radius
        if (missile.aoeRadius > 0) {
          dealAoeDamage(
            world,
            transform.position,
            missile.aoeRadius,
            missile.damage * 0.5, // AoE does half damage
            missile.owner,
            other, // Exclude the directly-hit target
          );
          // Nuke also destroys projectiles within blast radius
          if (missile.isNuke) {
            destroyProjectilesInRadius(
              world,
              transform.position,
              missile.aoeRadius,
              missile.owner,
            );
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

/** Spawn an explosion for missile impact */
function spawnMissileExplosion(
  world: World,
  position: THREE.Vector3,
  isNuke = false,
): void {
  const explosion = createEntity(world);
  addComponent(
    world,
    explosion,
    createTransform(position.x, position.y, position.z),
  );

  if (isNuke) {
    // Nuke gets special explosion with unique visuals
    addComponent(
      world,
      explosion,
      createExplosion(
        NUKE_EXPLOSION_SIZE,
        MISSILE_EXPLOSION_COLOR,
        undefined,
        'nuke',
      ),
    );
  } else {
    addComponent(
      world,
      explosion,
      createExplosion(MISSILE_EXPLOSION_SIZE, MISSILE_EXPLOSION_COLOR),
    );
  }
}

// Reusable vector for AoE distance calculation
const aoeTempVec = new THREE.Vector3();

/** Deal AoE damage to all entities within radius (including missiles and projectiles) */
function dealAoeDamage(
  world: World,
  center: THREE.Vector3,
  radius: number,
  maxDamage: number,
  owner: Entity,
  exclude: Entity,
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
        dealDamage(world, entity, damage, center);
      }
    }
  }
}

/** Check if any enemies are within range (for smart nuke detonation) */
function checkForEnemiesInRange(
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

/** Turn missile toward its target */
function trackTarget(
  missile: Missile,
  missileTransform: Transform,
  targetTransform: Transform,
  dt: number,
): void {
  // Calculate direction to target
  toTarget
    .copy(targetTransform.position)
    .sub(missileTransform.position)
    .normalize();

  // Calculate angle between current direction and target direction
  const dot = missile.direction.dot(toTarget);
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angleBetween = Math.acos(clampedDot);

  if (angleBetween < 0.001) return; // Already pointing at target

  // Calculate max turn this frame
  const maxTurn = missile.turnRate * dt;

  if (angleBetween <= maxTurn) {
    // Can reach target direction this frame
    missile.direction.copy(toTarget);
  } else {
    // Rotate toward target by maxTurn
    rotationAxis.crossVectors(missile.direction, toTarget).normalize();
    if (rotationAxis.lengthSq() < 0.0001) {
      // Parallel vectors - pick arbitrary axis
      rotationAxis.set(0, 1, 0);
    }
    tempQuat.setFromAxisAngle(rotationAxis, maxTurn);
    missile.direction.applyQuaternion(tempQuat).normalize();
  }
}

/** Find nearest decoy within seduce range (for missile seduction) */
function findNearestDecoy(
  world: World,
  missilePosition: THREE.Vector3,
): Entity | undefined {
  let nearestDecoy: Entity | undefined;
  let nearestDistance = DECOY_SEDUCE_RANGE;

  for (const entity of queryEntities(world, ['decoy', 'transform'])) {
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    toDecoy.copy(transform.position).sub(missilePosition);
    const distance = toDecoy.length();

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestDecoy = entity;
    }
  }

  return nearestDecoy;
}

/** Destroy all projectiles within radius (for nuke AoE) */
function destroyProjectilesInRadius(
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
