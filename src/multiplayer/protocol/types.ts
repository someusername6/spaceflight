/**
 * Message Types - Enums, shared types, and action types for game protocol.
 *
 * These types are used by the message interfaces in messages.ts.
 */

// =============================================================================
// Message Type Enum
// =============================================================================

/** Game message type bytes (0x80-0x93 range, avoids rollback-netcode range) */
export enum GameMessageType {
  Welcome = 0x80,
  PlayerJoinedExt = 0x81,
  PlayerLeftExt = 0x82,
  ChatMessage = 0x83,
  ReadyState = 0x84,
  PermissionUpdate = 0x85,
  ShipAssignment = 0x86,
  CampaignSync = 0x87,
  ActionRequest = 0x88,
  ActionResponse = 0x89,
  ContractAccepted = 0x8a,
  LaunchCountdown = 0x8b,
  LaunchAborted = 0x8c,
  MissionStarted = 0x8d,
  MissionEnded = 0x8e,
  SessionEnded = 0x8f,
  KickNotification = 0x90,
  CallsignAnnounce = 0x91,
}

// =============================================================================
// Shared Types
// =============================================================================

/** Permission levels for ship editing */
export type ShipEditPermission = 'none' | 'own' | 'any';

/** Player permissions in multiplayer */
export interface Permission {
  /** Can edit ship loadouts: 'none' = no editing, 'own' = own ships, 'any' = all */
  shipEdit: ShipEditPermission;
  /** Can buy items from store */
  canBuy: boolean;
  /** Can sell items to store */
  canSell: boolean;
  /** Can convert scrap to credits */
  canConvertScrap: boolean;
}

/** Default permissions for new players */
export const DEFAULT_PERMISSION: Permission = {
  shipEdit: 'own',
  canBuy: true,
  canSell: true,
  canConvertScrap: true,
};

/** Player information in multiplayer session */
export interface GamePlayerInfo {
  /** Peer ID from transport layer */
  playerId: string;
  /** Display name chosen by player */
  callsign: string;
  /** ID of assigned ship (null = observer/unassigned) */
  shipId: string | null;
  /** Ready to launch mission */
  ready: boolean;
  /** Permission flags */
  permissions: Permission;
}

/** Reason for player leaving */
export type LeaveReason = 'disconnected' | 'kicked' | 'left';

// =============================================================================
// Action Request Types
// =============================================================================

/**
 * Buy item from store.
 *
 * @mp-operation buy
 * @mp-actor host | guest
 * @mp-permission canBuy
 * @mp-flow ActionRequest → host validates canBuy → processAction → CampaignSync broadcast
 * @mp-ui Store: Buy button disabled if !canBuy; credits update on success
 * @mp-tested e2e/state-sync-guest-store.mjs:testGuestBuyWithPermission
 * @mp-status implemented
 */
export interface BuyAction {
  type: 'buy';
  itemType: 'ship' | 'primary' | 'secondary' | 'ammo';
  itemId: string;
  quantity: number;
}

/**
 * Sell item to store.
 *
 * @mp-operation sell
 * @mp-actor host | guest
 * @mp-permission canSell
 * @mp-flow ActionRequest → host validates canSell → processAction → CampaignSync broadcast
 * @mp-ui Store: Sell button disabled if !canSell; credits update on success
 * @mp-tested e2e/state-sync-guest-store.mjs:testGuestSellSyncsToHost
 * @mp-status implemented
 */
export interface SellAction {
  type: 'sell';
  itemType: 'ship' | 'primary' | 'secondary' | 'ammo' | 'scrap';
  itemId: string;
  quantity: number;
}

/**
 * Equip weapon to ship.
 *
 * @mp-operation equip
 * @mp-actor host | guest
 * @mp-permission shipEdit ('own' = own ship only, 'any' = all ships, 'none' = denied)
 * @mp-flow ActionRequest → host validates shipEdit + ownership → processAction → CampaignSync broadcast
 * @mp-ui Squadron: Slot click opens picker if shipEdit allows; picker equip button triggers action
 * @mp-tested e2e/loadout-equip.mjs:testGuestEquipSyncsToHost
 * @mp-status implemented
 */
export interface EquipAction {
  type: 'equip';
  shipId: string;
  slotIndex: number;
  /** Index into storedWeapons array */
  storageIndex: number;
  /** Bank size for the weapon (1, 2, or 3) */
  bankSize: number;
  category: 'primary' | 'secondary';
}

