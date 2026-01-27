/**
 * Lobby Message Creators - Create outgoing protocol messages.
 *
 * Extracted from lobby-messages.ts to keep file under 400 lines.
 */

import type {
  ChatMessageMessage,
  PermissionUpdateMessage,
  ReadyStateMessage,
  ShipAssignmentMessage,
} from './protocol/messages';
import { GameMessageType, type Permission } from './protocol/types';

/** Create a ReadyState message */
export function createReadyStateMessage(
  playerId: string,
  ready: boolean,
): ReadyStateMessage {
  return {
    type: GameMessageType.ReadyState,
    playerId,
    ready,
  };
}

/** Create a ChatMessage message */
export function createChatMessageMessage(
  fromPlayerId: string,
  text: string,
): ChatMessageMessage {
  return {
    type: GameMessageType.ChatMessage,
    fromPlayerId,
    text,
    timestamp: Date.now(),
  };
}

/** Create a PermissionUpdate message (host only) */
export function createPermissionUpdateMessage(
  playerId: string,
  permissions: Permission,
): PermissionUpdateMessage {
  return {
    type: GameMessageType.PermissionUpdate,
    playerId,
    permissions,
  };
}

/** Create a ShipAssignment message (host only) */
export function createShipAssignmentMessage(
  playerId: string,
  shipId: string | null,
): ShipAssignmentMessage {
  return {
    type: GameMessageType.ShipAssignment,
    playerId,
    shipId,
  };
}
