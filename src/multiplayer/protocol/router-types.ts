/**
 * Router Types - Type definitions for message routing.
 *
 * Extracted from router.ts for file size management.
 */

import type { TransportAdapter } from 'rollback-netcode';
import type {
  ActionRequestMessage,
  ActionResponseMessage,
  CallsignAnnounceMessage,
  CallsignUpdateMessage,
  CampaignSyncMessage,
  ChatMessage,
  ContractAcceptedMessage,
  GameMessage,
  GuestQuitRequestMessage,
  KickNotificationMessage,
  LaunchAbortedMessage,
  LaunchCountdownMessage,
  MissionEndedMessage,
  MissionStartedMessage,
  PauseReadyStateMessage,
  PauseRequestMessage,
  PermissionUpdateMessage,
  PlayerDroppedMessage,
  PlayerJoinedExtMessage,
  PlayerLeftExtMessage,
  ReadyStateMessage,
  ReturnToLobbyMessage,
  SessionEndedMessage,
  ShipAssignmentMessage,
  WelcomeMessage,
} from './messages';
import { GameMessageType } from './types';

// =============================================================================
// Types
// =============================================================================

/** Handler function type */
export type MessageHandler<T extends GameMessage> = (
  msg: T,
  fromPeerId: string,
) => void;

/** Map of message types to their handlers */
export interface MessageHandlers {
  [GameMessageType.Welcome]?: MessageHandler<WelcomeMessage>;
  [GameMessageType.PlayerJoinedExt]?: MessageHandler<PlayerJoinedExtMessage>;
  [GameMessageType.PlayerLeftExt]?: MessageHandler<PlayerLeftExtMessage>;
  [GameMessageType.ChatMessage]?: MessageHandler<ChatMessage>;
  [GameMessageType.ReadyState]?: MessageHandler<ReadyStateMessage>;
  [GameMessageType.PermissionUpdate]?: MessageHandler<PermissionUpdateMessage>;
  [GameMessageType.ShipAssignment]?: MessageHandler<ShipAssignmentMessage>;
  [GameMessageType.CampaignSync]?: MessageHandler<CampaignSyncMessage>;
  [GameMessageType.ActionRequest]?: MessageHandler<ActionRequestMessage>;
  [GameMessageType.ActionResponse]?: MessageHandler<ActionResponseMessage>;
  [GameMessageType.ContractAccepted]?: MessageHandler<ContractAcceptedMessage>;
  [GameMessageType.LaunchCountdown]?: MessageHandler<LaunchCountdownMessage>;
  [GameMessageType.LaunchAborted]?: MessageHandler<LaunchAbortedMessage>;
  [GameMessageType.MissionStarted]?: MessageHandler<MissionStartedMessage>;
  [GameMessageType.MissionEnded]?: MessageHandler<MissionEndedMessage>;
  [GameMessageType.SessionEnded]?: MessageHandler<SessionEndedMessage>;
  [GameMessageType.KickNotification]?: MessageHandler<KickNotificationMessage>;
  [GameMessageType.CallsignAnnounce]?: MessageHandler<CallsignAnnounceMessage>;
  [GameMessageType.CallsignUpdate]?: MessageHandler<CallsignUpdateMessage>;
  [GameMessageType.PauseReadyState]?: MessageHandler<PauseReadyStateMessage>;
  [GameMessageType.PlayerDropped]?: MessageHandler<PlayerDroppedMessage>;
  [GameMessageType.GuestQuitRequest]?: MessageHandler<GuestQuitRequestMessage>;
  [GameMessageType.PauseRequest]?: MessageHandler<PauseRequestMessage>;
  [GameMessageType.ReturnToLobby]?: MessageHandler<ReturnToLobbyMessage>;
}

/** Configuration for MessageRouter */
export interface MessageRouterConfig {
  /** Transport adapter for sending messages */
  transport: TransportAdapter;
  /** Host peer ID for validation */
  hostPeerId: string;
  /** Whether local peer is the host */
  isHost: boolean;
}
