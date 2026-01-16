/**
 * Aim Error System - Updates AI aim drift over time.
 *
 * AI aim accuracy is affected by:
 * 1. Base aim error (from AI profile) - constant inaccuracy
 * 2. Drift - aim wanders slowly over time
 * 3. Target angular velocity - fast-moving targets are harder to track
 *
 * Angular velocity = perpendicular_speed / distance
 * Moving perpendicular to the shooter's line of sight maximizes angular velocity.
 */

import * as THREE from 'three';
import {
  updateAimError,
  updateEffectiveMaxError,
} from '../components/aim-error';
import { entityExists, getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';

// Reusable vectors to avoid allocations
const toTarget = new THREE.Vector3();
const targetVelPerp = new THREE.Vector3();

/**
 * Calculate target's angular velocity as seen from shooter.
 *
 * Angular velocity = perpendicular_speed / distance
 * This measures how fast the target appears to move across the shooter's view.
 *
 * @param shooterPos - Shooter's position
 * @param targetPos - Target's position
 * @param targetVelocity - Target's velocity vector
 * @returns Angular velocity in radians per second
 */
export function calculateAngularVelocity(
  shooterPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  targetVelocity: THREE.Vector3,
): number {
  // Direction from shooter to target
  toTarget.copy(targetPos).sub(shooterPos);
  const distance = toTarget.length();

  // Avoid division by zero
  if (distance < 1) return 0;

  // Normalize direction
  toTarget.divideScalar(distance);

  // Get perpendicular component of target velocity
  // v_perp = v - (v · d) * d
  const velAlongAxis = targetVelocity.dot(toTarget);
  targetVelPerp.copy(targetVelocity).addScaledVector(toTarget, -velAlongAxis);

  const perpSpeed = targetVelPerp.length();

  // Angular velocity = perpendicular speed / distance
  return perpSpeed / distance;
}

/** Aim error system - updates aim drift and angular velocity effects */
export function aimErrorSystem(world: World, dt: number): void {
  for (const entity of queryEntities(world, ['aimError'])) {
    // Query guarantees this component exists
    const aimError = getComponent(world, entity, 'aimError')!;

    // Get AI component to find target for angular velocity calculation
    const ai = getComponent(world, entity, 'aiControlled');
    const transform = getComponent(world, entity, 'transform');

    let angularVelocity = 0;

    // Calculate angular velocity if we have a valid target
    if (ai?.target && entityExists(world, ai.target) && transform) {
      const targetTransform = getComponent(world, ai.target, 'transform');
      const targetPhysics = getComponent(world, ai.target, 'physics');

      if (targetTransform && targetPhysics) {
        angularVelocity = calculateAngularVelocity(
          transform.position,
          targetTransform.position,
          targetPhysics.velocity,
        );
      }
    }

    // Update effective max error based on angular velocity
    updateEffectiveMaxError(aimError, angularVelocity);

    // Update aim drift
    updateAimError(aimError, world.prng, dt);
  }
}
