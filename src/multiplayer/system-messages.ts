/**
 * System Messages - Generate system messages for multiplayer chat.
 *
 * Provides helpers for creating system messages for equipment changes,
 * store transactions, and other player actions that should be visible
 * in the lobby chat.
 */

import { setLobbyState } from '../campaign/handlers/lobby-actions';
import { getLobbyContext } from '../campaign/handlers/lobby-context';
import { addSystemMessage } from './lobby-state';

/**
 * Add a system message to the lobby chat.
 * Safe to call when not in a lobby (will be a no-op).
 */
export function addLobbySystemMessage(message: string): void {
  const ctx = getLobbyContext();
  if (!ctx) return;

  const newState = addSystemMessage(ctx.lobbyState, message);
  setLobbyState(ctx, newState);
}

/**
 * Get the local player's callsign from the lobby state.
 */
export function getLocalCallsign(): string | null {
  const ctx = getLobbyContext();
  if (!ctx) return null;

  const localPlayer = ctx.lobbyState.players.find(
    (p) => p.playerId === ctx.localPlayerId,
  );
  return localPlayer?.callsign ?? null;
}

/**
 * Add a system message for equipment change.
 */
export function addEquipmentSystemMessage(
  action: 'equipped' | 'unequipped',
  weaponName: string,
): void {
  const callsign = getLocalCallsign();
  if (!callsign) return;

  const message =
    action === 'equipped'
      ? `${callsign} equipped ${weaponName}`
      : `${callsign} unequipped ${weaponName}`;

  addLobbySystemMessage(message);
}

/**
 * Add a system message for store transactions.
 */
export function addTransactionSystemMessage(
  action: 'bought' | 'sold',
  itemName: string,
  quantity?: number,
): void {
  const callsign = getLocalCallsign();
  if (!callsign) return;

  const quantityStr = quantity && quantity > 1 ? ` (×${quantity})` : '';
  const message = `${callsign} ${action} ${itemName}${quantityStr}`;

  addLobbySystemMessage(message);
}

/**
 * Add a system message for scrap conversion.
 */
export function addScrapConversionMessage(shipClass: string): void {
  const callsign = getLocalCallsign();
  if (!callsign) return;

  addLobbySystemMessage(`${callsign} converted scrap to ${shipClass}`);
}

/**
 * Add a system message for resupply.
 */
export function addResupplyMessage(shipName: string, isAll = false): void {
  const callsign = getLocalCallsign();
  if (!callsign) return;

  const message = isAll
    ? `${callsign} resupplied all ships`
    : `${callsign} resupplied ${shipName}`;

  addLobbySystemMessage(message);
}

/**
 * Add a system message for contract acceptance.
 */
export function addContractAcceptedMessage(contractName: string): void {
  const callsign = getLocalCallsign();
  if (!callsign) return;

  addLobbySystemMessage(`${callsign} accepted contract: ${contractName}`);
}

/**
 * Add a system message for sector advancement.
 */
export function addSectorAdvancedMessage(sectorNumber: number): void {
  addLobbySystemMessage(`Squadron advanced to Sector ${sectorNumber}`);
}
