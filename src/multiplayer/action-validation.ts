/**
 * Action Data Validation for Multiplayer Campaign.
 *
 * Validates that incoming action request data has the expected shape
 * and contains valid values before processing.
 */

import type {
  ActionRequestData,
  GamePlayerInfo,
  Permission,
} from './protocol/messages';

// =============================================================================
// Permission Validation
// =============================================================================

/**
 * Validate ship edit permission for a specific ship.
 * Used by equip, unequip, and resupply actions.
 */
function validateShipEditPermission(
  playerId: string,
  shipId: string,
  permissions: Permission,
  players: Map<string, GamePlayerInfo>,
): { allowed: boolean; reason?: string } {
  if (permissions.shipEdit === 'none') {
    return {
      allowed: false,
      reason: 'You do not have permission to edit ship loadouts',
    };
  }
  if (permissions.shipEdit === 'own') {
    const playerInfo = players.get(playerId);
    if (!playerInfo || playerInfo.shipId !== shipId) {
      return { allowed: false, reason: 'You can only edit your own ship' };
    }
  }
  return { allowed: true };
}

/**
 * Check if a player has permission to perform an action.
 * Returns null if allowed, or an error message if denied.
 */
export function validateActionPermission(
  action: ActionRequestData,
  playerId: string,
  permissions: Permission,
  players: Map<string, GamePlayerInfo>,
  hostPlayerId: string,
): string | null {
  switch (action.type) {
    case 'buy':
      if (!permissions.canBuy) {
        return 'You do not have permission to buy items';
      }
      break;

    case 'sell':
      if (!permissions.canSell) {
        return 'You do not have permission to sell items';
      }
      break;

    case 'equip':
    case 'unequip': {
      const result = validateShipEditPermission(
        playerId,
        action.shipId,
        permissions,
        players,
      );
      if (!result.allowed) {
        return result.reason ?? 'Ship edit permission denied';
      }
      break;
    }

    case 'convertScrap':
      if (!permissions.canConvertScrap) {
        return 'You do not have permission to convert scrap';
      }
      break;

    case 'resupply': {
      const result = validateShipEditPermission(
        playerId,
        action.shipId,
        permissions,
        players,
      );
      if (!result.allowed) {
        return result.reason ?? 'Ship edit permission denied';
      }
      break;
    }

    case 'assignPilot':
    case 'deployStoredShip':
      if (permissions.shipEdit === 'none') {
        return 'You do not have permission to assign pilots';
      }
      break;

    case 'resupplyAll':
      if (permissions.shipEdit === 'none') {
        return 'You do not have permission to resupply ships';
      }
      break;

    case 'dismissPilot':
      if (playerId !== hostPlayerId) return 'Only the host can dismiss pilots';
      break;

    case 'spendXP':
      if (playerId !== hostPlayerId) return 'Only the host can spend XP';
      break;
  }

  return null; // No permission error
}

// =============================================================================
// Action Data Validation
// =============================================================================

/** Known action types for validation */
const KNOWN_ACTION_TYPES = new Set([
  'buy',
  'sell',
  'equip',
  'unequip',
  'convertScrap',
  'resupply',
  'assignPilot',
  'deployStoredShip',
  'resupplyAll',
  'dismissPilot',
  'spendXP',
]);

/** Valid weapon categories */
const VALID_CATEGORIES = new Set(['primary', 'secondary']);

/** Valid item types for buy actions */
const BUY_ITEM_TYPES = new Set(['ship', 'primary', 'secondary', 'ammo']);

/** Valid item types for sell actions */
const SELL_ITEM_TYPES = new Set([
  'ship',
  'primary',
  'secondary',
  'ammo',
  'scrap',
]);

/** Validate a string ID field: non-empty string, max 100 chars */
function validateStringId(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
    return `Invalid ${fieldName}`;
  }
  return null;
}

/**
 * Validate that action data has the expected shape.
 * Returns null if valid, or an error message if malformed.
 */
export function validateActionData(action: ActionRequestData): string | null {
  if (!action || typeof action !== 'object') return 'Invalid action data';
  if (!KNOWN_ACTION_TYPES.has(action.type))
    return `Unknown action type: ${action.type}`;

  // Validate numeric fields are non-negative integers where present
  if (
    'quantity' in action &&
    (typeof action.quantity !== 'number' ||
      action.quantity < 0 ||
      !Number.isInteger(action.quantity))
  ) {
    return 'Invalid quantity';
  }
  if (
    'bankSize' in action &&
    (typeof action.bankSize !== 'number' ||
      action.bankSize < 0 ||
      !Number.isInteger(action.bankSize))
  ) {
    return 'Invalid bankSize';
  }
  if (
    'storageIndex' in action &&
    (typeof action.storageIndex !== 'number' ||
      action.storageIndex < 0 ||
      !Number.isInteger(action.storageIndex))
  ) {
    return 'Invalid storageIndex';
  }
  if (
    'slotIndex' in action &&
    (typeof action.slotIndex !== 'number' ||
      action.slotIndex < 0 ||
      !Number.isInteger(action.slotIndex))
  ) {
    return 'Invalid slotIndex';
  }
  if (
    'storedShipIndex' in action &&
    (typeof action.storedShipIndex !== 'number' ||
      action.storedShipIndex < 0 ||
      !Number.isInteger(action.storedShipIndex))
  ) {
    return 'Invalid storedShipIndex';
  }

  // Validate category field (equip/unequip)
  if ('category' in action && !VALID_CATEGORIES.has(action.category)) {
    return 'Invalid category';
  }

  // Validate itemType field (buy/sell)
  if ('itemType' in action) {
    const validSet = action.type === 'buy' ? BUY_ITEM_TYPES : SELL_ITEM_TYPES;
    if (!validSet.has(action.itemType)) return 'Invalid itemType';
  }

  // Validate string ID fields present on specific action types
  if ('itemId' in action) {
    const err = validateStringId(action.itemId, 'itemId');
    if (err) return err;
  }
  if ('shipId' in action) {
    const err = validateStringId(action.shipId, 'shipId');
    if (err) return err;
  }
  if ('pilotId' in action) {
    const err = validateStringId(action.pilotId, 'pilotId');
    if (err) return err;
  }
  if ('shipClass' in action) {
    const err = validateStringId(action.shipClass, 'shipClass');
    if (err) return err;
  }
  if ('commanderId' in action) {
    const err = validateStringId(action.commanderId, 'commanderId');
    if (err) return err;
  }

  return null;
}
