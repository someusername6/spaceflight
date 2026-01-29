/**
 * Context Permission Helpers - UI-friendly permission checks.
 *
 * These functions check permissions against the current multiplayer context.
 * They return true in single-player mode (when no context is set).
 */

import { getMultiplayerContext } from './multiplayer-context';

/**
 * Check if the current player can buy items.
 * Returns true in single-player mode.
 */
export function canBuy(): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;
  return context.permissions.canBuy;
}

/**
 * Check if the current player can sell items.
 * Returns true in single-player mode.
 */
export function canSell(): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;
  return context.permissions.canSell;
}

/**
 * Check if the current player can convert scrap.
 * Returns true in single-player mode.
 */
export function canConvertScrap(): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;
  return context.permissions.canConvertScrap;
}

/**
 * Check if the current player can edit a specific ship.
 * Returns true in single-player mode.
 *
 * @param shipId - The ID of the ship to check
 */
export function canEditShip(shipId: string | null): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;

  const { permissions, assignedShipId } = context;

  switch (permissions.shipEdit) {
    case 'none':
      return false;
    case 'own':
      // Can edit only if this ship is assigned to the current player
      return shipId !== null && shipId === assignedShipId;
    case 'any':
      return true;
    default: {
      // Exhaustive check - will error if new shipEdit types are added
      permissions.shipEdit satisfies never;
      return false;
    }
  }
}

/**
 * Check if the current player can edit any ship loadouts.
 * Returns true in single-player mode or if shipEdit is not 'none'.
 */
export function canEditAnyShip(): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;
  return context.permissions.shipEdit !== 'none';
}

/**
 * Check if the current player is the host.
 * Returns true in single-player mode (no multiplayer context).
 */
export function isHost(): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;
  return context.isHost;
}
