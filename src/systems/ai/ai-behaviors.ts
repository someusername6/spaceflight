/**
 * AI Behaviors - State update functions for AI ships.
 *
 * Extracted from ai.ts to stay under 400 line limit.
 * Uses AIProfile for per-entity behavior configuration.
 */

import { Quaternion, Vector3 } from 'three';
import { type AIControlled, AIState } from '../../components/ai';
import type { Faction } from '../../components/faction';
import type { Heat } from '../../components/heat';
import {
  AFTERBURNER_UNLOCK_THRESHOLD,
  getHeatPercent,
  isHeatWarning,
} from '../../components/heat';
import type { Physics } from '../../components/physics';
import type { Shields } from '../../components/shields';
import type { Transform } from '../../components/transform';
import { entityExists, getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import type { AIProfile } from '../../data/ai-profiles';
import { findNearestEnemy } from './ai';

// Reusable vectors
const toTarget = new Vector3();
const forward = new Vector3();
const rotationAxis = new Vector3();
const deltaQuat = new Quaternion();
const localUp = new Vector3(); // For ship-relative calculations
const escapeDir = new Vector3(); // For smart evade direction

const DEG_TO_RAD = Math.PI / 180;

/** Check if AI should evade (low shields) - uses profile threshold */
export function shouldEvade(
  shields: Shields | undefined,
  profile: AIProfile,
): boolean {
  if (!shields) return false;
  return shields.current / shields.max < profile.evadeShieldThreshold;
}

/** Check if AI should regroup (very low shields or overheated) - uses profile threshold */
export function shouldRegroup(
  shields: Shields | undefined,
  heat: Heat | undefined,
  profile: AIProfile,
): boolean {
  const veryLowShields =
    shields && shields.current / shields.max < profile.regroupShieldThreshold;
  const overheated = heat && isHeatWarning(heat);
  return !!(veryLowShields || overheated);
}

/** Check if AI has recovered enough to re-engage - uses profile threshold */
function hasRecovered(
  shields: Shields | undefined,
  heat: Heat | undefined,
  profile: AIProfile,
): boolean {
  const shieldsOk =
    !shields || shields.current / shields.max >= profile.recoverShieldThreshold;
  const heatOk = !heat || getHeatPercent(heat) <= AFTERBURNER_UNLOCK_THRESHOLD;
  return shieldsOk && heatOk;
}

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

/** Evade state - break away from combat using afterburner */
export function updateEvade(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  shields: Shields | undefined,
  heat: Heat | undefined,
  dt: number,
): void {
  const profile = ai.profile;
  // Exit condition: cooldown expired and shields recovered (or no shields)
  const shieldsRecovered =
    !shields || shields.current / shields.max >= profile.evadeShieldThreshold;
  if (ai.stateTimer >= profile.evadeCooldown && shieldsRecovered) {
    ai.state = ai.target ? AIState.Pursue : AIState.Idle;
    ai.stateTimer = 0;
    physics.isAfterburning = false;
    return;
  }

  // Calculate current forward direction
  forward.set(0, 0, -1).applyQuaternion(transform.rotation);

  // Smart evade: prefer perpendicular movement to maximize angular velocity
  // (harder for enemy to track), with slight bias toward away for distance
  if (ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent<Transform>(
      world,
      ai.target,
      'transform',
    );
    if (targetTransform) {
      // Direction away from target (normalized)
      toTarget.copy(transform.position).sub(targetTransform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();

        // Calculate perpendicular direction (maximizes angular velocity)
        // Use world up to get a horizontal perpendicular direction
        localUp.set(0, 1, 0);
        escapeDir.crossVectors(toTarget, localUp);
        if (escapeDir.lengthSq() < 0.001) {
          // Target is directly above/below - use world X instead
          escapeDir.set(1, 0, 0);
        } else {
          escapeDir.normalize();
        }

        // Pick left or right based on which requires less turn
        if (forward.dot(escapeDir) < 0) {
          escapeDir.negate();
        }

        // Blend: 70% perpendicular (hard to hit) + 30% away (gain distance)
        // This creates a spiral escape pattern that's both evasive and effective
        escapeDir
          .multiplyScalar(0.7)
          .addScaledVector(toTarget, 0.3)
          .normalize();

        turnToward(transform, physics, escapeDir, dt);
      }
    }
  }

  // Add erratic movement (barrel roll effect around ship's forward axis)
  const wobble = Math.sin(ai.stateTimer * 8) * 0.3;
  forward.set(0, 0, -1).applyQuaternion(transform.rotation);
  const wobbleQuat = deltaQuat.setFromAxisAngle(forward, wobble * dt);
  transform.rotation.multiply(wobbleQuat);
  transform.rotation.normalize();

  // Afterburner escape - use boosted speed if not heat-locked
  const canAfterburn = !physics.afterburnerLocked;
  const afterburnerSpeed = physics.maxSpeed * physics.afterburnerMultiplier;

  if (canAfterburn) {
    // Accelerate to afterburner speed
    physics.currentSpeed = Math.min(
      physics.currentSpeed + physics.acceleration * 1.5 * dt,
      afterburnerSpeed,
    );
    physics.isAfterburning = true;

    // Generate heat while afterburning
    if (heat) {
      heat.current = Math.min(
        heat.max,
        heat.current + physics.afterburnerHeatRate * dt,
      );
    }
  } else {
    // Heat-locked - use normal max speed
    physics.currentSpeed = Math.min(
      physics.currentSpeed + physics.acceleration * dt,
      physics.maxSpeed,
    );
    physics.isAfterburning = false;
  }
}

/** Protect state - aggressively engage threats to the protectee */
export function updateProtect(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  faction: Faction,
  dt: number,
): void {
  const profile = ai.profile;

  // Check if we have someone to protect
  if (!ai.protectTarget || !entityExists(world, ai.protectTarget)) {
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Find nearest threat to protectee and engage it directly
  const protecteeTransform = getComponent<Transform>(
    world,
    ai.protectTarget,
    'transform',
  );
  if (!protecteeTransform) {
    ai.state = AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  const distToProtectee = transform.position.distanceTo(
    protecteeTransform.position,
  );
  const threat = findNearestEnemy(world, ai.protectTarget, faction);

  // If too far from protectee, return instead of chasing threats
  if (threat && distToProtectee <= profile.protectChaseRange) {
    ai.target = threat;
    const threatTransform = getComponent<Transform>(world, threat, 'transform');
    if (threatTransform) {
      // Pursue the threat aggressively to force it into evasive state
      toTarget.copy(threatTransform.position).sub(transform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();
        turnToward(transform, physics, toTarget, dt);
      }
      // Full speed pursuit
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * dt,
        physics.maxSpeed,
      );
    }
  } else {
    // No threats or too far from protectee - return to protectee
    if (distToProtectee > profile.protectPatrolRange) {
      // Move closer to protectee
      toTarget
        .copy(protecteeTransform.position)
        .sub(transform.position)
        .normalize();
      turnToward(transform, physics, toTarget, dt);
      physics.currentSpeed = Math.min(
        physics.currentSpeed + physics.acceleration * dt,
        physics.maxSpeed * 0.7,
      );
    } else {
      // Close enough - slow down and patrol
      physics.currentSpeed = Math.max(
        physics.currentSpeed - physics.acceleration * dt,
        physics.maxSpeed * 0.3,
      );
    }
  }
}

/** Regroup state - disengage and recover */
export function updateRegroup(
  world: World,
  _entity: Entity,
  ai: AIControlled,
  transform: Transform,
  physics: Physics,
  shields: Shields | undefined,
  heat: Heat | undefined,
  dt: number,
): void {
  const profile = ai.profile;
  // Exit condition: recovered and minimum time passed
  if (
    ai.stateTimer >= profile.regroupMinTime &&
    hasRecovered(shields, heat, profile)
  ) {
    ai.state = ai.target ? AIState.Pursue : AIState.Idle;
    ai.stateTimer = 0;
    return;
  }

  // Regroup behavior: fly away from target in a large loop
  if (ai.target && entityExists(world, ai.target)) {
    const targetTransform = getComponent<Transform>(
      world,
      ai.target,
      'transform',
    );
    if (targetTransform) {
      // Turn away from target with slight curve (looping maneuver)
      toTarget.copy(transform.position).sub(targetTransform.position);
      if (toTarget.lengthSq() > 0.001) {
        toTarget.normalize();
        // Add upward curve for looping effect (ship-relative up)
        localUp.set(0, 1, 0).applyQuaternion(transform.rotation);
        toTarget.addScaledVector(localUp, 0.3);
        toTarget.normalize();
        turnToward(transform, physics, toTarget, dt);
      }
    }
  }

  // Cruise at moderate speed to conserve heat
  const targetSpeed = physics.maxSpeed * 0.7;
  if (physics.currentSpeed < targetSpeed) {
    physics.currentSpeed = Math.min(
      physics.currentSpeed + physics.acceleration * dt,
      targetSpeed,
    );
  } else if (physics.currentSpeed > targetSpeed) {
    // Decelerate if going too fast
    physics.currentSpeed = Math.max(
      physics.currentSpeed - physics.acceleration * dt,
      targetSpeed,
    );
  }
}
