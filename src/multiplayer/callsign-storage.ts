/**
 * Callsign Storage - Persists player callsign to localStorage.
 */

const CALLSIGN_KEY = 'spaceflight_callsign';

/** Valid callsign: 2-16 chars, alphanumeric + spaces, no leading/trailing spaces */
const CALLSIGN_MIN_LENGTH = 2;
const CALLSIGN_MAX_LENGTH = 16;
/**
 * Callsign pattern:
 * - For 3+ chars: must start and end with alphanumeric, can have spaces in middle
 * - For 1-2 chars: alphanumeric only (no room for middle spaces)
 */
const CALLSIGN_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9 ]*[a-zA-Z0-9]$|^[a-zA-Z0-9]{1,2}$/;

/** Get stored callsign from localStorage */
export function getStoredCallsign(): string | null {
  try {
    return localStorage.getItem(CALLSIGN_KEY);
  } catch {
    return null;
  }
}

/** Store callsign to localStorage */
export function setStoredCallsign(callsign: string): void {
  try {
    localStorage.setItem(CALLSIGN_KEY, callsign);
  } catch {
    // Silently fail if localStorage unavailable
  }
}

/** Validation result */
export interface CallsignValidation {
  valid: boolean;
  error?: string;
}

/** Validate a callsign */
export function validateCallsign(callsign: string): CallsignValidation {
  const trimmed = callsign.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Callsign is required' };
  }

  if (trimmed.length < CALLSIGN_MIN_LENGTH) {
    return {
      valid: false,
      error: `Callsign must be at least ${CALLSIGN_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > CALLSIGN_MAX_LENGTH) {
    return {
      valid: false,
      error: `Callsign must be at most ${CALLSIGN_MAX_LENGTH} characters`,
    };
  }

  if (!CALLSIGN_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Callsign can only contain letters, numbers, and spaces',
    };
  }

  return { valid: true };
}

/** Player info for conflict checking */
export interface PlayerCallsignInfo {
  playerId: string;
  callsign: string;
}

/**
 * Check if a callsign conflicts with existing players.
 * Comparison is case-insensitive and normalizes whitespace.
 */
export function isCallsignConflict(
  players: PlayerCallsignInfo[],
  newCallsign: string,
  excludePlayerId: string,
): boolean {
  const normalizedNew = newCallsign.trim().toLowerCase();
  return players.some(
    (p) =>
      p.playerId !== excludePlayerId &&
      p.callsign.trim().toLowerCase() === normalizedNew,
  );
}
