/**
 * Physics component - velocity, speed limits, and movement parameters.
 */

import { Quaternion, Vector3 } from 'three';
import {
  deserializeQuaternion,
  deserializeVector3,
  type SerializedQuaternion,
  type SerializedVector3,
  serializeQuaternion,
  serializeVector3,
} from '../core/serialization';
import type { ComponentBase } from '../core/types';

export interface Physics extends ComponentBase {
  readonly type: 'physics';
  velocity: Vector3;
  maxSpeed: number;
  acceleration: number;
  drag: number; // Deceleration when not accelerating (0-1 per second)
  turnRate: number; // Degrees per second for pitch/yaw
  rollRate: number; // Degrees per second for roll
  currentSpeed: number; // Current target speed (0 to maxSpeed)
  afterburnerMultiplier: number; // Speed multiplier when afterburning (e.g., 1.5)
  afterburnerHeatRate: number; // Heat generated per second while afterburning
  isAfterburning: boolean; // Currently using afterburner
  afterburnerLocked: boolean; // Locked out due to overheating (hysteresis)
  // Rotational inertia (smooth turning)
  angularVelocity: Vector3; // Current angular velocity (deg/sec): x=pitch, y=yaw, z=roll
  angularAcceleration: number; // How fast rotation spins up/down (deg/sec²)
  // Previous tick state for render interpolation
  prevPosition: Vector3;
  prevRotation: Quaternion;
  prevVelocity: Vector3;
}

/** Creates a Physics component with ship-like defaults */
export function createPhysics(params: {
  maxSpeed?: number;
  acceleration?: number;
  drag?: number;
  turnRate?: number;
  rollRate?: number;
  afterburnerMultiplier?: number;
  afterburnerHeatRate?: number;
  angularAcceleration?: number;
  initialSpeed?: number;
}): Physics {
  return {
    type: 'physics',
    velocity: new Vector3(),
    maxSpeed: params.maxSpeed ?? 250,
    acceleration: params.acceleration ?? 100,
    drag: params.drag ?? 0.5,
    turnRate: params.turnRate ?? 100,
    rollRate: params.rollRate ?? 150,
    currentSpeed: params.initialSpeed ?? 0,
    afterburnerMultiplier: params.afterburnerMultiplier ?? 1.5,
    afterburnerHeatRate: params.afterburnerHeatRate ?? 50,
    isAfterburning: false,
    afterburnerLocked: false,
    angularVelocity: new Vector3(),
    angularAcceleration: params.angularAcceleration ?? 800, // Reaches full turn in ~0.125s
    // Initialize prev to zero - will be set properly on first physics tick
    prevPosition: new Vector3(),
    prevRotation: new Quaternion(),
    prevVelocity: new Vector3(),
  };
}

/** Initial spawn speed for all ships (m/s) */
export const INITIAL_SPAWN_SPEED = 50;

/** Set initial velocity based on transform rotation and speed */
export function setInitialVelocity(
  physics: Physics,
  rotation: import('three').Quaternion,
  speed: number,
): void {
  // Forward direction is -Z in local space
  const forward = new Vector3(0, 0, -1).applyQuaternion(rotation);
  physics.velocity.copy(forward).multiplyScalar(speed);
  physics.currentSpeed = speed;
}

// =============================================================================
// Serialization
// =============================================================================

export interface SerializedPhysics {
  t: 1; // Component type ID
  v: SerializedVector3; // velocity
  ms: number; // maxSpeed
  ac: number; // acceleration
  dr: number; // drag
  tr: number; // turnRate
  rr: number; // rollRate
  cs: number; // currentSpeed
  am: number; // afterburnerMultiplier
  ah: number; // afterburnerHeatRate
  ia: boolean; // isAfterburning
  al: boolean; // afterburnerLocked
  av: SerializedVector3; // angularVelocity
  aa: number; // angularAcceleration
  pp: SerializedVector3; // prevPosition
  pr: SerializedQuaternion; // prevRotation
  pv: SerializedVector3; // prevVelocity
}

export function serializePhysics(c: Physics): SerializedPhysics {
  return {
    t: 1,
    v: serializeVector3(c.velocity),
    ms: c.maxSpeed,
    ac: c.acceleration,
    dr: c.drag,
    tr: c.turnRate,
    rr: c.rollRate,
    cs: c.currentSpeed,
    am: c.afterburnerMultiplier,
    ah: c.afterburnerHeatRate,
    ia: c.isAfterburning,
    al: c.afterburnerLocked,
    av: serializeVector3(c.angularVelocity),
    aa: c.angularAcceleration,
    pp: serializeVector3(c.prevPosition),
    pr: serializeQuaternion(c.prevRotation),
    pv: serializeVector3(c.prevVelocity),
  };
}

export function deserializePhysics(s: SerializedPhysics): Physics {
  return {
    type: 'physics',
    velocity: deserializeVector3(s.v),
    maxSpeed: s.ms,
    acceleration: s.ac,
    drag: s.dr,
    turnRate: s.tr,
    rollRate: s.rr,
    currentSpeed: s.cs,
    afterburnerMultiplier: s.am,
    afterburnerHeatRate: s.ah,
    isAfterburning: s.ia,
    afterburnerLocked: s.al,
    angularVelocity: deserializeVector3(s.av),
    angularAcceleration: s.aa,
    prevPosition: deserializeVector3(s.pp),
    prevRotation: deserializeQuaternion(s.pr),
    prevVelocity: deserializeVector3(s.pv),
  };
}
