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
  /**
   * True if this is the local player's entity (for multiplayer).
   * In single player, the first playerControlled entity is the local player.
   * In multiplayer, this flag distinguishes which ship the local player controls.
   */
  isLocalPlayer: boolean;
}

/** Creates a PlayerControlled marker component */
export function createPlayerControlled(isLocalPlayer = true): PlayerControlled {
  return {
    type: 'playerControlled',
    input: createInputState(),
    matchSpeed: false,
    prevTargetDistance: 0,
    prevMatchSpeedTarget: undefined,
    isLocalPlayer,
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
  lp?: boolean; // isLocalPlayer (optional for backwards compat, defaults true)
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
  const result: SerializedPlayerControlled = {
    t: 6,
    i: serializeInputState(c.input),
    m: c.matchSpeed,
    pd: c.prevTargetDistance,
    pt: c.prevMatchSpeedTarget ?? null,
  };
  // Only serialize if false (defaults to true for backwards compat)
  if (!c.isLocalPlayer) {
    result.lp = false;
  }
  return result;
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
    isLocalPlayer: s.lp !== false, // Defaults to true for backwards compat
  };
}
