/**
 * Aim Error component - tracks AI aiming inaccuracy.
 *
 * AI ships have imperfect aim that drifts slowly over time.
 * This makes combat more dynamic by giving players a chance to evade.
 */

import * as THREE from 'three';
import { type PRNGState, random, randomRange } from '../core/prng';
import type { ComponentBase } from '../core/types';

export interface AimError extends ComponentBase {
  readonly type: 'aimError';
  /** Current aim offset in radians (pitch, yaw) */
  offset: THREE.Vector2;
  /** Maximum aim error in radians */
  maxError: number;
  /** How fast aim drifts (radians per second) */
  driftSpeed: number;
  /** Current drift direction */
  driftDirection: THREE.Vector2;
  /** Time until drift direction changes */
  driftTimer: number;
}

/** Creates an AimError component with default values */
export function createAimError(
  prng: PRNGState,
  maxError = 0.05, // ~3 degrees
  driftSpeed = 0.02, // ~1 degree per second
): AimError {
  return {
    type: 'aimError',
    offset: new THREE.Vector2(0, 0),
    maxError,
    driftSpeed,
    driftDirection: randomDirection(prng),
    driftTimer: randomDriftTime(prng),
  };
}

/** Get a random normalized direction for drift */
function randomDirection(prng: PRNGState): THREE.Vector2 {
  const angle = random(prng) * Math.PI * 2;
  return new THREE.Vector2(Math.cos(angle), Math.sin(angle));
}

/** Get random time until next drift direction change */
function randomDriftTime(prng: PRNGState): number {
  return randomRange(prng, 0.5, 2.0); // 0.5-2 seconds
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
    error.driftDirection = randomDirection(prng);
    error.driftTimer = randomDriftTime(prng);
  }

  // Apply drift
  error.offset.x += error.driftDirection.x * error.driftSpeed * dt;
  error.offset.y += error.driftDirection.y * error.driftSpeed * dt;

  // Clamp to max error
  const len = error.offset.length();
  if (len > error.maxError) {
    error.offset.multiplyScalar(error.maxError / len);
  }
}

/** Apply aim error to a direction vector */
export function applyAimError(
  direction: THREE.Vector3,
  error: AimError,
): THREE.Vector3 {
  const result = direction.clone();

  // Create rotation from error offset
  const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    error.offset.x,
  );
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    error.offset.y,
  );

  result.applyQuaternion(pitchQuat).applyQuaternion(yawQuat);
  return result.normalize();
}
