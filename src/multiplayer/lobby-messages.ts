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
  gamePlayerToLobbyPlayer,
  isCallsignUpdateMessage,
  isChatMessage,
  isPermissionUpdateMessage,
  isPlayerJoinedExtMessage,
  isPlayerLeftExtMessage,
  isReadyStateMessage,
  isShipAssignmentMessage,
  isWelcomeMessage,
} from './lobby-message-utils';
import {
  addChatMessage,
  addPlayer,
  addSystemMessage,
  type LobbyPlayer,
  type LobbyState,
  removePlayer,
  setPlayerCallsign,
  setPlayerPermissions,
  setPlayerReady,
  setPlayerShip,
} from './lobby-state';
import type {
  CallsignUpdateMessage,
  ChatMessage,
  GameMessage,
  PermissionUpdateMessage,
  PlayerJoinedExtMessage,
  PlayerLeftExtMessage,
  ReadyStateMessage,
  ShipAssignmentMessage,
  WelcomeMessage,
} from './protocol/messages';

// Re-export from lobby-message-utils for backwards compatibility
export {
  createGuestLobbyPlayer,
  gamePlayerToLobbyPlayer,
  isCallsignUpdateMessage,
  isChatMessage,
  isPermissionUpdateMessage,
  isPlayerJoinedExtMessage,
  isPlayerLeftExtMessage,
  isReadyStateMessage,
  isShipAssignmentMessage,
  isWelcomeMessage,
  lobbyPlayerToGamePlayer,
} from './lobby-message-utils';

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
  msg: ChatMessage,
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

/**
 * Handle CallsignUpdate message.
 * Updates player callsign and shows system message.
 */
export function handleCallsignUpdate(
  state: LobbyState,
  msg: CallsignUpdateMessage,
): MessageHandlerResult {
  const player = state.players.find((p) => p.playerId === msg.playerId);
  if (!player) {
    return { state };
  }

  const oldCallsign = player.callsign;
  const newCallsign = msg.callsign;

  // Don't update if callsign hasn't changed
  if (oldCallsign === newCallsign) {
    return { state };
  }

  const newState = setPlayerCallsign(state, msg.playerId, newCallsign);
  const systemMessage = `${oldCallsign} is now ${newCallsign}`;

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
  if (isChatMessage(msg)) {
    return handleChatMessage(state, msg);
  }
  if (isPermissionUpdateMessage(msg)) {
    return handlePermissionUpdate(state, msg);
  }
  if (isShipAssignmentMessage(msg)) {
    return handleShipAssignment(state, msg, options?.getShipName);
  }
  if (isCallsignUpdateMessage(msg)) {
    return handleCallsignUpdate(state, msg);
  }
  return null;
}

// =============================================================================
// Outgoing Message Creators (re-exported from lobby-message-creators.ts)
// =============================================================================

export {
  createCallsignUpdateMessage,
  createChatMessage,
  createPermissionUpdateMessage,
  createReadyStateMessage,
  createShipAssignmentMessage,
} from './lobby-message-creators';
