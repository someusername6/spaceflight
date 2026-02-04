/**
 * Lobby Message Utils - Type guards and conversion helpers for lobby messages.
 *
 * Type guards for checking message types and helpers for converting between
 * GamePlayerInfo and LobbyPlayer formats.
 */

import type { LobbyPlayer } from './lobby-state';
import { DEFAULT_GUEST_PERMISSIONS, HOST_PERMISSIONS } from './permissions';
import type {
  CallsignUpdateMessage,
  ChatMessage,
  GameMessage,
  GamePlayerInfo,
  PermissionUpdateMessage,
  PlayerJoinedExtMessage,
  PlayerLeftExtMessage,
  ReadyStateMessage,
  ShipAssignmentMessage,
  WelcomeMessage,
} from './protocol/messages';
import { GameMessageType } from './protocol/types';

// =============================================================================
// Message Type Guards
// =============================================================================

/** Check if message is Welcome */
export function isWelcomeMessage(msg: GameMessage): msg is WelcomeMessage {
  return msg.type === GameMessageType.Welcome;
}

/** Check if message is PlayerJoinedExt */
export function isPlayerJoinedExtMessage(
  msg: GameMessage,
): msg is PlayerJoinedExtMessage {
  return msg.type === GameMessageType.PlayerJoinedExt;
}

/** Check if message is PlayerLeftExt */
export function isPlayerLeftExtMessage(
  msg: GameMessage,
): msg is PlayerLeftExtMessage {
  return msg.type === GameMessageType.PlayerLeftExt;
}

/** Check if message is ReadyState */
export function isReadyStateMessage(
  msg: GameMessage,
): msg is ReadyStateMessage {
  return msg.type === GameMessageType.ReadyState;
}

/** Check if message is ChatMessage */
export function isChatMessage(msg: GameMessage): msg is ChatMessage {
  return msg.type === GameMessageType.ChatMessage;
}

/** Check if message is PermissionUpdate */
export function isPermissionUpdateMessage(
  msg: GameMessage,
): msg is PermissionUpdateMessage {
  return msg.type === GameMessageType.PermissionUpdate;
}

/** Check if message is ShipAssignment */
export function isShipAssignmentMessage(
  msg: GameMessage,
): msg is ShipAssignmentMessage {
  return msg.type === GameMessageType.ShipAssignment;
}

/** Check if message is CallsignUpdate */
export function isCallsignUpdateMessage(
  msg: GameMessage,
): msg is CallsignUpdateMessage {
  return msg.type === GameMessageType.CallsignUpdate;
}

// =============================================================================
// Conversion Helpers
// =============================================================================

/** Convert GamePlayerInfo to LobbyPlayer */
export function gamePlayerToLobbyPlayer(
  player: GamePlayerInfo,
  isHost: boolean,
): LobbyPlayer {
  return {
    playerId: player.playerId,
    callsign: player.callsign,
    shipId: player.shipId,
    isReady: player.ready,
    isHost,
    ping: 0,
    // Host always has full permissions, guests use their assigned permissions
    // Fallback to defaults for older messages that may not have permissions
    permissions: isHost
      ? HOST_PERMISSIONS
      : (player.permissions ?? DEFAULT_GUEST_PERMISSIONS),
    autoaimDegrees: player.autoaimDegrees,
  };
}

/** Convert LobbyPlayer to GamePlayerInfo */
export function lobbyPlayerToGamePlayer(player: LobbyPlayer): GamePlayerInfo {
  return {
    playerId: player.playerId,
    callsign: player.callsign,
    shipId: player.shipId,
    ready: player.isReady,
    // Host always has full permissions, guests use their stored permissions
    permissions: player.isHost ? HOST_PERMISSIONS : player.permissions,
    autoaimDegrees: player.autoaimDegrees,
  };
}

/**
 * Create a new LobbyPlayer with default permissions.
 * Used when a guest joins.
 */
export function createGuestLobbyPlayer(
  playerId: string,
  callsign: string,
  autoaimDegrees = 2.5,
): LobbyPlayer {
  return {
    playerId,
    callsign,
    shipId: null,
    isReady: false,
    isHost: false,
    ping: 0,
    permissions: DEFAULT_GUEST_PERMISSIONS,
    autoaimDegrees,
  };
}

/** Create an AutoaimUpdate message */
export function createAutoaimUpdateMessage(
  playerId: string,
  autoaimDegrees: number,
): import('./protocol/messages').AutoaimUpdateMessage {
  return {
    type: GameMessageType.AutoaimUpdate,
    playerId,
    autoaimDegrees,
  };
}
