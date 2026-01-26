/**
 * Lobby State Management - Immutable state for multiplayer lobby.
 *
 * Provides:
 * - Player list with ready states, ping, and host indicator
 * - Chat message log with system messages
 * - State update functions (immutable pattern)
 */

// =============================================================================
// Types
// =============================================================================

/** Player in the lobby */
export interface LobbyPlayer {
  playerId: string;
  callsign: string;
  /** Assigned ship ID (null = spectator/unassigned) */
  shipId: number | null;
  isReady: boolean;
  isHost: boolean;
  /** Ping in milliseconds */
  ping: number;
}

/** Chat entry type */
export type ChatEntryType = 'chat' | 'system';

/** Chat message entry */
export interface ChatEntry {
  id: number;
  type: ChatEntryType;
  /** Player ID (null for system messages) */
  fromPlayerId: string | null;
  /** Callsign (null for system messages) */
  fromCallsign: string | null;
  text: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
}

/** Lobby state */
export interface LobbyState {
  roomCode: string;
  localPlayerId: string;
  isHost: boolean;
  players: LobbyPlayer[];
  chatMessages: ChatEntry[];
  errorMessage: string | null;
}

// =============================================================================
// State Creation
// =============================================================================

/** Initialization parameters for lobby state */
export interface LobbyStateInit {
  roomCode: string;
  localPlayerId: string;
  isHost: boolean;
  initialPlayers?: LobbyPlayer[];
}

/** Create initial lobby state */
export function createLobbyState(init: LobbyStateInit): LobbyState {
  // Reset message ID counter for new lobby session
  nextMessageId = 1;

  return {
    roomCode: init.roomCode,
    localPlayerId: init.localPlayerId,
    isHost: init.isHost,
    players: init.initialPlayers ?? [],
    chatMessages: [],
    errorMessage: null,
  };
}

// =============================================================================
// Player Management
// =============================================================================

/** Add a player to the lobby */
export function addPlayer(state: LobbyState, player: LobbyPlayer): LobbyState {
  // Don't add if already exists
  if (state.players.some((p) => p.playerId === player.playerId)) {
    return state;
  }

  return {
    ...state,
    players: [...state.players, player],
  };
}

/** Remove a player from the lobby */
export function removePlayer(state: LobbyState, playerId: string): LobbyState {
  return {
    ...state,
    players: state.players.filter((p) => p.playerId !== playerId),
  };
}

/** Update a player's ready status */
export function setPlayerReady(
  state: LobbyState,
  playerId: string,
  ready: boolean,
): LobbyState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId ? { ...p, isReady: ready } : p,
    ),
  };
}

/** Update a player's ping */
export function setPlayerPing(
  state: LobbyState,
  playerId: string,
  ping: number,
): LobbyState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId ? { ...p, ping } : p,
    ),
  };
}

/** Update a player's ship assignment */
export function setPlayerShip(
  state: LobbyState,
  playerId: string,
  shipId: number | null,
): LobbyState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId ? { ...p, shipId } : p,
    ),
  };
}

/** Get a player by ID */
export function getPlayer(
  state: LobbyState,
  playerId: string,
): LobbyPlayer | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

/** Get the local player */
export function getLocalPlayer(state: LobbyState): LobbyPlayer | undefined {
  return getPlayer(state, state.localPlayerId);
}

// =============================================================================
// Chat Management
// =============================================================================

/** Auto-incrementing message ID */
let nextMessageId = 1;

/** Add a chat message */
export function addChatMessage(
  state: LobbyState,
  fromPlayerId: string,
  fromCallsign: string,
  text: string,
  timestamp: number,
): LobbyState {
  const entry: ChatEntry = {
    id: nextMessageId++,
    type: 'chat',
    fromPlayerId,
    fromCallsign,
    text,
    timestamp,
  };

  return {
    ...state,
    chatMessages: [...state.chatMessages, entry],
  };
}

/** Add a system message */
export function addSystemMessage(state: LobbyState, text: string): LobbyState {
  const entry: ChatEntry = {
    id: nextMessageId++,
    type: 'system',
    fromPlayerId: null,
    fromCallsign: null,
    text,
    timestamp: Date.now(),
  };

  return {
    ...state,
    chatMessages: [...state.chatMessages, entry],
  };
}

// =============================================================================
// Error Management
// =============================================================================

/** Set an error message */
export function setErrorMessage(
  state: LobbyState,
  message: string | null,
): LobbyState {
  return {
    ...state,
    errorMessage: message,
  };
}

/** Clear the error message */
export function clearErrorMessage(state: LobbyState): LobbyState {
  return setErrorMessage(state, null);
}