/**
 * Unequip weapon from ship.
 *
 * @mp-operation unequip
 * @mp-actor host | guest
 * @mp-permission shipEdit ('own' = own ship only, 'any' = all ships, 'none' = denied)
 * @mp-flow ActionRequest → host validates shipEdit + ownership → processAction → CampaignSync broadcast
 * @mp-ui Squadron: Slot unequip button triggers action; slot becomes empty on sync
 * @mp-tested e2e/loadout-equip.mjs:testHostUnequipSyncsToGuest, testGuestUnequipSyncsToHost
 * @mp-status implemented
 */
export interface UnequipAction {
  type: 'unequip';
  shipId: string;
  slotIndex: number;
  category: 'primary' | 'secondary';
}

/**
 * Convert scrap to credits.
 *
 * @mp-operation convertScrap
 * @mp-actor host | guest
 * @mp-permission canConvertScrap
 * @mp-flow ActionRequest → host validates canConvertScrap → processAction → CampaignSync broadcast
 * @mp-ui Store: Convert button disabled if !canConvertScrap; credits/scrap update on success
 * @mp-tested e2e/store-convert.mjs:testGuestConvertScrapWithPermission, e2e/permission-denied.mjs:testConvertScrapDenied
 * @mp-status implemented
 */
export interface ConvertScrapAction {
  type: 'convertScrap';
  shipClass: string;
  quantity: number;
}

/**
 * Resupply ammo/missiles for a single ship.
 *
 * @mp-operation resupply
 * @mp-actor host | guest
 * @mp-permission shipEdit ('own' = own ship only, 'any' = all ships, 'none' = denied)
 * @mp-flow ActionRequest → host validates shipEdit + ownership → processAction → CampaignSync broadcast
 * @mp-ui Squadron: Resupply button per ship; disappears when ammo full
 * @mp-tested e2e/loadout-resupply.mjs:testGuestResupplySyncsToHost
 * @mp-status implemented
 */
export interface ResupplyAction {
  type: 'resupply';
  shipId: string;
}

/**
 * Assign campaign pilot to a deployed ship.
 *
 * @mp-operation assignPilot
 * @mp-actor host | guest
 * @mp-permission shipEdit ('own' or 'any', not 'none')
 * @mp-flow ActionRequest → host validates shipEdit → processAction → CampaignSync broadcast
 * @mp-ui Squadron: Pilot assignment from roster view
 * @mp-tested unit/test-ship-assignment.mjs:assignPlayerToShip
 * @mp-status implemented
 */
export interface AssignPilotAction {
  type: 'assignPilot';
  pilotId: string;
  shipId: string;
}

/**
 * Deploy pilot with stored ship.
 *
 * @mp-operation deployStoredShip
 * @mp-actor host | guest
 * @mp-permission shipEdit ('own' or 'any', not 'none')
 * @mp-flow ActionRequest → host validates shipEdit → processAction → CampaignSync broadcast
 * @mp-ui Squadron: Deploy button from stored ships
 * @mp-tested none
 * @mp-status implemented
 */
export interface DeployStoredShipAction {
  type: 'deployStoredShip';
  pilotId: string;
  storedShipIndex: number;
}

/**
 * Resupply all ships in the squadron.
 *
 * @mp-operation resupplyAll
 * @mp-actor host | guest
 * @mp-permission shipEdit ('own' or 'any', not 'none')
 * @mp-flow ActionRequest → host validates shipEdit → processAction → CampaignSync broadcast
 * @mp-ui Squadron: "Resupply All" button; disappears when all ships full
 * @mp-tested e2e/loadout-resupply.mjs:testGuestResupplyAllSyncsToHost
 * @mp-status implemented
 */
export interface ResupplyAllAction {
  type: 'resupplyAll';
  commanderId: string;
}

/** Union of all action request types */
export type ActionRequestData =
  | BuyAction
  | SellAction
  | EquipAction
  | UnequipAction
  | ConvertScrapAction
  | ResupplyAction
  | AssignPilotAction
  | DeployStoredShipAction
  | ResupplyAllAction;

// =============================================================================
// Mission Outcome Types
// =============================================================================

/** Mission outcome for results screen */
export interface MissionOutcomeData {
  victory: boolean;
  creditsEarned: number;
  /** Ship IDs that were destroyed */
  shipsLost: string[];
  /** Player ID -> kills count */
  kills: Record<string, number>;
  /** Player ID -> assists count */
  assists: Record<string, number>;
  /** Player ID -> damage dealt */
  damageDealt: Record<string, number>;
}
