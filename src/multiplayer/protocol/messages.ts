/**
 * Game Protocol Messages - Message interfaces for multiplayer communication.
 *
 * These messages use byte range 0x80-0x93 to avoid conflicts with
 * rollback-netcode's internal messages (0x00-0x7F).
 *
 * Message direction:
 * - Host → Guest/All: Only sent by session host
 * - Guest → Host: Only sent by guests to host
 * - Any → All: Can be sent by any player and broadcast
 */

import type { CampaignState } from '../../campaign/types';
import {
  type ActionRequestData,
  GameMessageType,
  type GamePlayerInfo,
  type LeaveReason,
  type MissionOutcomeData,
  type Permission,
} from './types';

// Re-export all types from types.ts for convenience
export * from './types';

// =============================================================================
// Message Interfaces
// =============================================================================

/**
 * Welcome - Host → Guest
 * Sent after mesh forms to provide initial state
 */
export interface WelcomeMessage {
  type: GameMessageType.Welcome;
  /** Assigned player ID (same as peer ID) */
  playerId: string;
  /** Current campaign state */
  campaignState: CampaignState;
  /** All players in session (including self) */
  players: GamePlayerInfo[];
}

/**
 * PlayerJoinedExt - Host → All
 * Announces new player with callsign
 */
export interface PlayerJoinedExtMessage {
  type: GameMessageType.PlayerJoinedExt;
  player: GamePlayerInfo;
}

/**
 * PlayerLeftExt - Host → All
 * Announces player departure with reason
 */
export interface PlayerLeftExtMessage {
  type: GameMessageType.PlayerLeftExt;
  playerId: string;
  reason: LeaveReason;
}

/**
 * ChatMessage - Any → All
 * Text chat between players
 */
export interface ChatMessageMessage {
  type: GameMessageType.ChatMessage;
  fromPlayerId: string;
  text: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
}

/**
 * ReadyState - Any → All
 * Player ready status change
 */
export interface ReadyStateMessage {
  type: GameMessageType.ReadyState;
  playerId: string;
  ready: boolean;
}

/**
 * PermissionUpdate - Host → All
 * Permission change for a player
 */
export interface PermissionUpdateMessage {
  type: GameMessageType.PermissionUpdate;
  playerId: string;
  permissions: Permission;
}

/**
 * ShipAssignment - Host → All
 * Player-to-ship mapping update
 */
export interface ShipAssignmentMessage {
  type: GameMessageType.ShipAssignment;
  playerId: string;
  shipId: string | null;
}

/**
 * CampaignSync - Host → Guests
 * Full campaign state synchronization
 */
export interface CampaignSyncMessage {
  type: GameMessageType.CampaignSync;
  campaignState: CampaignState;
}

/**
 * ActionRequest - Guest → Host
 * Request to perform a campaign action
 */
export interface ActionRequestMessage {
  type: GameMessageType.ActionRequest;
  /** Request ID for matching response */
  requestId: number;
  action: ActionRequestData;
}

/**
 * ActionResponse - Host → Guest
 * Response to action request
 */
export interface ActionResponseMessage {
  type: GameMessageType.ActionResponse;
  requestId: number;
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * ContractAccepted - Host → All
 * Contract selected for next mission
 */
export interface ContractAcceptedMessage {
  type: GameMessageType.ContractAccepted;
  contractId: string;
}

/**
 * LaunchCountdown - Host → All
 * Mission launch countdown tick
 */
export interface LaunchCountdownMessage {
  type: GameMessageType.LaunchCountdown;
  /** Seconds remaining (0 = launch) */
  secondsRemaining: number;
}

/**
 * LaunchAborted - Host → All
 * Mission launch cancelled
 */
export interface LaunchAbortedMessage {
  type: GameMessageType.LaunchAborted;
  /** Reason for abort (e.g., "Player not ready", "Contract cancelled") */
  reason: string;
}

/**
 * MissionStarted - Host → All
 * Mission beginning with seed for determinism
 */
export interface MissionStartedMessage {
  type: GameMessageType.MissionStarted;
  contractId: string;
  /** PRNG seed for deterministic simulation */
  seed: number;
}

/**
 * MissionEnded - Host → All
 * Mission complete with outcome
 */
export interface MissionEndedMessage {
  type: GameMessageType.MissionEnded;
  outcome: MissionOutcomeData;
}

/**
 * SessionEnded - Host → All
 * Multiplayer session terminating
 */
export interface SessionEndedMessage {
  type: GameMessageType.SessionEnded;
  /** Reason for ending (e.g., "Host left", "Campaign over") */
  reason: string;
}

/**
 * KickNotification - Host → Kicked
 * Notify player they are being kicked
 */
export interface KickNotificationMessage {
  type: GameMessageType.KickNotification;
  /** Optional reason for kick */
  reason?: string;
}

/**
 * CallsignAnnounce - New peer → Host
 * New player announces their callsign after mesh forms
 */
export interface CallsignAnnounceMessage {
  type: GameMessageType.CallsignAnnounce;
  callsign: string;
}

/**
 * CallsignChangeRequest - Any → Host
 * Request to change callsign
 */
export interface CallsignChangeRequestMessage {
  type: GameMessageType.CallsignChangeRequest;
  newCallsign: string;
}

/**
 * CallsignChanged - Host → All
 * Broadcast callsign change
 */
export interface CallsignChangedMessage {
  type: GameMessageType.CallsignChanged;
  playerId: string;
  oldCallsign: string;
  newCallsign: string;
}

// =============================================================================
// Union Type
// =============================================================================

/** Union of all game message types */
export type GameMessage =
  | WelcomeMessage
  | PlayerJoinedExtMessage
  | PlayerLeftExtMessage
  | ChatMessageMessage
  | ReadyStateMessage
  | PermissionUpdateMessage
  | ShipAssignmentMessage
  | CampaignSyncMessage
  | ActionRequestMessage
  | ActionResponseMessage
  | ContractAcceptedMessage
  | LaunchCountdownMessage
  | LaunchAbortedMessage
  | MissionStartedMessage
  | MissionEndedMessage
  | SessionEndedMessage
  | KickNotificationMessage
  | CallsignAnnounceMessage
  | CallsignChangeRequestMessage
  | CallsignChangedMessage;

// =============================================================================
// Host-only Message Check
// =============================================================================

/** Message types that can only be sent by the host */
export const HOST_ONLY_MESSAGES = new Set<GameMessageType>([
  GameMessageType.Welcome,
  GameMessageType.PlayerJoinedExt,
  GameMessageType.PlayerLeftExt,
  GameMessageType.PermissionUpdate,
  GameMessageType.ShipAssignment,
  GameMessageType.CampaignSync,
  GameMessageType.ActionResponse,
  GameMessageType.ContractAccepted,
  GameMessageType.LaunchCountdown,
  GameMessageType.LaunchAborted,
  GameMessageType.MissionStarted,
  GameMessageType.MissionEnded,
  GameMessageType.SessionEnded,
  GameMessageType.KickNotification,
  GameMessageType.CallsignChanged,
]);

/** Check if a message type can only be sent by the host */
export function isHostOnlyMessage(type: GameMessageType): boolean {
  return HOST_ONLY_MESSAGES.has(type);
}
