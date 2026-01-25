/**
 * Input Format - Serialization for multiplayer network transport.
 *
 * Wraps existing input encoding from the replay system for binary network
 * transmission. Each input is packed into exactly 4 bytes (u32 bitmask).
 */

import type { InputState } from '../core/types';
import { decodeInput, encodeInput } from '../input/input-encoding';

/**
 * Serialize an InputState to a 4-byte Uint8Array for network transmission.
 *
 * @param state - The input state to serialize
 * @returns A 4-byte array containing the packed input bitmask
 */
export function serializeInput(state: InputState): Uint8Array {
  const bits = encodeInput(state);
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, bits, true); // little-endian
  return data;
}

/**
 * Deserialize a 4-byte Uint8Array back to an InputState.
 *
 * @param data - The 4-byte array containing the packed input bitmask
 * @returns The reconstructed InputState
 */
export function deserializeInput(data: Uint8Array): InputState {
  if (data.length < 4) {
    // Return empty input for malformed data
    return decodeInput(0);
  }
  const bits = new DataView(data.buffer, data.byteOffset).getUint32(0, true);
  return decodeInput(bits);
}

/**
 * Create an empty input as a Uint8Array (all buttons released).
 * Useful for initial/default input states.
 */
export function createEmptyInput(): Uint8Array {
  return new Uint8Array(4); // All zeros = no buttons pressed
}

/**
 * Size of a serialized input in bytes.
 */
export const INPUT_SIZE_BYTES = 4;
