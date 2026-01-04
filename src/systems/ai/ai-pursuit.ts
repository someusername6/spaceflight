/**
 * AI Pursuit Behavior - Target pursuit and engagement movement.
 *
 * Contains functions for chasing targets with lead calculation
 * and maintaining combat distance while engaging.
 */

import type { AIControlled } from '../../components/ai';
import type { AimError } from '../../components/aim-error';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapons } from '../../components/weapons';
import { getComponent } from '../../core/ecs';
import { calculateInterceptPoint } from '../../core/lead-calculation';
import type { Entity, World } from '../../core/types';
import {
  accelerateTo,
  DEFAULT_PROJECTILE_SPEED,
  decelerateToZero,
  tempVectors,
  turnToward,
} from './ai-movement';

/** Get projectile speed from entity's primary weapons (first projectile weapon) */
export function getProjectileSpeed(world: World, entity: Entity): number {
  const weapons = getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons');
  if (weapons) {
    for (const weapon of weapons.weapons) {
      if (weapon && weapon.category !== 'beam') {
        return weapon.projectileSpeed;
      }
    }
  }
  return DEFAULT_PROJECTILE_SPEED;
}

/**
 * Pursue behavior - turn toward target (with lead) and accelerate.
 * @param closeUrgently If true, aim directly at target (skip lead) to close distance faster
 */
export function pursueTarget(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number,
  closeUrgently = false,
): void {
  const { toTarget, leadPoint } = tempVectors;

  // ai.target is checked by caller before calling pursueTarget
  const targetTransform = getComponent<Transform>(
    world,
    ai.target as Entity,
    'transform',
  );
  if (!targetTransform) {
    ai.target = null;
    return;
  }

  // When closing urgently, aim directly at target (closes distance vs circling)
  let aimPoint = targetTransform.position;

  if (!closeUrgently) {
    // Get target velocity for lead calculation
    const targetPhysics = getComponent<Physics>(
      world,
      ai.target as Entity,
      'physics',
    );

    // Skip lead if target moving erratically (high angular velocity)
    const aimError = getComponent<AimError>(world, entity, 'aimError');
    const highAngularVelocity =
      aimError && aimError.currentAngularVelocity > 0.15;

    if (targetPhysics && !highAngularVelocity) {
      const projectileSpeed = getProjectileSpeed(world, entity);
      const intercept = calculateInterceptPoint(
        transform.position,
        physics.velocity,
        targetTransform.position,
        targetPhysics.velocity,
        projectileSpeed,
      );
      if (intercept) {
        leadPoint.copy(intercept);
        aimPoint = leadPoint;
      }
    }
  }

  // Calculate direction to aim point and turn
  toTarget.copy(aimPoint).sub(transform.position);
  if (toTarget.lengthSq() > 0.001) {
    toTarget.normalize();
    turnToward(transform, physics, toTarget, dt);
  }

  accelerateTo(physics, physics.maxSpeed, dt);
}

/**
 * Maintain distance engagement - turn toward target but don't close.
 * Used by kiting ships to stay at preferred range while firing.
 */
export function maintainDistanceEngage(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number,
): void {
  const { toTarget, leadPoint } = tempVectors;

  const targetTransform = getComponent<Transform>(
    world,
    ai.target as Entity,
    'transform',
  );
  if (!targetTransform) return;

  // Calculate lead point for aiming
  const targetPhysics = getComponent<Physics>(
    world,
    ai.target as Entity,
    'physics',
  );

  let aimPoint = targetTransform.position;
  if (targetPhysics) {
    const projectileSpeed = getProjectileSpeed(world, entity);
    const intercept = calculateInterceptPoint(
      transform.position,
      physics.velocity,
      targetTransform.position,
      targetPhysics.velocity,
      projectileSpeed,
    );
    if (intercept) {
      leadPoint.copy(intercept);
      aimPoint = leadPoint;
    }
  }

  // Turn toward aim point
  toTarget.copy(aimPoint).sub(transform.position);
  if (toTarget.lengthSq() > 0.001) {
    toTarget.normalize();
    turnToward(transform, physics, toTarget, dt);
  }

  // Stop moving - we're facing the target for aiming, so any forward
  // movement would close distance
  decelerateToZero(physics, dt);
}
