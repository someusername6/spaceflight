/**
 * Missile Helper Functions - Extracted from missiles.ts to stay under 400 lines.
 */

import * as THREE from 'three';
import { DECOY_SEDUCE_RANGE } from '../../components/decoy';
import { createExplosion } from '../../components/explosion';
import type { Missile } from '../../components/missile';
import type { Transform } from '../../components/transform';
import { createTransform } from '../../components/transform';
import {
  addComponent,
  createEntity,
  getComponent,
  queryEntities,
} from '../../core/ecs';
import type { Entity, World } from '../../core/types';

const MISSILE_EXPLOSION_SIZE = 4;
const MISSILE_EXPLOSION_COLOR = new THREE.Color(1.0, 0.5, 0.1);
const NUKE_EXPLOSION_SIZE = 15;

// Reusable vectors
const toTarget = new THREE.Vector3();
const rotationAxis = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const toDecoy = new THREE.Vector3();

/** Spawn an explosion for missile impact */
export function spawnMissileExplosion(
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

/** Turn missile toward its target */
export function trackTarget(
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
export function findNearestDecoy(
  world: World,
  missilePosition: THREE.Vector3,
): Entity | undefined {
  let nearestDecoy: Entity | undefined;
  let nearestDistance = DECOY_SEDUCE_RANGE;

  for (const entity of queryEntities(world, ['decoy', 'transform'])) {
    const transform = getComponent(world, entity, 'transform');
    if (!transform) continue;

    toDecoy.copy(transform.position).sub(missilePosition);
    const distance = toDecoy.length();

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestDecoy = entity;
    }
  }

  return nearestDecoy;
}

/** Capitalize missile type for display/stats (e.g., "rocket" -> "Rocket") */
export function capitalizeMissileType(missileType: string): string {
  return missileType.charAt(0).toUpperCase() + missileType.slice(1);
}

/** Check if missile should detonate based on closest approach logic */
export function shouldDetonateAtClosestApproach(
  closestDistance: number,
  previousDistance: number | undefined,
  radius: number,
): boolean {
  const withinRadius = closestDistance < radius;
  const wasWithinRadius =
    previousDistance !== undefined && previousDistance < radius;
  const distanceIncreasing =
    previousDistance !== undefined && closestDistance > previousDistance;
  return withinRadius && wasWithinRadius && distanceIncreasing;
}
