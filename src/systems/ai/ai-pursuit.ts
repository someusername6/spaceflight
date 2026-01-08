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
  aimToward,
  DEFAULT_PROJECTILE_SPEED,
  setDecelerateInputs,
  setSpeedInputs,
  tempVectors,
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
  _dt: number,
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

  // Fetch components once for reuse
  const weapons = getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons');
  const aimError = getComponent<AimError>(world, entity, 'aimError');

  // When closing urgently, aim directly at target (closes distance vs circling)
  let aimPoint = targetTransform.position;

  // Skip lead calculation for beam-only ships (beams are hitscan)
  const needsLead = !closeUrgently && weapons && !weapons.hasOnlyBeams;

  if (needsLead) {
    // Get target velocity for lead calculation
    const targetPhysics = getComponent<Physics>(
      world,
      ai.target as Entity,
      'physics',
    );

    // Skip lead if target moving erratically (high angular velocity)
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

  // Calculate direction to aim point and turn (with aim error for beam ships)
  toTarget.copy(aimPoint).sub(transform.position);
  if (toTarget.lengthSq() > 0.001) {
    toTarget.normalize();
    aimToward(world, entity, ai, transform, toTarget, weapons, aimError);
  }

  setSpeedInputs(ai, physics, physics.maxSpeed);
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
  _dt: number,
): void {
  const { toTarget, leadPoint } = tempVectors;

  const targetTransform = getComponent<Transform>(
    world,
    ai.target as Entity,
    'transform',
  );
  if (!targetTransform) return;

  // Fetch components once for reuse
  const weapons = getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons');
  const aimError = getComponent<AimError>(world, entity, 'aimError');

  let aimPoint = targetTransform.position;

  // Only calculate lead for ships with projectile weapons (beams are hitscan)
  if (weapons && !weapons.hasOnlyBeams) {
    const targetPhysics = getComponent<Physics>(
      world,
      ai.target as Entity,
      'physics',
    );

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
  }

  // Turn toward aim point (with aim error for beam ships)
  toTarget.copy(aimPoint).sub(transform.position);
  if (toTarget.lengthSq() > 0.001) {
    toTarget.normalize();
    aimToward(world, entity, ai, transform, toTarget, weapons, aimError);
  }

  // Stop moving - we're facing the target for aiming, so any forward
  // movement would close distance
  setDecelerateInputs(ai);
}
