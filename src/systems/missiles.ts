/**
 * Missile System - Handles missile tracking, movement, and hits.
 */

import * as THREE from 'three';
import type { FactionComponent } from '../components/faction';
import { areEnemies } from '../components/faction';
import type { Missile } from '../components/missile';
import { isMissileExpired } from '../components/missile';
import type { Transform } from '../components/transform';
import {
  entityExists,
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Collision } from './collision';
import { dealDamage } from './damage';

// Reusable vectors and quaternions (avoid per-frame allocations)
const toTarget = new THREE.Vector3();
const rotationAxis = new THREE.Vector3();
const tempForward = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

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
      toRemove.push(entity);
      continue;
    }

    // Check for collisions
    const collision = getComponent<Collision>(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      const missileFaction = getComponent<FactionComponent>(
        world,
        entity,
        'faction',
      );

      for (const other of collision.collidedWith) {
        if (other === missile.owner) continue;
        if (hasComponent(world, other, 'projectile')) continue;
        if (hasComponent(world, other, 'missile')) continue;

        const otherFaction = getComponent<FactionComponent>(
          world,
          other,
          'faction',
        );
        if (missileFaction && otherFaction) {
          if (!areEnemies(missileFaction.faction, otherFaction.faction))
            continue;
        }

        dealDamage(world, other, missile.damage);
        toRemove.push(entity);
        break;
      }
    }
  }

  for (const entity of toRemove) {
    removeEntity(world, entity);
  }
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
