/**
 * Action Processing for Multiplayer Campaign.
 *
 * Contains permission validation and action execution logic.
 * Used by CampaignSyncManager to process guest requests.
 */

import {
  equipPrimary,
  equipSecondary,
  unequipPrimary,
  unequipSecondary,
} from '../campaign/loadout';
import { resupplyShipConstrained } from '../campaign/resupply/resupply-ship';
import {
  buyPrimaryWeapon,
  buySecondaryWeapon,
  buyShip,
  convertScrapToShip,
  sellPrimaryWeapon,
  sellScrap,
  sellSecondaryWeapon,
  sellShip,
} from '../campaign/store/store';
import { buyAmmo, sellAmmo } from '../campaign/store/store-ammo';
import type { CampaignState } from '../campaign/types';
import type {
  ActionRequestData,
  GamePlayerInfo,
  Permission,
} from './protocol/messages';

// =============================================================================
// Types
// =============================================================================

/** Result of processing an action request */
export interface ActionResult {
  success: boolean;
  error?: string;
  /** Updated state if success (undefined if failed) */
  newState?: CampaignState;
}

// =============================================================================
// Permission Validation
// =============================================================================

/**
 * Check if a player has permission to perform an action.
 * Returns null if allowed, or an error message if denied.
 */
export function validateActionPermission(
  action: ActionRequestData,
  playerId: string,
  permissions: Permission,
  players: Map<string, GamePlayerInfo>,
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
      if (permissions.shipEdit === 'none') {
        return 'You do not have permission to edit ship loadouts';
      }
      if (permissions.shipEdit === 'own') {
        // Check if player owns the ship
        const playerInfo = players.get(playerId);
        if (!playerInfo || playerInfo.shipId !== action.shipId) {
          return 'You can only edit your own ship';
        }
      }
      // 'any' permission allows editing any ship
      break;
    }

    case 'assignShip':
      // Players can only assign themselves to ships.
      // Ship assignment updates GamePlayerInfo (handled by CampaignSyncManager),
      // not CampaignState, so no additional permission check is needed here.
      if (action.playerId !== playerId) {
        return 'You can only assign ships to yourself';
      }
      break;

    case 'convertScrap':
      if (!permissions.canConvertScrap) {
        return 'You do not have permission to convert scrap';
      }
      break;

    case 'resupply': {
      // Check ship edit permission for resupply
      if (permissions.shipEdit === 'none') {
        return 'You do not have permission to resupply ships';
      }
      if (permissions.shipEdit === 'own') {
        const playerInfo = players.get(playerId);
        if (!playerInfo || playerInfo.shipId !== action.shipId) {
          return 'You can only resupply your own ship';
        }
      }
      break;
    }
  }

  return null; // No permission error
}

// =============================================================================
// Action Processing
// =============================================================================

/**
 * Process an action request and return the result.
 *
 * NOTE: This does NOT validate permissions - call validateActionPermission first.
 */
export function processAction(
  action: ActionRequestData,
  state: CampaignState,
): ActionResult {
  let newState: CampaignState;

  try {
    switch (action.type) {
      case 'buy':
        newState = processBuyAction(action, state);
        break;

      case 'sell':
        newState = processSellAction(action, state);
        break;

      case 'equip':
        newState = processEquipAction(action, state);
        break;

      case 'unequip':
        newState = processUnequipAction(action, state);
        break;

      case 'assignShip':
        // Ship assignment updates GamePlayerInfo, not CampaignState.
        // The caller (CampaignSyncManager) handles player info separately.
        return { success: true, newState: state };

      case 'convertScrap':
        newState = convertScrapToShip(state, action.shipClass);
        break;

      case 'resupply': {
        const result = resupplyShipConstrained(state, action.shipId);
        newState = result.state;
        break;
      }

      default: {
        const exhaustive: never = action;
        return { success: false, error: `Unknown action type: ${exhaustive}` };
      }
    }

    // Check if state actually changed (action was valid)
    if (newState === state) {
      return { success: false, error: 'Action could not be applied' };
    }

    return { success: true, newState };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Individual Action Processors
// =============================================================================

function processBuyAction(
  action: { type: 'buy'; itemType: string; itemId: string; quantity: number },
  state: CampaignState,
): CampaignState {
  switch (action.itemType) {
    case 'ship':
      return buyShip(state, action.itemId);
    case 'primary':
      return buyPrimaryWeapon(state, action.itemId);
    case 'secondary':
      return buySecondaryWeapon(state, action.itemId, action.quantity);
    case 'ammo':
      return buyAmmo(state, action.itemId, action.quantity);
    default:
      return state;
  }
}

function processSellAction(
  action: { type: 'sell'; itemType: string; itemId: string; quantity: number },
  state: CampaignState,
): CampaignState {
  // itemId is the storage index for most items
  const storageIndex = Number.parseInt(action.itemId, 10);

  switch (action.itemType) {
    case 'ship':
      return sellShip(state, storageIndex);
    case 'primary':
      return sellPrimaryWeapon(state, storageIndex);
    case 'secondary':
      return sellSecondaryWeapon(state, storageIndex, action.quantity);
    case 'ammo':
      // For ammo, itemId is the weapon type
      return sellAmmo(state, action.itemId, action.quantity);
    case 'scrap':
      // For scrap, itemId is the ship class
      return sellScrap(state, action.itemId, action.quantity);
    default:
      return state;
  }
}

function processEquipAction(
  action: {
    type: 'equip';
    shipId: string;
    slotIndex: number;
    storageIndex: number;
    bankSize: number;
    category: 'primary' | 'secondary';
  },
  state: CampaignState,
): CampaignState {
  // Validate storage index
  if (
    action.storageIndex < 0 ||
    action.storageIndex >= state.storedWeapons.length
  ) {
    return state;
  }

  if (action.category === 'primary') {
    return equipPrimary(
      state,
      action.shipId,
      action.storageIndex,
      action.slotIndex,
      action.bankSize,
    );
  }
  return equipSecondary(
    state,
    action.shipId,
    action.storageIndex,
    action.slotIndex,
    action.bankSize,
  );
}

function processUnequipAction(
  action: {
    type: 'unequip';
    shipId: string;
    slotIndex: number;
    category: 'primary' | 'secondary';
  },
  state: CampaignState,
): CampaignState {
  if (action.category === 'primary') {
    return unequipPrimary(state, action.shipId, action.slotIndex);
  }
  return unequipSecondary(state, action.shipId, action.slotIndex);
}
