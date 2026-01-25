/**
 * Convoy components - marks entities as escort targets with autopilot behavior.
 */

import type { Vector3 } from 'three';
import type { ComponentBase } from '../core/types';

/**
 * Marks an entity as a convoy ship (escort target or ambush target).
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
  /** For ambush missions: convoy has stopped permanently (isolated from escorts) */
  isStopped: boolean;
  /**
   * Distance threshold for stop behavior (ambush only).
   * Stored on component so convoy-autopilot system can access it.
   * Set during entity creation from AmbushMissionData.convoyStopDistance.
   * Undefined for escort missions (no stop behavior).
   */
  stopDistance?: number;
}

/** Create a ConvoyShip component */
export function createConvoyShip(
  index: number,
  jumpChargeTime: number,
  stopDistance?: number,
): ConvoyShip {
  const component: ConvoyShip = {
    type: 'convoyShip',
    index,
    inEscapeZone: false,
    jumpChargeProgress: 0,
    jumpChargeTime,
    jumpInitiated: false,
    isStopped: false,
  };
  // Only add stopDistance if defined (for ambush missions)
  if (stopDistance !== undefined) {
    component.stopDistance = stopDistance;
  }
  return component;
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

// =============================================================================
// Serialization
// =============================================================================

import {
  deserializeVector3,
  type SerializedVector3,
  serializeVector3,
} from '../core/serialization';

export interface SerializedConvoyShip {
  t: 21; // Component type ID
  i: number; // index
  ez: boolean; // inEscapeZone
  jp: number; // jumpChargeProgress
  jt: number; // jumpChargeTime
  ji: boolean; // jumpInitiated
  is: boolean; // isStopped
  sd?: number; // stopDistance
}

export interface SerializedConvoyAutopilot {
  t: 22; // Component type ID
  d: SerializedVector3; // destination
  er: number; // escapeZoneRadius
  a: boolean; // active
  ip: number; // input.pitch
  iy: number; // input.yaw
  b: number; // bitmask: accelerate(0), decelerate(1)
}

export function serializeConvoyShip(c: ConvoyShip): SerializedConvoyShip {
  const result: SerializedConvoyShip = {
    t: 21,
    i: c.index,
    ez: c.inEscapeZone,
    jp: c.jumpChargeProgress,
    jt: c.jumpChargeTime,
    ji: c.jumpInitiated,
    is: c.isStopped,
  };
  if (c.stopDistance !== undefined) result.sd = c.stopDistance;
  return result;
}

export function deserializeConvoyShip(s: SerializedConvoyShip): ConvoyShip {
  const result: ConvoyShip = {
    type: 'convoyShip',
    index: s.i,
    inEscapeZone: s.ez,
    jumpChargeProgress: s.jp,
    jumpChargeTime: s.jt,
    jumpInitiated: s.ji,
    isStopped: s.is,
  };
  if (s.sd !== undefined) result.stopDistance = s.sd;
  return result;
}

export function serializeConvoyAutopilot(
  c: ConvoyAutopilot,
): SerializedConvoyAutopilot {
  let bitmask = 0;
  if (c.input.accelerate) bitmask |= 1;
  if (c.input.decelerate) bitmask |= 2;
  return {
    t: 22,
    d: serializeVector3(c.destination),
    er: c.escapeZoneRadius,
    a: c.active,
    ip: c.input.pitch,
    iy: c.input.yaw,
    b: bitmask,
  };
}

export function deserializeConvoyAutopilot(
  s: SerializedConvoyAutopilot,
): ConvoyAutopilot {
  return {
    type: 'convoyAutopilot',
    destination: deserializeVector3(s.d),
    escapeZoneRadius: s.er,
    active: s.a,
    input: {
      pitch: s.ip,
      yaw: s.iy,
      accelerate: (s.b & 1) !== 0,
      decelerate: (s.b & 2) !== 0,
    },
  };
}
