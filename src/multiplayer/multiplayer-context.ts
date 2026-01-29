/**
 * Multiplayer Context - Shared context for UI screens in multiplayer mode.
 *
 * Provides context management (set/get/clear) for the current multiplayer session.
 * For permission checking helpers, see context-permissions.ts.
 *
 * In single-player mode, context is null and all actions are allowed.
 */

import type { Permission } from './protocol/types';

/** Multiplayer context for UI screens */
export interface MultiplayerContext {
  /** Current player's peer ID */
  playerId: string;
  /** Current player's permissions */
  permissions: Permission;
  /** Whether this player is the host */
  isHost: boolean;
  /** ID of ship assigned to this player (null if unassigned) */
  assignedShipId: string | null;
}

/** Module-level context (null in single-player mode) */
let currentContext: MultiplayerContext | null = null;

/**
 * Set the multiplayer context.
 * Call when entering multiplayer lobby/mission.
 */
export function setMultiplayerContext(
  context: MultiplayerContext | null,
): void {
  currentContext = context;
}

/**
 * Get the current multiplayer context.
 * Returns null in single-player mode.
 */
export function getMultiplayerContext(): MultiplayerContext | null {
  return currentContext;
}

/**
 * Clear the multiplayer context.
 * Call when leaving multiplayer session.
 */
export function clearMultiplayerContext(): void {
  currentContext = null;
}

/**
 * Check if currently in multiplayer mode.
 */
export function isMultiplayerMode(): boolean {
  return currentContext !== null;
}
