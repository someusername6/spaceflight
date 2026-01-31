/**
 * Active Game Reference - Stores references to the currently running game.
 *
 * This module provides access to active game state for test utilities.
 * References are set when a mission starts and cleared when it ends.
 */

import type { MissionEndState } from '../campaign/mission/mission-waves';
import type { Game } from '../game';
import type { MultiplayerGameState } from './multiplayer-game-loop';

/** The currently active game (singleplayer) */
let activeGame: Game | null = null;

/** The currently active multiplayer game state */
let activeMultiplayerState: MultiplayerGameState | null = null;

/** The currently active mission end state (for test utilities) */
let activeMissionEndState: MissionEndState | null = null;

/**
 * Set the active game reference.
 * Called when a mission starts.
 */
export function setActiveGame(game: Game | null): void {
  activeGame = game;
}

/**
 * Get the active game reference.
 * Returns null if no game is running.
 */
export function getActiveGame(): Game | null {
  return activeGame;
}

/**
 * Set the active multiplayer game state.
 * Called when a multiplayer mission starts.
 */
export function setActiveMultiplayerState(
  state: MultiplayerGameState | null,
): void {
  activeMultiplayerState = state;
}

/**
 * Get the active multiplayer game state.
 * Returns null if no multiplayer mission is running.
 */
export function getActiveMultiplayerState(): MultiplayerGameState | null {
  return activeMultiplayerState;
}

/**
 * Set the active mission end state.
 * Called when a mission starts.
 */
export function setActiveMissionEndState(state: MissionEndState | null): void {
  activeMissionEndState = state;
}

/**
 * Get the active mission end state.
 * Returns null if no mission is running.
 */
export function getActiveMissionEndState(): MissionEndState | null {
  return activeMissionEndState;
}

/**
 * Clear all active game references.
 * Called when a mission ends.
 */
export function clearActiveGame(): void {
  activeGame = null;
  activeMultiplayerState = null;
  activeMissionEndState = null;
}
