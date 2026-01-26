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
  CallsignChangeRequest = 0x92,
  CallsignChanged = 0x93,
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

/** Buy item from store */
export interface BuyAction {
  type: 'buy';
  itemType: 'ship' | 'primary' | 'secondary' | 'ammo';
  itemId: string;
  quantity: number;
}

/** Sell item to store */
export interface SellAction {
  type: 'sell';
  itemType: 'ship' | 'primary' | 'secondary' | 'ammo' | 'scrap';
  itemId: string;
  quantity: number;
}

/** Equip weapon to ship */
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

/** Unequip weapon from ship */
export interface UnequipAction {
  type: 'unequip';
  shipId: string;
  slotIndex: number;
  category: 'primary' | 'secondary';
}

/** Assign player to ship */
export interface AssignShipAction {
  type: 'assignShip';
  playerId: string;
  shipId: string | null;
}

/** Convert scrap to credits */
export interface ConvertScrapAction {
  type: 'convertScrap';
  shipClass: string;
  quantity: number;
}

/** Resupply ammo/missiles */
export interface ResupplyAction {
  type: 'resupply';
  shipId: string;
}

/** Union of all action request types */
export type ActionRequestData =
  | BuyAction
  | SellAction
  | EquipAction
  | UnequipAction
  | AssignShipAction
  | ConvertScrapAction
  | ResupplyAction;

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
