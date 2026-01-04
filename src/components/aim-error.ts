/**
 * Aim Error component - tracks AI aiming inaccuracy.
 *
 * AI ships have imperfect aim that drifts slowly over time.
 * This makes combat more dynamic by giving players a chance to evade.
 */

import * as THREE from 'three';
import { type PRNGState, random, randomRange } from '../core/prng';
import type { ComponentBase } from '../core/types';
import type { AIProfile } from '../data/ai-profiles';

// Reusable objects for applyAimError (avoid per-call allocations)
const tempResult = new THREE.Vector3();
const pitchAxis = new THREE.Vector3(1, 0, 0);
const yawAxis = new THREE.Vector3(0, 1, 0);
const pitchQuat = new THREE.Quaternion();
const yawQuat = new THREE.Quaternion();

export interface AimError extends ComponentBase {
  readonly type: 'aimError';
  /** Current aim offset in radians (pitch, yaw) */
  offset: THREE.Vector2;
  /** Base maximum aim error in radians (from AI profile) */
  maxError: number;
  /**
   * Effective maximum aim error including angular velocity contribution.
   * Updated each frame: maxError + (angularFactor * targetAngularVelocity)
   */
  effectiveMaxError: number;
  /** Multiplier for angular velocity contribution (from AI profile) */
  angularFactor: number;
  /** How fast aim drifts (radians per second) */
  driftSpeed: number;
  /** Current drift direction */
  driftDirection: THREE.Vector2;
  /** Time until drift direction changes */
  driftTimer: number;
}

/** Create a random normalized direction Vector2 (for initialization only) */
function createRandomDirection(prng: PRNGState): THREE.Vector2 {
  const angle = random(prng) * Math.PI * 2;
  return new THREE.Vector2(Math.cos(angle), Math.sin(angle));
}

/** Set a random normalized direction for drift (updates vector in place, no allocation) */
function setRandomDirection(target: THREE.Vector2, prng: PRNGState): void {
  const angle = random(prng) * Math.PI * 2;
  target.set(Math.cos(angle), Math.sin(angle));
}

/** Creates an AimError component from AI profile or explicit values */
export function createAimError(
  prng: PRNGState,
  profileOrMaxError?: AIProfile | number,
  driftSpeed?: number,
): AimError {
  // Support both profile-based and explicit value creation
  let maxError: number;
  let drift: number;
  let angularFactor: number;

  if (typeof profileOrMaxError === 'object') {
    // AIProfile provided
    maxError = profileOrMaxError.aimErrorBase;
    drift = profileOrMaxError.aimErrorDriftSpeed;
    angularFactor = profileOrMaxError.aimErrorAngularFactor;
  } else {
    // Explicit values (backwards compatible)
    maxError = profileOrMaxError ?? 0.05;
    drift = driftSpeed ?? 0.02;
    angularFactor = 0.5; // Default moderate angular sensitivity
  }

  return {
    type: 'aimError',
    offset: new THREE.Vector2(0, 0),
    maxError,
    effectiveMaxError: maxError, // Initially same as base
    angularFactor,
    driftSpeed: drift,
    driftDirection: createRandomDirection(prng),
    driftTimer: randomDriftTime(prng),
  };
}

/** Get random time until next drift direction change */
function randomDriftTime(prng: PRNGState): number {
  return randomRange(prng, 0.5, 2.0); // 0.5-2 seconds
}

/**
 * Update effective max error based on target angular velocity.
 *
 * Angular velocity = perpendicular_speed / distance (in radians/second).
 * A target moving perpendicular to the shooter's aim at 100 m/s at 500m range
 * has angular velocity = 100/500 = 0.2 rad/s.
 *
 * @param error - The aim error component to update
 * @param targetAngularVelocity - Target's angular velocity in rad/s
 */
export function updateEffectiveMaxError(
  error: AimError,
  targetAngularVelocity: number,
): void {
  // Effective error = base + (angular factor * angular velocity)
  // Clamp angular contribution to prevent extreme values
  const angularContribution = Math.min(
    error.angularFactor * targetAngularVelocity,
    0.3, // Cap at ~17 degrees additional error
  );
  error.effectiveMaxError = error.maxError + angularContribution;
}

/** Update aim error drift */
export function updateAimError(
  error: AimError,
  prng: PRNGState,
  dt: number,
): void {
  // Update drift timer
  error.driftTimer -= dt;
  if (error.driftTimer <= 0) {
    setRandomDirection(error.driftDirection, prng);
    error.driftTimer = randomDriftTime(prng);
  }

  // Apply drift
  error.offset.x += error.driftDirection.x * error.driftSpeed * dt;
  error.offset.y += error.driftDirection.y * error.driftSpeed * dt;

  // Clamp to effective max error (includes angular velocity contribution)
  const len = error.offset.length();
  if (len > error.effectiveMaxError) {
    error.offset.multiplyScalar(error.effectiveMaxError / len);
  }
}

/** Apply aim error to a direction vector (returns reusable vector - clone if storing) */
export function applyAimError(
  direction: THREE.Vector3,
  error: AimError,
): THREE.Vector3 {
  tempResult.copy(direction);

  // Create rotation from error offset using reusable quaternions
  pitchQuat.setFromAxisAngle(pitchAxis, error.offset.x);
  yawQuat.setFromAxisAngle(yawAxis, error.offset.y);

  tempResult.applyQuaternion(pitchQuat).applyQuaternion(yawQuat);
  return tempResult.normalize();
}
