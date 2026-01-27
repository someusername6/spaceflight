/**
 * Lobby Message Handlers - Process protocol messages for lobby state.
 *
 * Handles incoming messages:
 * - Welcome: Initialize player list (guest receives from host)
 * - PlayerJoinedExt: Add player, show system message
 * - PlayerLeftExt: Remove player, show system message
 * - ReadyState: Update player ready status
 * - ChatMessage: Add to chat log
 *
 * Provides outgoing message creators:
 * - ReadyState: When ready button clicked
 * - ChatMessage: When chat submitted
 */

import {
  addChatMessage,
  addPlayer,
  addSystemMessage,
  type LobbyPlayer,
  type LobbyState,
  removePlayer,
  setPlayerPermissions,
  setPlayerReady,
  setPlayerShip,
} from './lobby-state';
import { DEFAULT_GUEST_PERMISSIONS, HOST_PERMISSIONS } from './permissions';
import type {
  ChatMessageMessage,
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
export function isChatMessageMessage(
  msg: GameMessage,
): msg is ChatMessageMessage {
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
  };
}

/**
 * Create a new LobbyPlayer with default permissions.
 * Used when a guest joins.
 */
export function createGuestLobbyPlayer(
  playerId: string,
  callsign: string,
): LobbyPlayer {
  return {
    playerId,
    callsign,
    shipId: null,
    isReady: false,
    isHost: false,
    ping: 0,
    permissions: DEFAULT_GUEST_PERMISSIONS,
  };
}

// =============================================================================
// Incoming Message Handlers
// =============================================================================

/** Result of processing a message */
export interface MessageHandlerResult {
  state: LobbyState;
  /** System message to display (if any) */
  systemMessage?: string;
}

/**
 * Handle Welcome message (guest receives from host).
 * Initializes player list from the message.
 */
export function handleWelcome(
  state: LobbyState,
  msg: WelcomeMessage,
  hostPeerId: string,
): MessageHandlerResult {
  // Convert players from message
  const players: LobbyPlayer[] = msg.players.map((p) =>
    gamePlayerToLobbyPlayer(p, p.playerId === hostPeerId),
  );

  return {
    state: {
      ...state,
      players,
    },
  };
}

/**
 * Handle PlayerJoinedExt message.
 * Adds player and shows join system message.
 */
export function handlePlayerJoined(
  state: LobbyState,
  msg: PlayerJoinedExtMessage,
): MessageHandlerResult {
  const player = gamePlayerToLobbyPlayer(msg.player, false);
  const newState = addPlayer(state, player);
  const systemMessage = `${msg.player.callsign} joined the lobby`;

  return {
    state: addSystemMessage(newState, systemMessage),
    systemMessage,
  };
}

/**
 * Handle PlayerLeftExt message.
 * Removes player and shows leave system message.
 */
export function handlePlayerLeft(
  state: LobbyState,
  msg: PlayerLeftExtMessage,
): MessageHandlerResult {
  const player = state.players.find((p) => p.playerId === msg.playerId);
  const callsign = player?.callsign ?? 'Unknown player';

  let reasonText: string;
  switch (msg.reason) {
    case 'disconnected':
      reasonText = 'disconnected';
      break;
    case 'kicked':
      reasonText = 'was kicked';
      break;
    default:
      reasonText = 'left the lobby';
  }

  const systemMessage = `${callsign} ${reasonText}`;
  const newState = removePlayer(state, msg.playerId);

  return {
    state: addSystemMessage(newState, systemMessage),
    systemMessage,
  };
}

/**
 * Handle ReadyState message.
 * Updates player ready status and shows system message.
 */
export function handleReadyState(
  state: LobbyState,
  msg: ReadyStateMessage,
): MessageHandlerResult {
  const player = state.players.find((p) => p.playerId === msg.playerId);
  const callsign = player?.callsign ?? 'Unknown player';
  const readyText = msg.ready ? 'is ready' : 'is not ready';
  const systemMessage = `${callsign} ${readyText}`;

  const newState = setPlayerReady(state, msg.playerId, msg.ready);

  return {
    state: addSystemMessage(newState, systemMessage),
    systemMessage,
  };
}

