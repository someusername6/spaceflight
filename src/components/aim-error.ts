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
  /** Current target angular velocity in rad/s (updated by aimErrorSystem) */
  currentAngularVelocity: number;
  /**
   * Beam tracking speed in radians per second.
   * Controls how fast beam aim interpolates toward target direction.
   * Higher = faster lock, lower = hunting/overshoot behavior.
   * Ace: ~4.0, Rookie: ~0.8
   */
  beamTrackingSpeed: number;
  /**
   * Current beam aim direction (interpolated toward target).
   * Only used for beam weapons - provides smooth tracking behavior.
   */
  currentBeamDirection: THREE.Vector3;
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
  let beamTrackingSpeed: number;

  if (typeof profileOrMaxError === 'object') {
    // AIProfile provided
    maxError = profileOrMaxError.aimErrorBase;
    drift = profileOrMaxError.aimErrorDriftSpeed;
    angularFactor = profileOrMaxError.aimErrorAngularFactor;
    beamTrackingSpeed = profileOrMaxError.beamTrackingSpeed;
  } else {
    // Explicit values (backwards compatible)
    maxError = profileOrMaxError ?? 0.05;
    drift = driftSpeed ?? 0.02;
    angularFactor = 0.5; // Default moderate angular sensitivity
    beamTrackingSpeed = 1.5; // Default moderate tracking
  }

  // Start with random offset within max error (not 0) so skill matters from frame 1
  const startAngle = random(prng) * Math.PI * 2;
  const startMagnitude = random(prng) * maxError;
  const initialOffset = new THREE.Vector2(
    Math.cos(startAngle) * startMagnitude,
    Math.sin(startAngle) * startMagnitude,
  );

  return {
    type: 'aimError',
    offset: initialOffset,
    maxError,
    effectiveMaxError: maxError, // Initially same as base
    angularFactor,
    driftSpeed: drift,
    driftDirection: createRandomDirection(prng),
    driftTimer: randomDriftTime(prng),
    currentAngularVelocity: 0,
    beamTrackingSpeed,
    // Initialize beam direction to forward (-Z), will be updated on first aim
    currentBeamDirection: new THREE.Vector3(0, 0, -1),
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
  // Store raw angular velocity for other systems (e.g., pursueTarget)
  error.currentAngularVelocity = targetAngularVelocity;
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

/**
 * Update beam tracking direction with interpolation.
 * Moves currentBeamDirection toward targetDirection at beamTrackingSpeed.
 *
 * This creates skill differentiation for beam weapons:
 * - High tracking speed (ace): quickly locks onto target, minimal hunting
 * - Low tracking speed (rookie): slow lock, overshoots, hunts around target
 *
 * @param error - The aim error component to update
 * @param targetDirection - Direction to track toward (with aim error applied)
 * @param dt - Time delta in seconds
 */
export function updateBeamTracking(
  error: AimError,
  targetDirection: THREE.Vector3,
  dt: number,
): void {
  // Calculate angle between current and target direction
  const dot = Math.max(
    -1,
    Math.min(1, error.currentBeamDirection.dot(targetDirection)),
  );
  const currentAngle = Math.acos(dot);

  if (currentAngle < 0.001) {
    // Already aligned, just copy target
    error.currentBeamDirection.copy(targetDirection);
    return;
  }

  // Calculate max angle we can move this frame
  const maxAngle = error.beamTrackingSpeed * dt;

  if (maxAngle >= currentAngle) {
    // Can reach target this frame
    error.currentBeamDirection.copy(targetDirection);
  } else {
    // Interpolate toward target at tracking speed
    // Use slerp-like interpolation: lerp amount based on angle ratio
    const t = maxAngle / currentAngle;
    error.currentBeamDirection.lerp(targetDirection, t).normalize();
  }
}

// =============================================================================
// Serialization
// =============================================================================

import {
  deserializeVector2,
  deserializeVector3,
  type SerializedVector2,
  type SerializedVector3,
  serializeVector2,
  serializeVector3,
} from '../core/serialization';

export interface SerializedAimError {
  t: 9; // Component type ID
  o: SerializedVector2; // offset
  me: number; // maxError
  em: number; // effectiveMaxError
  af: number; // angularFactor
  ds: number; // driftSpeed
  dd: SerializedVector2; // driftDirection
  dt: number; // driftTimer
  ca: number; // currentAngularVelocity
  bt: number; // beamTrackingSpeed
  cb: SerializedVector3; // currentBeamDirection
}

export function serializeAimError(c: AimError): SerializedAimError {
  return {
    t: 9,
    o: serializeVector2(c.offset),
    me: c.maxError,
    em: c.effectiveMaxError,
    af: c.angularFactor,
    ds: c.driftSpeed,
    dd: serializeVector2(c.driftDirection),
    dt: c.driftTimer,
    ca: c.currentAngularVelocity,
    bt: c.beamTrackingSpeed,
    cb: serializeVector3(c.currentBeamDirection),
  };
}

export function deserializeAimError(s: SerializedAimError): AimError {
  return {
    type: 'aimError',
    offset: deserializeVector2(s.o),
    maxError: s.me,
    effectiveMaxError: s.em,
    angularFactor: s.af,
    driftSpeed: s.ds,
    driftDirection: deserializeVector2(s.dd),
    driftTimer: s.dt,
    currentAngularVelocity: s.ca,
    beamTrackingSpeed: s.bt,
    currentBeamDirection: deserializeVector3(s.cb),
  };
}
