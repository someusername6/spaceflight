/**
 * AI Movement Utilities - Shared movement helpers for AI systems.
 *
 * Extracted to avoid duplication across ai.ts, ai-behaviors.ts, ai-reposition.ts.
 */

import { Quaternion, Vector3 } from 'three';
import type { AIControlled } from '../../components/ai';
import type { AimError } from '../../components/aim-error';
import { applyAimError } from '../../components/aim-error';
import type { Physics } from '../../components/physics';
import type { Transform } from '../../components/transform';
import type { PrimaryWeapons } from '../../components/weapons';
import { getComponent } from '../../core/ecs';
import type { Entity, World } from '../../core/types';

// Reusable vectors (shared across all AI movement code)
export const tempVectors = {
  toTarget: new Vector3(),
  forward: new Vector3(),
  rotationAxis: new Vector3(),
  deltaQuat: new Quaternion(),
  localUp: new Vector3(),
  escapeDir: new Vector3(),
  leadPoint: new Vector3(),
};

const DEG_TO_RAD = Math.PI / 180;

// === Distance-flee (kiting) thresholds ===
/** Distance must exceed this fraction of preferredCombatRange to return from flee */
export const FLEE_RETURN_THRESHOLD = 0.95;

/** Distance must be below this fraction of preferredCombatRange to trigger reposition */
export const REPOSITION_DISTANCE_THRESHOLD = 0.9;

/** Ships with preferredCombatRange > engageRange * this are "long-range" */
export const LONG_RANGE_MULTIPLIER = 1.3;

/** Distance beyond preferredRange * this triggers urgent closing */
export const CLOSE_URGENTLY_THRESHOLD = 1.1;

// === Evade direction blending ===
/** Perpendicular component in normal evade (0-1) */
export const EVADE_PERPENDICULAR_WEIGHT = 0.7;
/** Away component in normal evade (0-1) */
export const EVADE_AWAY_WEIGHT = 0.3;

/** Perpendicular component in reposition (0-1) */
export const REPOSITION_PERPENDICULAR_WEIGHT = 0.6;
/** Away component in reposition (0-1) */
export const REPOSITION_AWAY_WEIGHT = 0.4;

/**
 * Check if this AI uses kiting (distance-flee) behavior.
 * Kiting ships flee when enemies get too close and return when distance regained.
 */
export function isKitingShip(ai: AIControlled): boolean {
  return ai.fleeDistance !== undefined;
}

/**
 * Turn ship toward a target direction.
 *
 * @param transform - Ship's transform component
 * @param physics - Ship's physics component (for turn rate)
 * @param direction - Target direction (normalized)
 * @param dt - Delta time
 */
export function turnToward(
  transform: Transform,
  physics: Physics,
  direction: Vector3,
  dt: number,
): void {
  const { forward, rotationAxis, deltaQuat } = tempVectors;

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

/**
 * Turn toward target with aim error applied for beam-using ships.
 * Beam weapons are fixed-mount, so aim error is applied to ship rotation.
 * Projectile weapons have aim error applied at spawn time instead.
 *
 * @param weapons - Optional pre-fetched weapons (avoids redundant lookup)
 * @param aimError - Optional pre-fetched aim error (avoids redundant lookup)
 */
export function aimToward(
  world: World,
  entity: Entity,
  transform: Transform,
  physics: Physics,
  direction: Vector3,
  dt: number,
  weapons?: PrimaryWeapons | null,
  aimError?: AimError | null,
): void {
  // Use provided components or fetch them
  const w =
    weapons ?? getComponent<PrimaryWeapons>(world, entity, 'primaryWeapons');
  const e = aimError ?? getComponent<AimError>(world, entity, 'aimError');

  if (w?.hasBeams && e) {
    const perceivedDir = applyAimError(direction, e);
    turnToward(transform, physics, perceivedDir, dt);
  } else {
    turnToward(transform, physics, direction, dt);
  }
}

/**
 * Calculate escape direction for evade/reposition maneuvers.
 *
 * @param awayDir - Direction away from target (normalized)
 * @param forward - Current forward direction
 * @param perpendicularWeight - Weight for perpendicular component (0-1)
 * @param awayWeight - Weight for away component (0-1)
 * @returns Blended escape direction in tempVectors.escapeDir
 */
export function calculateEscapeDirection(
  awayDir: Vector3,
  forward: Vector3,
  perpendicularWeight: number,
  awayWeight: number,
): Vector3 {
  const { localUp, escapeDir } = tempVectors;

  // Calculate perpendicular direction (maximizes angular velocity)
  localUp.set(0, 1, 0);
  escapeDir.crossVectors(awayDir, localUp);

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

  // Blend perpendicular and away directions
  escapeDir
    .multiplyScalar(perpendicularWeight)
    .addScaledVector(awayDir, awayWeight)
    .normalize();

  return escapeDir;
}

/**
 * Accelerate ship toward target speed.
 */
export function accelerateTo(
  physics: Physics,
  targetSpeed: number,
  dt: number,
  accelerationMultiplier = 1,
): void {
  if (physics.currentSpeed < targetSpeed) {
    physics.currentSpeed = Math.min(
      physics.currentSpeed + physics.acceleration * accelerationMultiplier * dt,
      targetSpeed,
    );
  } else if (physics.currentSpeed > targetSpeed) {
    physics.currentSpeed = Math.max(
      physics.currentSpeed - physics.acceleration * dt,
      targetSpeed,
    );
  }
}

/**
 * Decelerate ship to zero.
 */
export function decelerateToZero(physics: Physics, dt: number): void {
  if (physics.currentSpeed > 0) {
    physics.currentSpeed = Math.max(
      physics.currentSpeed - physics.acceleration * dt,
      0,
    );
  }
}

/** Default projectile speed for lead calculation when no weapon found */
export const DEFAULT_PROJECTILE_SPEED = 500;
