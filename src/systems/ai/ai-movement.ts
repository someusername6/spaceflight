/**
 * AI Movement Utilities - Shared movement helpers for AI systems.
 *
 * Extracted to avoid duplication across ai.ts, ai-behaviors.ts, ai-reposition.ts.
 */

import { Quaternion, Vector3 } from 'three';
import type { AIControlled } from '../../components/ai';
import type { AimError } from '../../components/aim-error';
import { applyAimError, updateBeamTracking } from '../../components/aim-error';
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
  localDir: new Vector3(),
  inverseRot: new Quaternion(),
};

const DEG_TO_RAD = Math.PI / 180;

/** Angle threshold for proportional input (radians) - below this, input is proportional */
const PROPORTIONAL_THRESHOLD = 10 * DEG_TO_RAD;

/** Speed threshold for "close enough" - AI coasts when within this of target speed */
const SPEED_COAST_THRESHOLD = 5;

/**
 * Set AI rotation inputs to turn toward a target direction.
 * Uses input-based control that physics system processes through angular velocity.
 *
 * @param ai - AI component to set inputs on
 * @param transform - Ship's transform component
 * @param direction - Target direction (normalized, world space)
 */
export function setRotationInputs(
  ai: AIControlled,
  transform: Transform,
  direction: Vector3,
): void {
  const { localDir, inverseRot } = tempVectors;

  // Transform direction to local space
  inverseRot.copy(transform.rotation).invert();
  localDir.copy(direction).applyQuaternion(inverseRot);

  // In local space, forward is (0, 0, -1)
  // localDir.x > 0 means target is to the right
  // localDir.y > 0 means target is above

  // Calculate yaw angle (rotation around Y axis)
  // atan2(-x, -z) gives angle from forward in XZ plane
  const yawAngle = Math.atan2(-localDir.x, -localDir.z);

  // Calculate pitch angle (rotation around X axis)
  // asin(y) gives elevation angle (clamped to avoid NaN)
  const pitchAngle = Math.asin(Math.max(-1, Math.min(1, localDir.y)));

  // Convert angles to inputs with proportional zone for small angles
  // Positive yaw input = yaw left, negative = yaw right
  // Positive pitch input = pitch up, negative = pitch down
  ai.input.yaw = angleToInput(yawAngle);
  ai.input.pitch = angleToInput(pitchAngle);

  // Roll is not set here - AI doesn't actively roll toward targets
  ai.input.roll = 0;
}

/**
 * Convert angle to input value (-1 to 1).
 * Uses proportional control for small angles, saturated for large.
 */
function angleToInput(angle: number): number {
  if (Math.abs(angle) < PROPORTIONAL_THRESHOLD) {
    // Proportional zone: smooth control for small corrections
    return angle / PROPORTIONAL_THRESHOLD;
  }
  // Saturated: full input for large angles
  return angle > 0 ? 1 : -1;
}

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
 * Sets AI inputs that physics system processes through angular velocity.
 *
 * @param ai - AI component to set inputs on
 * @param transform - Ship's transform component
 * @param direction - Target direction (normalized)
 */
export function turnToward(
  ai: AIControlled,
  transform: Transform,
  direction: Vector3,
): void {
  setRotationInputs(ai, transform, direction);
}

/**
 * Turn toward target with aim error applied for beam-using ships.
 * Beam weapons are fixed-mount, so aim error is applied to ship rotation.
 * Projectile weapons have aim error applied at spawn time instead.
 *
 * For beam ships, uses beamTrackingSpeed to control how fast the ship
 * tracks toward the perceived target. This creates skill differentiation:
 * - Ace (high tracking): quickly locks onto target
 * - Rookie (low tracking): slow lock, hunting behavior
 *
 * @param weapons - Optional pre-fetched weapons (avoids redundant lookup)
 * @param aimError - Optional pre-fetched aim error (avoids redundant lookup)
 * @param dt - Time delta for beam tracking interpolation (default 1/60s)
 */
export function aimToward(
  world: World,
  entity: Entity,
  ai: AIControlled,
  transform: Transform,
  direction: Vector3,
  weapons?: PrimaryWeapons | null,
  aimError?: AimError | null,
  dt = 1 / 60,
): void {
  // Use provided components or fetch them
  const w = weapons ?? getComponent(world, entity, 'primaryWeapons');
  const e = aimError ?? getComponent(world, entity, 'aimError');

  if (w?.hasOnlyBeams && e) {
    // For beam-ONLY ships: apply aim error, then track toward perceived target
    // Uses beamTrackingSpeed for smooth tracking (ace = fast lock, rookie = hunting)
    const perceivedDir = applyAimError(direction, e);
    // Update beam tracking (interpolates currentBeamDirection toward perceivedDir)
    updateBeamTracking(e, perceivedDir, dt);
    // Turn toward the tracked direction (not instant aim)
    turnToward(ai, transform, e.currentBeamDirection);
  } else if (w?.hasBeams && e) {
    // For MIXED weapon ships (beam + projectile): use direct aim error
    // Projectile weapons need proper lead calculation, not beam tracking
    const perceivedDir = applyAimError(direction, e);
    turnToward(ai, transform, perceivedDir);
  } else {
    turnToward(ai, transform, direction);
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
 * Set AI speed inputs to accelerate toward target speed.
 * Physics system will process these through smooth acceleration.
 *
 * @param ai - AI component to set inputs on
 * @param physics - Physics component (for current speed comparison)
 * @param targetSpeed - Target speed to reach
 * @param useAfterburner - Whether to use afterburner (for speeds above maxSpeed)
 */
export function setSpeedInputs(
  ai: AIControlled,
  physics: Physics,
  targetSpeed: number,
  useAfterburner = false,
): void {
  if (physics.currentSpeed < targetSpeed - SPEED_COAST_THRESHOLD) {
    ai.input.accelerate = true;
    ai.input.decelerate = false;
    ai.input.afterburner = useAfterburner && targetSpeed > physics.maxSpeed;
  } else if (physics.currentSpeed > targetSpeed + SPEED_COAST_THRESHOLD) {
    ai.input.accelerate = false;
    ai.input.decelerate = true;
    ai.input.afterburner = false;
  } else {
    // Near target speed - coast
    ai.input.accelerate = false;
    ai.input.decelerate = false;
    ai.input.afterburner = false;
  }
}

/**
 * Set AI speed inputs to decelerate to zero.
 */
export function setDecelerateInputs(ai: AIControlled): void {
  ai.input.accelerate = false;
  ai.input.decelerate = true;
  ai.input.afterburner = false;
}

/** Default projectile speed for lead calculation when no weapon found */
export const DEFAULT_PROJECTILE_SPEED = 500;
