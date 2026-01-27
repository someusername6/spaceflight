/**
 * Multiplayer Context - Shared context for UI screens in multiplayer mode.
 *
 * Provides:
 * - Current player permissions
 * - Current player ID
 * - Helper functions for permission checks
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

// =============================================================================
// Permission Check Helpers (UI-friendly)
// =============================================================================

/**
 * Check if the current player can buy items.
 * Returns true in single-player mode.
 */
export function canBuy(): boolean {
  if (!currentContext) return true;
  return currentContext.permissions.canBuy;
}

/**
 * Check if the current player can sell items.
 * Returns true in single-player mode.
 */
export function canSell(): boolean {
  if (!currentContext) return true;
  return currentContext.permissions.canSell;
}

/**
 * Check if the current player can convert scrap.
 * Returns true in single-player mode.
 */
export function canConvertScrap(): boolean {
  if (!currentContext) return true;
  return currentContext.permissions.canConvertScrap;
}

/**
 * Check if the current player can edit a specific ship.
 * Returns true in single-player mode.
 *
 * @param shipPilotId - The pilot ID assigned to the ship (or null if unassigned)
 */
export function canEditShip(shipPilotId: string | null): boolean {
  if (!currentContext) return true;

  const { permissions, playerId } = currentContext;

  switch (permissions.shipEdit) {
    case 'none':
      return false;
    case 'own':
      // Can edit if the ship's pilot is the player pilot for this player
      // Player pilots have ID format "mp-pilot-{playerId}"
      return shipPilotId === `mp-pilot-${playerId}`;
    case 'any':
      return true;
    default:
      return false;
  }
}

/**
 * Check if the current player can edit any ship loadouts.
 * Returns true in single-player mode or if shipEdit is not 'none'.
 */
export function canEditAnyShip(): boolean {
  if (!currentContext) return true;
  return currentContext.permissions.shipEdit !== 'none';
}
