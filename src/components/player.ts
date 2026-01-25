/**
 * Player marker component - identifies the human-controlled entity.
 */

import type { ComponentBase, Entity, InputState } from '../core/types';
import { createInputState } from '../core/types';

export interface PlayerControlled extends ComponentBase {
  readonly type: 'playerControlled';
  input: InputState;
  /** Match speed mode - automatically adjust throttle to maintain distance to target */
  matchSpeed: boolean;
  /** Previous frame's target distance (for calculating closing rate) */
  prevTargetDistance: number;
  /** Previous target entity (to detect target changes) */
  prevMatchSpeedTarget: Entity | undefined;
}

/** Creates a PlayerControlled marker component */
export function createPlayerControlled(): PlayerControlled {
  return {
    type: 'playerControlled',
    input: createInputState(),
    matchSpeed: false,
    prevTargetDistance: 0,
    prevMatchSpeedTarget: undefined,
  };
}

// =============================================================================
// Serialization
// =============================================================================

/** Serialized input state (compact bitmask for 17 booleans) */
export interface SerializedInputState {
  b: number; // Bitmask of all boolean flags
}

/** Serialized player component */
export interface SerializedPlayerControlled {
  t: 6; // Component type ID
  i: SerializedInputState; // input
  m: boolean; // matchSpeed
  pd: number; // prevTargetDistance
  pt: Entity | null; // prevMatchSpeedTarget
}

// Input state field order for bitmask serialization
const INPUT_FIELDS: (keyof InputState)[] = [
  'pitchUp',
  'pitchDown',
  'yawLeft',
  'yawRight',
  'rollLeft',
  'rollRight',
  'accelerate',
  'decelerate',
  'afterburner',
  'firePrimary',
  'fireSecondary',
  'launchDecoy',
  'cyclePrimary',
  'cycleSecondary',
  'cycleTargetNext',
  'cycleTargetPrev',
  'targetNearest',
  'toggleMatchSpeed',
];

function serializeInputState(input: InputState): SerializedInputState {
  let bitmask = 0;
  for (let i = 0; i < INPUT_FIELDS.length; i++) {
    const field = INPUT_FIELDS[i] as keyof InputState;
    if (input[field]) bitmask |= 1 << i;
  }
  return { b: bitmask };
}

function deserializeInputState(s: SerializedInputState): InputState {
  const result = createInputState();
  for (let i = 0; i < INPUT_FIELDS.length; i++) {
    const field = INPUT_FIELDS[i] as keyof InputState;
    (result as unknown as Record<string, boolean>)[field] =
      (s.b & (1 << i)) !== 0;
  }
  return result;
}

export function serializePlayerControlled(
  c: PlayerControlled,
): SerializedPlayerControlled {
  return {
    t: 6,
    i: serializeInputState(c.input),
    m: c.matchSpeed,
    pd: c.prevTargetDistance,
    pt: c.prevMatchSpeedTarget ?? null,
  };
}

export function deserializePlayerControlled(
  s: SerializedPlayerControlled,
): PlayerControlled {
  return {
    type: 'playerControlled',
    input: deserializeInputState(s.i),
    matchSpeed: s.m,
    prevTargetDistance: s.pd,
    prevMatchSpeedTarget: s.pt ?? undefined,
  };
}
