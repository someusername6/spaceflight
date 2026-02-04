/**
 * Protocol Module - Game-specific messaging layer for multiplayer.
 *
 * This module provides:
 * - Message type definitions (0x80-0x93 byte range)
 * - Binary encoding/decoding
 * - Message routing with host-only validation
 *
 * Built on top of rollback-netcode's transport layer.
 */

// =============================================================================
// Message Types
// =============================================================================

export {
  type ActionRequestData,
  type ActionRequestMessage,
  type ActionResponseMessage,
  // Action types
  type BuyAction,
  type CallsignAnnounceMessage,
  type CallsignUpdateMessage,
  type CampaignSyncMessage,
  type ChatMessage,
  type ContractAcceptedMessage,
  type ConvertScrapAction,
  DEFAULT_PERMISSION,
  type EquipAction,
  // Union type
  type GameMessage,
  // Enum
  GameMessageType,
  type GamePlayerInfo,
  // Validation
  HOST_ONLY_MESSAGES,
  isHostOnlyMessage,
  type KickNotificationMessage,
  type LaunchAbortedMessage,
  type LaunchCountdownMessage,
  type LeaveReason,
  type MissionEndedMessage,
  // Mission outcome
  type MissionOutcomeData,
  type MissionStartedMessage,
  type Permission,
  type PermissionUpdateMessage,
  type PlayerJoinedExtMessage,
  type PlayerLeftExtMessage,
  type ReadyStateMessage,
  type ResupplyAction,
  type SellAction,
  type SessionEndedMessage,
  type ShipAssignmentMessage,
  // Shared types
  type ShipEditPermission,
  type UnequipAction,
  // Message interfaces
  type WelcomeMessage,
} from './messages';

// =============================================================================
// Encoding
// =============================================================================

export { decodeMessage, getMessageType, isGameMessage } from './decode';
export { encodeMessage } from './encode';

// =============================================================================
// Buffer Utilities (exported for error handling and limits)
// =============================================================================

export {
  MAX_MESSAGE_SIZE,
  MAX_STRING_LENGTH,
  ProtocolError,
} from './buffer-utils';

// =============================================================================
// Router
// =============================================================================

export { MessageRouter, type MessageRouterConfig } from './router';
export { createMessageRouter } from './router-factory';
