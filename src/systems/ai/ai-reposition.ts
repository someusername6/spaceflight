/**
 * AI Reposition Behavior - Burst-disengage pattern for long-range ships.
 *
 * Long-range ships (with preferredCombatRange set) use this pattern:
 * 1. Engage for burst duration
 * 2. Reposition to regain preferred range
 * 3. Re-engage from optimal distance
 *
 * This creates more dynamic combat where long-range ships maintain distance
 * rather than brawling at close range.
 */

import { Quaternion, Vector3 } from 'three';
import { type AIControlled, AIState } from '../../components/ai';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
import { entityExists, getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vectors
const toTarget = new Vector3();
const forward = new Vector3();
const rotationAxis = new Vector3();
const deltaQuat = new Quaternion();
const localUp = new Vector3();
const escapeDir = new Vector3();

const DEG_TO_RAD = Math.PI / 180;

/** Helper: Turn toward a direction */
function turnToward(
  transform: Transform,
  physics: Physics,
  direction: Vector3,
  dt: number,
): void {
  forward.set(0, 0, -1).applyQuaternion(transform.rotation);
  const dot = forward.dot(direction);
  const turnSpeed = physics.turnRate * DEG_TO_RAD * dt;

  if (dot < 0.999) {
    rotationAxis.crossVectors(forward, direction);
    const axisLengthSq = rotationAxis.lengthSq();

    if (axisLengthSq > 0.0001) {
      rotationAxis.multiplyScalar(1 / Math.sqrt(axisLengthSq));
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      deltaQuat.setFromAxisAngle(rotationAxis, Math.min(angle, turnSpeed));
      transform.rotation.premultiply(deltaQuat);
      transform.rotation.normalize();
    } else if (dot < -0.9) {
      // Anti-parallel case: pick arbitrary perpendicular axis (up)
      rotationAxis.set(0, 1, 0);
      deltaQuat.setFromAxisAngle(rotationAxis, turnSpeed);
      transform.rotation.premultiply(deltaQuat);
      transform.rotation.normalize();
    }
  }
}

/** Check if AI should reposition (burst-disengage for long-range ships) */
export function shouldReposition(ai: AIControlled, distance: number): boolean {
  // Only ships with preferredCombatRange use burst-disengage
  if (ai.preferredCombatRange === undefined) return false;

  const profile = ai.profile;

  // Only trigger for explicitly long-range ships (preferredCombatRange > 130% of engage range)
  // This prevents brawlers from incorrectly using burst-disengage
  if (ai.preferredCombatRange <= profile.engageRange * 1.3) return false;

  // Must have been engaging long enough (completed burst)
  // The state timer reset on state change provides natural cooldown
  if (ai.stateTimer < profile.burstDuration) return false;

  // Only reposition if too close (inside preferred range)
  if (distance >= ai.preferredCombatRange * 0.9) return false;

  return true;
}

/** Reposition state - disengage to regain preferred combat range */
export function updateReposition(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  dt: number,
): void {
  const profile = ai.profile;

  // Check if target is still valid
  if (!ai.target || !entityExists(world, ai.target)) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const targetTransform = getComponent<Transform>(
    world,
    ai.target,
    'transform',
  );
  if (!targetTransform) {
    ai.target = null;
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const distance = transform.position.distanceTo(targetTransform.position);
  const preferredRange = ai.preferredCombatRange ?? profile.engageRange;

  // Exit condition: reached preferred range or max reposition time
  if (
    distance >= preferredRange * 0.95 ||
    ai.stateTimer >= profile.maxRepositionTime
  ) {
    ai.state = AIState.Engage;
    ai.stateTimer = 0;
    return;
  }

  // Break off if target gets too far (somehow)
  if (distance > profile.breakOffRange) {
    ai.state = AIState.Pursue;
    ai.stateTimer = 0;
    return;
  }

  // Fly away from target - perpendicular escape for maximum angular velocity
  toTarget.copy(transform.position).sub(targetTransform.position);
  if (toTarget.lengthSq() > 0.001) {
    toTarget.normalize();

    // Calculate perpendicular direction
    localUp.set(0, 1, 0);
    escapeDir.crossVectors(toTarget, localUp);
    if (escapeDir.lengthSq() < 0.001) {
      escapeDir.set(1, 0, 0);
    } else {
      escapeDir.normalize();
    }

    // Pick direction requiring less turn
    forward.set(0, 0, -1).applyQuaternion(transform.rotation);
    if (forward.dot(escapeDir) < 0) {
      escapeDir.negate();
    }

    // Blend: 60% perpendicular + 40% away (gain distance while staying evasive)
    escapeDir.multiplyScalar(0.6).addScaledVector(toTarget, 0.4).normalize();

    turnToward(transform, physics, escapeDir, dt);
  }

  // Use afterburner for fast repositioning
  const afterburnerSpeed = physics.maxSpeed * physics.afterburnerMultiplier;
  physics.currentSpeed = Math.min(
    physics.currentSpeed + physics.acceleration * 1.3 * dt,
    afterburnerSpeed * 0.8,
  );
}
