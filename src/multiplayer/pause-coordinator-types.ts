/**
 * Pause Coordinator Types - Types and interfaces for multiplayer pause.
 */

import type { LobbyContext } from '../campaign/handlers/lobby-context';
import type { SkillLevel } from '../campaign/types';
import type { Game } from '../game';
import type { MultiplayerGameState } from './multiplayer-game-loop';
import type { PauseReason, PauseState } from './pause-state';
import type { MessageRouter } from './protocol/router';

// =============================================================================
// Callback Types
// =============================================================================

/** Callback when pause is triggered */
export type OnPauseTriggeredCallback = (
  reason: PauseReason,
  initiatedBy: string,
  initiatedByCallsign: string,
) => void;

/** Callback when game resumes */
export type OnResumeCallback = () => void;

/** Callback when pause state changes */
export type OnPauseStateChangeCallback = (state: PauseState) => void;

/** Callback when a player is dropped */
export type OnPlayerDroppedCallback = (
  playerId: string,
  aiSkill: SkillLevel,
) => void;

/** Callback when a guest quits */
export type OnGuestQuitCallback = (playerId: string) => void;

/** Callback when a player disconnects */
export type OnPlayerDisconnectCallback = (playerId: string) => void;

// =============================================================================
// Configuration
// =============================================================================

/** Configuration for pause coordinator */
export interface PauseCoordinatorConfig {
  router: MessageRouter;
  game: Game;
  lobbyContext: LobbyContext;
  /** Optional getter for multiplayer game state. If provided and returns non-null, uses multiplayer pause/resume. */
  getMultiplayerGameState?: () => MultiplayerGameState | null;
  onPauseTriggered?: OnPauseTriggeredCallback;
  onResume?: OnResumeCallback;
  onPauseStateChange?: OnPauseStateChangeCallback;
  onPlayerDropped?: OnPlayerDroppedCallback;
  onGuestQuit?: OnGuestQuitCallback;
  onPlayerDisconnect?: OnPlayerDisconnectCallback;
}

// =============================================================================
// Handle Interface
// =============================================================================

/** Handle for controlling pause coordination */
export interface PauseCoordinatorHandle {
  /** Request to pause the game (any player) */
  requestPause(reason?: PauseReason): void;
  /** Set local player's ready-to-resume state */
  setReadyToResume(ready: boolean): void;
  /** Drop a disconnected player (host only) */
  dropPlayer(playerId: string, aiSkill: SkillLevel): void;
  /** Request to quit the mission (guest only) */
  requestQuit(): void;
  /** Get current pause state (null if not paused) */
  getPauseState(): PauseState | null;
  /** Check if game is currently paused */
  isPaused(): boolean;
  /** Clean up coordinator */
  destroy(): void;
}

// =============================================================================
// Constants
// =============================================================================

export const RESUME_COUNTDOWN_SECONDS = 5;
export const COUNTDOWN_INTERVAL_MS = 1000;

/** Skill level names for wire protocol conversion */
export const SKILL_LEVEL_NAMES: SkillLevel[] = [
  'rookie',
  'regular',
  'veteran',
  'ace',
];

/** Convert numeric skill level from wire protocol to SkillLevel string */
export function numericToSkillLevel(num: number): SkillLevel {
  return SKILL_LEVEL_NAMES[num] ?? 'regular';
}

/** Convert SkillLevel string to numeric for wire protocol */
export function skillLevelToNumeric(skill: SkillLevel): number {
  const index = SKILL_LEVEL_NAMES.indexOf(skill);
  return index >= 0 ? index : 1; // Default to 'regular' (1)
}