/**
 * Handle ChatMessage message.
 * Adds message to chat log.
 */
export function handleChatMessage(
  state: LobbyState,
  msg: ChatMessageMessage,
): MessageHandlerResult {
  const player = state.players.find((p) => p.playerId === msg.fromPlayerId);
  const callsign = player?.callsign ?? 'Unknown';

  return {
    state: addChatMessage(
      state,
      msg.fromPlayerId,
      callsign,
      msg.text,
      msg.timestamp,
    ),
  };
}

/**
 * Handle PermissionUpdate message.
 * Updates player permissions and shows system message.
 */
export function handlePermissionUpdate(
  state: LobbyState,
  msg: PermissionUpdateMessage,
): MessageHandlerResult {
  const player = state.players.find((p) => p.playerId === msg.playerId);
  if (!player) {
    return { state };
  }

  // Don't update host permissions (they're always full)
  if (player.isHost) {
    return { state };
  }

  const callsign = player.callsign;
  const newState = setPlayerPermissions(state, msg.playerId, msg.permissions);
  const systemMessage = `Host updated ${callsign}'s permissions`;

  return {
    state: addSystemMessage(newState, systemMessage),
    systemMessage,
  };
}

/**
 * Handle ShipAssignment message.
 * Updates player ship assignment and shows system message.
 */
export function handleShipAssignment(
  state: LobbyState,
  msg: ShipAssignmentMessage,
  getShipName?: (shipId: string) => string,
): MessageHandlerResult {
  const player = state.players.find((p) => p.playerId === msg.playerId);
  if (!player) {
    return { state };
  }

  const callsign = player.callsign;
  let newState = state;

  // If assigning to a ship, unassign any other player from that ship first
  if (msg.shipId !== null) {
    const currentOwner = state.players.find((p) => p.shipId === msg.shipId);
    if (currentOwner && currentOwner.playerId !== msg.playerId) {
      newState = setPlayerShip(newState, currentOwner.playerId, null);
    }
  }

  newState = setPlayerShip(newState, msg.playerId, msg.shipId);

  // Build system message
  let systemMessage: string;
  if (msg.shipId === null) {
    systemMessage = `${callsign} unassigned from ship`;
  } else {
    const shipName = getShipName?.(msg.shipId) ?? `Ship ${msg.shipId}`;
    systemMessage = `${callsign} assigned to ${shipName}`;
  }

  return {
    state: addSystemMessage(newState, systemMessage),
    systemMessage,
  };
}

/** Options for processing lobby messages */
export interface ProcessLobbyMessageOptions {
  /** Function to get ship name from ID (for system messages) */
  getShipName?: (shipId: string) => string;
}

/**
 * Process any lobby-related message.
 * Returns updated state and optional system message.
 */
export function processLobbyMessage(
  state: LobbyState,
  msg: GameMessage,
  hostPeerId: string,
  options?: ProcessLobbyMessageOptions,
): MessageHandlerResult | null {
  if (isWelcomeMessage(msg)) {
    return handleWelcome(state, msg, hostPeerId);
  }
  if (isPlayerJoinedExtMessage(msg)) {
    return handlePlayerJoined(state, msg);
  }
  if (isPlayerLeftExtMessage(msg)) {
    return handlePlayerLeft(state, msg);
  }
  if (isReadyStateMessage(msg)) {
    return handleReadyState(state, msg);
  }
  if (isChatMessageMessage(msg)) {
    return handleChatMessage(state, msg);
  }
  if (isPermissionUpdateMessage(msg)) {
    return handlePermissionUpdate(state, msg);
  }
  if (isShipAssignmentMessage(msg)) {
    return handleShipAssignment(state, msg, options?.getShipName);
  }
  return null;
}

// =============================================================================
// Outgoing Message Creators (re-exported from lobby-message-creators.ts)
// =============================================================================

export {
  createChatMessageMessage,
  createPermissionUpdateMessage,
  createReadyStateMessage,
  createShipAssignmentMessage,
} from './lobby-message-creators';
