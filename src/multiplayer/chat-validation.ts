/**
 * Chat Validation - Rate limiting and message validation for chat.
 *
 * Prevents spam by limiting message frequency and length.
 */

/** Maximum message length in characters */
const MAX_MESSAGE_LENGTH = 200;

/** Minimum time between messages in milliseconds */
const RATE_LIMIT_MS = 1000;

/** Track last message time per player */
const lastMessageTime = new Map<string, number>();

/** Chat validation result */
export interface ChatValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a chat message before sending.
 *
 * Checks:
 * - Message length (max 200 characters)
 * - Rate limiting (1 message per second)
 */
export function validateChatMessage(
  playerId: string,
  text: string,
): ChatValidationResult {
  // Check message length
  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    };
  }

  // Check rate limit
  const now = Date.now();
  const lastTime = lastMessageTime.get(playerId) ?? 0;
  if (now - lastTime < RATE_LIMIT_MS) {
    return {
      valid: false,
      error: 'Please wait before sending another message',
    };
  }

  // Update last message time
  lastMessageTime.set(playerId, now);
  return { valid: true };
}

/**
 * Clear all rate limit tracking.
 * Call when leaving a lobby.
 */
export function clearAllRateLimits(): void {
  lastMessageTime.clear();
}
