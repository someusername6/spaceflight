/**
 * Message Detection - Identify game messages without full decoding.
 */

import { GameMessageType } from './messages';

// =============================================================================
// Constants
// =============================================================================

/** Derived range of GameMessageType values (auto-updated when enum changes) */
const _gameMessageTypeValues = Object.values(GameMessageType).filter(
  (v): v is number => typeof v === 'number',
);
export const GAME_MSG_MIN = Math.min(..._gameMessageTypeValues);
export const GAME_MSG_MAX = Math.max(..._gameMessageTypeValues);

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Check if a byte array starts with a game message type byte.
 * Used to distinguish game messages from rollback-netcode messages.
 */
export function isGameMessage(data: Uint8Array): boolean {
  const typeByte = data[0];
  if (typeByte === undefined) return false;
  return typeByte >= GAME_MSG_MIN && typeByte <= GAME_MSG_MAX;
}

/**
 * Get the message type from a byte array without decoding the full message.
 */
export function getMessageType(data: Uint8Array): GameMessageType | null {
  if (!isGameMessage(data)) return null;
  return data[0] as GameMessageType;
}
