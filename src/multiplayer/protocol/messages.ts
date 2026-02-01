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
  type Permission,
} from './types';

// Re-export all types from types.ts for convenience
export * from './types';

// Import and re-export mission lifecycle messages
import type {
  ContractAcceptedMessage,
  KickNotificationMessage,
  LaunchAbortedMessage,
  LaunchCountdownMessage,
  MissionEndedMessage,
  MissionStartedMessage,
  ReturnToLobbyMessage,
  SessionEndedMessage,
} from './messages-mission';

export type {
  ContractAcceptedMessage,
  KickNotificationMessage,
  LaunchAbortedMessage,
  LaunchCountdownMessage,
  MissionEndedMessage,
  MissionStartedMessage,
  ReturnToLobbyMessage,
  SessionEndedMessage,
};

// Import and re-export pause messages
import type {
  GuestQuitRequestMessage,
  PauseReadyStateMessage,
  PauseRequestMessage,
  PlayerDroppedMessage,
} from './messages-pause';

export type {
  GuestQuitRequestMessage,
  PauseReadyStateMessage,
  PauseRequestMessage,
  PlayerDroppedMessage,
};

// =============================================================================
// Message Interfaces
// =============================================================================

/**
 * Welcome - Host → Guest
 * Sent after mesh forms to provide initial state.
 *
 * @mp-operation welcome
 * @mp-actor host
 * @mp-permission none
 * @mp-flow Host receives CallsignAnnounce → creates player → sends Welcome to new peer
 * @mp-ui Guest receives campaign state and player list; lobby populates
 * @mp-tested e2e/connection.mjs:testHostAndGuestConnection
 * @mp-status implemented
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
 * Announces new player with callsign.
 *
 * Note: "Ext" suffix distinguishes this from rollback-netcode's built-in
 * PlayerJoined event. The "Ext" (Extended) version includes game-specific
 * player info like callsign and permissions.
 *
 * @mp-operation playerJoined
 * @mp-actor host
 * @mp-permission none
 * @mp-flow Host receives CallsignAnnounce → broadcasts PlayerJoinedExt to existing players
 * @mp-ui Lobby: "{callsign} joined" system message; player list updates
 * @mp-tested e2e/connection.mjs:testHostAndGuestConnection
 * @mp-status implemented
 */
export interface PlayerJoinedExtMessage {
  type: GameMessageType.PlayerJoinedExt;
  player: GamePlayerInfo;
}

/**
 * PlayerLeftExt - Host → All
 * Announces player departure with reason.
 *
 * @mp-operation playerLeft
 * @mp-actor host
 * @mp-permission none
 * @mp-flow Host detects disconnect/kick → broadcasts PlayerLeftExt to remaining players
 * @mp-ui Lobby: "{callsign} left/disconnected/kicked" system message; player list updates
 * @mp-tested none
 * @mp-status implemented
 */
export interface PlayerLeftExtMessage {
  type: GameMessageType.PlayerLeftExt;
  playerId: string;
  reason: LeaveReason;
}

/**
 * ChatMessage - Any → All
 * Text chat between players.
 *
 * @mp-operation chat
 * @mp-actor host | guest
 * @mp-permission none
 * @mp-flow Sender types message → broadcast to all → displayed in chat panel
 * @mp-ui Lobby: Chat input sends message; all players see "{callsign}: {text}"
 * @mp-tested e2e/ui-chat-cleanup.mjs:testChatMessaging
 * @mp-status implemented
 */
export interface ChatMessage {
  type: GameMessageType.ChatMessage;
  fromPlayerId: string;
  text: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
}

/**
 * ReadyState - Any → All
 * Player ready status change.
 *
 * @mp-operation ready
 * @mp-actor host | guest
 * @mp-permission none
 * @mp-flow Player clicks Ready button → broadcast to all → player list indicators update
 * @mp-ui Lobby: Ready button toggles state; ready indicator shown next to player name
 * @mp-tested e2e/ui-ready.mjs:testReadyToggle
 * @mp-status implemented
 */
export interface ReadyStateMessage {
  type: GameMessageType.ReadyState;
  playerId: string;
  ready: boolean;
}

/**
 * PermissionUpdate - Host → All
 * Permission change for a player.
 *
 * @mp-operation permissionUpdate
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host toggles permission checkbox → broadcast to all → UI updates reactively
 * @mp-ui Host: Popover checkboxes control permissions; Guest: buttons enable/disable based on permissions
 * @mp-tested e2e/permissions.mjs:testPermissionToggle, e2e/permission-sync.mjs
 * @mp-status implemented
 */
export interface PermissionUpdateMessage {
  type: GameMessageType.PermissionUpdate;
  playerId: string;
  permissions: Permission;
}

