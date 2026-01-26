/**
 * Room Code Utilities - Validation and formatting for multiplayer room codes.
 */

/** Valid room code: 8 uppercase alphanumeric characters */
const ROOM_CODE_LENGTH = 8;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{8}$/;

/** Validation result */
export interface RoomCodeValidation {
  valid: boolean;
  error?: string;
}

/** Validate a room code */
export function validateRoomCode(code: string): RoomCodeValidation {
  const normalized = normalizeRoomCode(code);

  if (normalized.length === 0) {
    return { valid: false, error: 'Room code is required' };
  }

  if (normalized.length !== ROOM_CODE_LENGTH) {
    return {
      valid: false,
      error: `Room code must be ${ROOM_CODE_LENGTH} characters`,
    };
  }

  if (!ROOM_CODE_PATTERN.test(normalized)) {
    return {
      valid: false,
      error: 'Room code can only contain letters and numbers',
    };
  }

  return { valid: true };
}

/** Normalize room code: uppercase, strip all non-alphanumeric */
export function normalizeRoomCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Format room code for display: "ABCD 1234" */
export function formatRoomCode(code: string): string {
  const normalized = normalizeRoomCode(code).slice(0, ROOM_CODE_LENGTH);
  if (normalized.length > 4) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
  }
  return normalized;
}

/** Room code length constant for external use */
export const ROOM_CODE_LENGTH_VALUE = ROOM_CODE_LENGTH;
