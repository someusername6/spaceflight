/**
 * Pause State Management - Immutable state for multiplayer mission pause.
 *
 * Provides:
 * - Pause reason tracking
 * - Player ready states for resume
 * - Disconnect/drop status per player
 * - Countdown state
 */

import type { SkillLevel } from '../campaign/types';
import type { ChatEntry } from './lobby-state';

// =============================================================================
// Types
// =============================================================================

/** Reason for pausing the game */
export type PauseReason =
  | 'player-request'
  | 'player-disconnect'
  | 'lag-detected';

/** Connection status of a player during pause */
export type PlayerPauseStatus = 'connected' | 'disconnected' | 'dropped';

/** Player state during pause */
export interface PausePlayer {
  playerId: string;
  callsign: string;
  /** Ready to resume */
  isReady: boolean;
  /** Connection status */
  status: PlayerPauseStatus;
  /** AI skill if dropped (undefined if still connected) */
  droppedAISkill?: SkillLevel;
  /** Whether this player is the host */
  isHost: boolean;
}

/** Pause state during mission */
export interface PauseState {
  /** Why the game was paused */
  reason: PauseReason;
  /** Player ID who initiated the pause */
  initiatedBy: string;
  /** Callsign of player who initiated pause */
  initiatedByCallsign: string;
  /** All players and their states */
  players: PausePlayer[];
  /** Chat messages during pause */
  chatMessages: ChatEntry[];
  /** Countdown seconds (null = not counting down) */
  countdownSeconds: number | null;
  /** Local player's ID */
  localPlayerId: string;
  /** Whether local player is host */
  isHost: boolean;
}

// =============================================================================
// State Creation
// =============================================================================

/** Parameters for creating initial pause state */
export interface PauseStateInit {
  reason: PauseReason;
  initiatedBy: string;
  initiatedByCallsign: string;
  players: PausePlayer[];
  localPlayerId: string;
  isHost: boolean;
}

/** Create initial pause state */
export function createPauseState(init: PauseStateInit): PauseState {
  return {
    reason: init.reason,
    initiatedBy: init.initiatedBy,
    initiatedByCallsign: init.initiatedByCallsign,
    players: init.players,
    chatMessages: [],
    countdownSeconds: null,
    localPlayerId: init.localPlayerId,
    isHost: init.isHost,
  };
}

// =============================================================================
// State Updates
// =============================================================================

/** Set player ready state */
export function setPlayerReady(
  state: PauseState,
  playerId: string,
  ready: boolean,
): PauseState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId ? { ...p, isReady: ready } : p,
    ),
  };
}

/** Set player connection status */
export function setPlayerStatus(
  state: PauseState,
  playerId: string,
  status: PlayerPauseStatus,
): PauseState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId ? { ...p, status } : p,
    ),
  };
}

/** Mark player as dropped with AI skill */
export function dropPlayer(
  state: PauseState,
  playerId: string,
  aiSkill: SkillLevel,
): PauseState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId
        ? { ...p, status: 'dropped', droppedAISkill: aiSkill }
        : p,
    ),
  };
}

/** Set countdown seconds */
export function setCountdown(
  state: PauseState,
  seconds: number | null,
): PauseState {
  return {
    ...state,
    countdownSeconds: seconds,
  };
}

/** Add a chat message */
export function addPauseChatMessage(
  state: PauseState,
  message: ChatEntry,
): PauseState {
  return {
    ...state,
    chatMessages: [...state.chatMessages, message],
  };
}

// =============================================================================
// State Queries
// =============================================================================

/** Check if all connected players are ready */
export function areAllPlayersReady(state: PauseState): boolean {
  const connectedPlayers = state.players.filter(
    (p) => p.status === 'connected',
  );
  return (
    connectedPlayers.length > 0 && connectedPlayers.every((p) => p.isReady)
  );
}

/** Get local player from pause state */
export function getLocalPausePlayer(
  state: PauseState,
): PausePlayer | undefined {
  return state.players.find((p) => p.playerId === state.localPlayerId);
}

/** Get connected player count */
export function getConnectedPlayerCount(state: PauseState): number {
  return state.players.filter((p) => p.status === 'connected').length;
}
