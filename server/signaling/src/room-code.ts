/**
 * Room code generation.
 *
 * Uses a character set that avoids confusing characters (0/O, 1/I/L).
 */

/** Characters used for room codes (no 0/O, 1/I/L) */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Length of room codes */
const CODE_LENGTH = 8;

/**
 * Generate a random room code.
 * Uses crypto.getRandomValues for secure randomness.
 */
export function generateRoomCode(): string {
  const array = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(array);

  let code = '';
  for (const byte of array) {
    code += CODE_CHARS[byte % CODE_CHARS.length];
  }

  return code;
}

/**
 * Validate a room code format.
 */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) {
    return false;
  }

  for (const char of code) {
    if (!CODE_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}
