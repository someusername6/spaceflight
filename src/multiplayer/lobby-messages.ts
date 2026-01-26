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
  setPlayerReady,
} from './lobby-state';
import type {
  ChatMessageMessage,
  GameMessage,
  GamePlayerInfo,
  PlayerJoinedExtMessage,
  PlayerLeftExtMessage,
  ReadyStateMessage,
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
    shipId: player.shipId !== null ? parseInt(player.shipId, 10) : null,
    isReady: player.ready,
    isHost,
    ping: 0,
  };
}

/** Convert LobbyPlayer to GamePlayerInfo */
export function lobbyPlayerToGamePlayer(player: LobbyPlayer): GamePlayerInfo {
  return {
    playerId: player.playerId,
    callsign: player.callsign,
    shipId: player.shipId !== null ? String(player.shipId) : null,
    ready: player.isReady,
    permissions: {
      shipEdit: player.isHost ? 'any' : 'own',
      canBuy: true,
      canSell: true,
      canConvertScrap: true,
    },
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
 * Process any lobby-related message.
 * Returns updated state and optional system message.
 */
export function processLobbyMessage(
  state: LobbyState,
  msg: GameMessage,
  hostPeerId: string,
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
  return null;
}

// =============================================================================
// Outgoing Message Creators
// =============================================================================

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
