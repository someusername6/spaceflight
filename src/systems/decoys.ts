/**
 * Decoy System - Handles decoy movement, lifetime, and missile destruction.
 *
 * Decoys move slowly and can destroy missiles on collision.
 * Missiles may also be seduced to target decoys (handled in missiles.ts).
 */

import * as THREE from 'three';
import type { Decoy } from '../components/decoy';
import { DECOY_SPEED, isDecoyExpired } from '../components/decoy';
import type { Transform } from '../components/transform';
import {
  getComponent,
  hasComponent,
  queryEntities,
  removeEntity,
} from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Collision } from './collision';
import { dealDamage } from './damage';

// Reusable vectors (avoid per-frame allocations)
const tempForward = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

/** Decoy system - movement, lifetime, and collision */
export function decoySystem(world: World, dt: number): void {
  const toRemove: Entity[] = [];

  for (const entity of queryEntities(world, ['decoy', 'transform'])) {
    // Query guarantees these components exist
    const decoy = getComponent<Decoy>(world, entity, 'decoy') as Decoy;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;

    // Update lifetime
    decoy.timeRemaining -= dt;
    if (isDecoyExpired(decoy)) {
      toRemove.push(entity);
      continue;
    }

    // Move decoy
    const distance = DECOY_SPEED * dt;
    transform.position.addScaledVector(decoy.direction, distance);

    // Update rotation to match direction
    tempForward.set(0, 0, -1);
    tempQuat.setFromUnitVectors(tempForward, decoy.direction);
    transform.rotation.copy(tempQuat);

    // Check for collisions with missiles
    const collision = getComponent<Collision>(world, entity, 'collision');
    if (collision && collision.collidedWith.length > 0) {
      for (const other of collision.collidedWith) {
        if (other === decoy.owner) continue;

        // Destroy missiles that collide with decoy
        if (hasComponent(world, other, 'missile')) {
          // Deal enough damage to destroy the missile (they have 1 HP)
          dealDamage(world, other, 10, transform.position);
          // Decoy is consumed when destroying a missile
          toRemove.push(entity);
          break;
        }
      }
    }
  }

  for (const entity of toRemove) {
    removeEntity(world, entity);
  }
}

/** Get all active decoys (for missile seduction logic) */
export function getActiveDecoys(
  world: World,
): Array<{ entity: Entity; transform: Transform; decoy: Decoy }> {
  const decoys: Array<{ entity: Entity; transform: Transform; decoy: Decoy }> =
    [];

  for (const entity of queryEntities(world, ['decoy', 'transform'])) {
    const decoy = getComponent<Decoy>(world, entity, 'decoy') as Decoy;
    const transform = getComponent<Transform>(
      world,
      entity,
      'transform',
    ) as Transform;
    decoys.push({ entity, transform, decoy });
  }

  return decoys;
}
