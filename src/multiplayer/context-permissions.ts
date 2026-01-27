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
 * @param shipPilotId - The pilot ID assigned to the ship (or null if unassigned)
 */
export function canEditShip(shipPilotId: string | null): boolean {
  const context = getMultiplayerContext();
  if (!context) return true;

  const { permissions, playerId } = context;

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
  const context = getMultiplayerContext();
  if (!context) return true;
  return context.permissions.shipEdit !== 'none';
}
