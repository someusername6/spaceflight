/**
 * Hyperspace Jump Component - Marks an entity in hyperspace transition.
 *
 * When a ship has this component, it's in the process of jumping to hyperspace.
 * The progress goes from 0 to 1 over the duration, with visual effects applied
 * based on the progress. When progress reaches 1, the entity is removed.
 */

import type { Vector3 } from 'three';
import type { ComponentBase } from '../core/types';

/** Default jump animation duration in seconds */
export const DEFAULT_JUMP_DURATION = 1.8;

/** Hyperspace jump component - tracks jump animation state */
export interface HyperspaceJump extends ComponentBase {
  readonly type: 'hyperspaceJump';
  /** Progress from 0 (start) to 1 (complete) */
  progress: number;
  /** Total duration of jump animation in seconds */
  duration: number;
  /** Direction of jump (normalized, in world space) */
  direction: Vector3;
  /** Starting time (for interpolation) */
  startTime: number;
}

/**
 * Create a HyperspaceJump component.
 *
 * @param direction - Direction of the jump (will be normalized)
 * @param duration - Animation duration in seconds (default: 1.8)
 * @param startTime - Game time when jump started (for interpolation)
 */
export function createHyperspaceJump(
  direction: Vector3,
  startTime: number,
  duration = DEFAULT_JUMP_DURATION,
): HyperspaceJump {
  return {
    type: 'hyperspaceJump',
    progress: 0,
    duration,
    direction: direction.clone().normalize(),
    startTime,
  };
}

/** Check if jump animation is complete */
export function isJumpComplete(jump: HyperspaceJump): boolean {
  return jump.progress >= 1;
}

// =============================================================================
// Serialization
// =============================================================================

import {
  deserializeVector3,
  type SerializedVector3,
  serializeVector3,
} from '../core/serialization';

export interface SerializedHyperspaceJump {
  t: 25; // Component type ID
  p: number; // progress
  d: number; // duration
  dr: SerializedVector3; // direction
  st: number; // startTime
}

export function serializeHyperspaceJump(
  c: HyperspaceJump,
): SerializedHyperspaceJump {
  return {
    t: 25,
    p: c.progress,
    d: c.duration,
    dr: serializeVector3(c.direction),
    st: c.startTime,
  };
}

export function deserializeHyperspaceJump(
  s: SerializedHyperspaceJump,
): HyperspaceJump {
  return {
    type: 'hyperspaceJump',
    progress: s.p,
    duration: s.d,
    direction: deserializeVector3(s.dr),
    startTime: s.st,
  };
}