/**
 * ShipAssignment - Host → All
 * Player-to-ship mapping update.
 *
 * @mp-operation shipAssignment
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host assigns player to ship → broadcast to all → player's shipId updates in lobby state
 * @mp-ui Lobby: Ship indicator next to player name (planned); Squadron: pilot display
 * @mp-tested unit/test-ship-assignment.mjs, e2e/player-lifecycle.mjs
 * @mp-status implemented
 */
export interface ShipAssignmentMessage {
  type: GameMessageType.ShipAssignment;
  playerId: string;
  shipId: string | null;
  /** Expected state version for conflict detection (optional) */
  expectedVersion?: number;
}

/**
 * CampaignSync - Host → Guests
 * Full campaign state synchronization.
 *
 * @mp-operation campaignSync
 * @mp-actor host
 * @mp-permission none (host-only action)
 * @mp-flow Host processes action → updates local state → broadcasts CampaignSync to all guests
 * @mp-ui All screens: state-dependent UI updates (credits, weapons, ships, etc.)
 * @mp-tested e2e/campaign-sync.mjs, e2e/state-sync-*.mjs
 * @mp-status implemented
 */
export interface CampaignSyncMessage {
  type: GameMessageType.CampaignSync;
  campaignState: CampaignState;
}

/**
 * ActionRequest - Guest → Host
 * Request to perform a campaign action.
 *
 * @mp-operation actionRequest
 * @mp-actor guest
 * @mp-permission varies by action type (see individual actions)
 * @mp-flow Guest performs UI action → sends ActionRequest → host validates permissions → processes → sends ActionResponse + CampaignSync
 * @mp-ui Guest: optimistic UI update; rollback on rejection; success confirmed by CampaignSync
 * @mp-tested e2e/state-sync-guest-store.mjs, e2e/loadout-equip.mjs, e2e/loadout-resupply.mjs
 * @mp-status implemented
 */
export interface ActionRequestMessage {
  type: GameMessageType.ActionRequest;
  /** Request ID for matching response */
  requestId: number;
  action: ActionRequestData;
}

/**
 * ActionResponse - Host → Guest
 * Response to action request.
 *
 * @mp-operation actionResponse
 * @mp-actor host
 * @mp-permission none (response to guest request)
 * @mp-flow Host processes ActionRequest → validates → sends ActionResponse with success/error
 * @mp-ui Guest: error message shown on rejection; success triggers state sync
 * @mp-tested e2e/state-sync-guest-store.mjs
 * @mp-status implemented
 */
export interface ActionResponseMessage {
  type: GameMessageType.ActionResponse;
  requestId: number;
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * CallsignAnnounce - New peer → Host
 * New player announces their callsign after mesh forms.
 *
 * @mp-operation callsignAnnounce
 * @mp-actor guest (new connection)
 * @mp-permission none
 * @mp-flow Guest connects → sends CallsignAnnounce → host creates player → sends Welcome
 * @mp-ui Connection flow: guest sends stored callsign on connect
 * @mp-tested e2e/connection.mjs:testHostAndGuestConnection
 * @mp-status implemented
 */
export interface CallsignAnnounceMessage {
  type: GameMessageType.CallsignAnnounce;
  callsign: string;
}

/**
 * CallsignUpdate - Any → All
 * Player updates their callsign.
 *
 * @mp-operation callsignUpdate
 * @mp-actor host | guest
 * @mp-permission none (can only change own callsign)
 * @mp-flow Player changes callsign → broadcasts to all → host validates and rebroadcasts
 * @mp-ui Lobby: Click own row → popover with input → save → callsign updates everywhere
 * @mp-tested scripts/tests/multiplayer/unit/test-encoding-callsign.mjs
 * @mp-status implemented
 */
export interface CallsignUpdateMessage {
  type: GameMessageType.CallsignUpdate;
  playerId: string;
  callsign: string;
}

// =============================================================================
// Union Type
// =============================================================================

/** Union of all game message types */
export type GameMessage =
  | WelcomeMessage
  | PlayerJoinedExtMessage
  | PlayerLeftExtMessage
  | ChatMessage
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
  | CallsignUpdateMessage
  | PauseReadyStateMessage
  | PlayerDroppedMessage
  | GuestQuitRequestMessage
  | PauseRequestMessage
  | ReturnToLobbyMessage;

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
  GameMessageType.PlayerDropped,
  GameMessageType.ReturnToLobby,
]);

/** Check if a message type can only be sent by the host */
export function isHostOnlyMessage(type: GameMessageType): boolean {
  return HOST_ONLY_MESSAGES.has(type);
}
