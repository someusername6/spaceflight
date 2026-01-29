/**
 * Action Processing for Multiplayer Campaign.
 *
 * Contains permission validation and action execution logic.
 * Used by CampaignSyncManager to process guest requests.
 */

import {
  assignPilotToShip,
  assignPilotToStoredShip,
  equipPrimary,
  equipSecondary,
  unequipPrimary,
  unequipSecondary,
} from '../campaign/loadout';
import { resupplyAllShipsConstrained } from '../campaign/resupply/resupply-constrained';
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
  BuyAction,
  EquipAction,
  GamePlayerInfo,
  Permission,
  SellAction,
  UnequipAction,
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

      case 'convertScrap':
        newState = convertScrapToShip(state, action.shipClass);
        break;

      case 'resupply': {
        const result = resupplyShipConstrained(state, action.shipId);
        newState = result.state;
        break;
      }

      case 'assignPilot':
        newState = assignPilotToShip(state, action.pilotId, action.shipId);
        break;

      case 'deployStoredShip':
        newState = assignPilotToStoredShip(
          state,
          action.pilotId,
          action.storedShipIndex,
        );
        break;

      case 'resupplyAll': {
        const resupplyAllResult = resupplyAllShipsConstrained(
          state,
          action.commanderId,
        );
        newState = resupplyAllResult.state;
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
  action: BuyAction,
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
  action: SellAction,
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
  action: EquipAction,
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
  action: UnequipAction,
  state: CampaignState,
): CampaignState {
  if (action.category === 'primary') {
    return unequipPrimary(state, action.shipId, action.slotIndex);
  }
  return unequipSecondary(state, action.shipId, action.slotIndex);
}
