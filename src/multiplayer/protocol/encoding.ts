/**
 * Binary Encoding/Decoding for Game Protocol Messages.
 *
 * This is a barrel file that re-exports from the split modules:
 * - encode.ts - Message encoding (encodeMessage)
 * - decode.ts - Message decoding (decodeMessage, isGameMessage, getMessageType)
 * - buffer-utils.ts - Low-level buffer utilities
 */

export { decodeMessage, getMessageType, isGameMessage } from './decode';
export { encodeMessage } from './encode';
