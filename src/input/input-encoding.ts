/**
 * Input Encoding - Pack/unpack InputState to/from bitmask.
 *
 * Used for replay recording and determinism testing.
 * 18 boolean fields fit in a single 32-bit integer.
 */

import type { InputState } from '../core/types';

/**
 * Bit positions for each input field.
 * Order matches InputState interface for consistency.
 */
const INPUT_BITS = {
  // Movement (bits 0-8)
  pitchUp: 0,
  pitchDown: 1,
  yawLeft: 2,
  yawRight: 3,
  rollLeft: 4,
  rollRight: 5,
  accelerate: 6,
  decelerate: 7,
  afterburner: 8,

  // Combat (bits 9-17)
  firePrimary: 9,
  fireSecondary: 10,
  launchDecoy: 11,
  cyclePrimary: 12,
  cycleSecondary: 13,
  cycleTargetNext: 14,
  cycleTargetPrev: 15,
  targetNearest: 16,
  toggleMatchSpeed: 17,
} as const;

/**
 * Encode an InputState into a 32-bit bitmask.
 * Each boolean maps to a single bit.
 */
export function encodeInput(state: InputState): number {
  let bits = 0;

  // Movement
  if (state.pitchUp) bits |= 1 << INPUT_BITS.pitchUp;
  if (state.pitchDown) bits |= 1 << INPUT_BITS.pitchDown;
  if (state.yawLeft) bits |= 1 << INPUT_BITS.yawLeft;
  if (state.yawRight) bits |= 1 << INPUT_BITS.yawRight;
  if (state.rollLeft) bits |= 1 << INPUT_BITS.rollLeft;
  if (state.rollRight) bits |= 1 << INPUT_BITS.rollRight;
  if (state.accelerate) bits |= 1 << INPUT_BITS.accelerate;
  if (state.decelerate) bits |= 1 << INPUT_BITS.decelerate;
  if (state.afterburner) bits |= 1 << INPUT_BITS.afterburner;

  // Combat
  if (state.firePrimary) bits |= 1 << INPUT_BITS.firePrimary;
  if (state.fireSecondary) bits |= 1 << INPUT_BITS.fireSecondary;
  if (state.launchDecoy) bits |= 1 << INPUT_BITS.launchDecoy;
  if (state.cyclePrimary) bits |= 1 << INPUT_BITS.cyclePrimary;
  if (state.cycleSecondary) bits |= 1 << INPUT_BITS.cycleSecondary;
  if (state.cycleTargetNext) bits |= 1 << INPUT_BITS.cycleTargetNext;
  if (state.cycleTargetPrev) bits |= 1 << INPUT_BITS.cycleTargetPrev;
  if (state.targetNearest) bits |= 1 << INPUT_BITS.targetNearest;
  if (state.toggleMatchSpeed) bits |= 1 << INPUT_BITS.toggleMatchSpeed;

  return bits;
}

/**
 * Decode a 32-bit bitmask back into an InputState.
 */
export function decodeInput(bits: number): InputState {
  return {
    // Movement
    pitchUp: (bits & (1 << INPUT_BITS.pitchUp)) !== 0,
    pitchDown: (bits & (1 << INPUT_BITS.pitchDown)) !== 0,
    yawLeft: (bits & (1 << INPUT_BITS.yawLeft)) !== 0,
    yawRight: (bits & (1 << INPUT_BITS.yawRight)) !== 0,
    rollLeft: (bits & (1 << INPUT_BITS.rollLeft)) !== 0,
    rollRight: (bits & (1 << INPUT_BITS.rollRight)) !== 0,
    accelerate: (bits & (1 << INPUT_BITS.accelerate)) !== 0,
    decelerate: (bits & (1 << INPUT_BITS.decelerate)) !== 0,
    afterburner: (bits & (1 << INPUT_BITS.afterburner)) !== 0,

    // Combat
    firePrimary: (bits & (1 << INPUT_BITS.firePrimary)) !== 0,
    fireSecondary: (bits & (1 << INPUT_BITS.fireSecondary)) !== 0,
    launchDecoy: (bits & (1 << INPUT_BITS.launchDecoy)) !== 0,
    cyclePrimary: (bits & (1 << INPUT_BITS.cyclePrimary)) !== 0,
    cycleSecondary: (bits & (1 << INPUT_BITS.cycleSecondary)) !== 0,
    cycleTargetNext: (bits & (1 << INPUT_BITS.cycleTargetNext)) !== 0,
    cycleTargetPrev: (bits & (1 << INPUT_BITS.cycleTargetPrev)) !== 0,
    targetNearest: (bits & (1 << INPUT_BITS.targetNearest)) !== 0,
    toggleMatchSpeed: (bits & (1 << INPUT_BITS.toggleMatchSpeed)) !== 0,
  };
}

/**
 * Apply decoded input to an existing InputState object (mutating).
 * Useful when you want to update player.input in place.
 */
export function applyDecodedInput(target: InputState, bits: number): void {
  // Movement
  target.pitchUp = (bits & (1 << INPUT_BITS.pitchUp)) !== 0;
  target.pitchDown = (bits & (1 << INPUT_BITS.pitchDown)) !== 0;
  target.yawLeft = (bits & (1 << INPUT_BITS.yawLeft)) !== 0;
  target.yawRight = (bits & (1 << INPUT_BITS.yawRight)) !== 0;
  target.rollLeft = (bits & (1 << INPUT_BITS.rollLeft)) !== 0;
  target.rollRight = (bits & (1 << INPUT_BITS.rollRight)) !== 0;
  target.accelerate = (bits & (1 << INPUT_BITS.accelerate)) !== 0;
  target.decelerate = (bits & (1 << INPUT_BITS.decelerate)) !== 0;
  target.afterburner = (bits & (1 << INPUT_BITS.afterburner)) !== 0;

  // Combat
  target.firePrimary = (bits & (1 << INPUT_BITS.firePrimary)) !== 0;
  target.fireSecondary = (bits & (1 << INPUT_BITS.fireSecondary)) !== 0;
  target.launchDecoy = (bits & (1 << INPUT_BITS.launchDecoy)) !== 0;
  target.cyclePrimary = (bits & (1 << INPUT_BITS.cyclePrimary)) !== 0;
  target.cycleSecondary = (bits & (1 << INPUT_BITS.cycleSecondary)) !== 0;
  target.cycleTargetNext = (bits & (1 << INPUT_BITS.cycleTargetNext)) !== 0;
  target.cycleTargetPrev = (bits & (1 << INPUT_BITS.cycleTargetPrev)) !== 0;
  target.targetNearest = (bits & (1 << INPUT_BITS.targetNearest)) !== 0;
  target.toggleMatchSpeed = (bits & (1 << INPUT_BITS.toggleMatchSpeed)) !== 0;
}

/**
 * Check if two input states are equal.
 */
export function inputStatesEqual(a: InputState, b: InputState): boolean {
  return encodeInput(a) === encodeInput(b);
}

/**
 * Verify encode/decode roundtrip works correctly.
 * Used for testing.
 */
export function verifyEncodingRoundtrip(state: InputState): boolean {
  const encoded = encodeInput(state);
  const decoded = decodeInput(encoded);
  return inputStatesEqual(state, decoded);
}
