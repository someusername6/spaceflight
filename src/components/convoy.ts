/**
 * Convoy components - marks entities as escort targets with autopilot behavior.
 */

import type { Vector3 } from 'three';
import type { ComponentBase } from '../core/types';

/**
 * Marks an entity as a convoy ship (escort target).
 * Convoy ships are defenseless NPCs that fly toward the escape zone.
 */
export interface ConvoyShip extends ComponentBase {
  readonly type: 'convoyShip';
  /** Unique index within convoy (for tracking/display) */
  index: number;
  /** Whether this ship has reached the escape zone */
  inEscapeZone: boolean;
  /** Progress of individual jump charge (0 to 1) - starts charging when in zone */
  jumpChargeProgress: number;
  /** Time required to complete jump charge (seconds) */
  jumpChargeTime: number;
  /** Whether this ship has started its hyperspace jump */
  jumpInitiated: boolean;
}

/** Create a ConvoyShip component */
export function createConvoyShip(
  index: number,
  jumpChargeTime: number,
): ConvoyShip {
  return {
    type: 'convoyShip',
    index,
    inEscapeZone: false,
    jumpChargeProgress: 0,
    jumpChargeTime,
    jumpInitiated: false,
  };
}

/** Autopilot control inputs (similar to AIInput but simpler) */
export interface ConvoyAutopilotInput {
  pitch: number;
  yaw: number;
  accelerate: boolean;
  decelerate: boolean;
}

/**
 * Autopilot for convoy ships - simple movement toward destination.
 * No combat logic, just steering toward the escape zone.
 */
export interface ConvoyAutopilot extends ComponentBase {
  readonly type: 'convoyAutopilot';
  /** Target destination (escape zone position) */
  destination: Vector3;
  /** Escape zone radius - ships brake when entering this radius */
  escapeZoneRadius: number;
  /** Whether autopilot is active */
  active: boolean;
  /** Control inputs set by autopilot system, read by physics */
  input: ConvoyAutopilotInput;
}

/** Create a ConvoyAutopilot component */
export function createConvoyAutopilot(
  destination: Vector3,
  escapeZoneRadius: number,
): ConvoyAutopilot {
  return {
    type: 'convoyAutopilot',
    destination: destination.clone(),
    escapeZoneRadius,
    active: true,
    input: {
      pitch: 0,
      yaw: 0,
      accelerate: true,
      decelerate: false,
    },
  };
}
