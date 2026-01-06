/**
 * Physics component - velocity, speed limits, and movement parameters.
 */

import { Vector3 } from 'three';
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
  };
}

/** Initial spawn speed for all ships (m/s) */
export const INITIAL_SPAWN_SPEED = 5;

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
