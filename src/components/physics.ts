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
}

/** Creates a Physics component with ship-like defaults */
export function createPhysics(params: {
  maxSpeed?: number;
  acceleration?: number;
  drag?: number;
  turnRate?: number;
  rollRate?: number;
}): Physics {
  return {
    type: 'physics',
    velocity: new Vector3(),
    maxSpeed: params.maxSpeed ?? 250,
    acceleration: params.acceleration ?? 100,
    drag: params.drag ?? 0.5,
    turnRate: params.turnRate ?? 100,
    rollRate: params.rollRate ?? 150,
    currentSpeed: 0,
  };
}
