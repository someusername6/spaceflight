/**
 * Connection Error Handling - Maps errors to user-friendly error types.
 */

import { SignalingError } from './signaling-client';
import type { ConnectionError } from './types';

/**
 * Convert an unknown error to a ConnectionError.
 */
export function toConnectionError(error: unknown): ConnectionError {
  if (error instanceof SignalingError) {
    return {
      code: mapSignalingErrorCode(error.code),
      message: error.message,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return { code: 'mesh_timeout', message: error.message };
    }
    return { code: 'network_error', message: error.message };
  }

  return { code: 'network_error', message: String(error) };
}

/**
 * Map signaling error codes to connection error codes.
 */
function mapSignalingErrorCode(code: string): ConnectionError['code'] {
  switch (code) {
    case 'invalid_room':
      return 'invalid_room';
    case 'room_full':
      return 'room_full';
    case 'game_in_progress':
      return 'game_in_progress';
    case 'version_mismatch':
      return 'version_mismatch';
    case 'callsign_kicked':
      return 'callsign_kicked';
    default:
      return 'signaling_error';
  }
}
