/**
 * Message Router - Dispatches game protocol messages to handlers.
 *
 * Features:
 * - Type-safe handler registration
 * - Host-only message validation
 * - Send helpers for common patterns
 */

import type { TransportAdapter } from 'rollback-netcode';
import { decodeMessage, encodeMessage, isGameMessage } from './encoding';
import {
  type ActionRequestMessage,
  type ActionResponseMessage,
  type CallsignAnnounceMessage,
  type CallsignChangedMessage,
  type CallsignChangeRequestMessage,
  type CampaignSyncMessage,
  type ChatMessageMessage,
  type ContractAcceptedMessage,
  type GameMessage,
  GameMessageType,
  isHostOnlyMessage,
  type KickNotificationMessage,
  type LaunchAbortedMessage,
  type LaunchCountdownMessage,
  type MissionEndedMessage,
  type MissionStartedMessage,
  type PermissionUpdateMessage,
  type PlayerJoinedExtMessage,
  type PlayerLeftExtMessage,
  type ReadyStateMessage,
  type SessionEndedMessage,
  type ShipAssignmentMessage,
  type WelcomeMessage,
} from './messages';

// =============================================================================
// Types
// =============================================================================

/** Handler function type */
type MessageHandler<T extends GameMessage> = (
  msg: T,
  fromPeerId: string,
) => void;

/** Map of message types to their handlers */
interface MessageHandlers {
  [GameMessageType.Welcome]?: MessageHandler<WelcomeMessage>;
  [GameMessageType.PlayerJoinedExt]?: MessageHandler<PlayerJoinedExtMessage>;
  [GameMessageType.PlayerLeftExt]?: MessageHandler<PlayerLeftExtMessage>;
  [GameMessageType.ChatMessage]?: MessageHandler<ChatMessageMessage>;
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
  [GameMessageType.CallsignChangeRequest]?: MessageHandler<CallsignChangeRequestMessage>;
  [GameMessageType.CallsignChanged]?: MessageHandler<CallsignChangedMessage>;
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

// =============================================================================
// MessageRouter Class
// =============================================================================

/**
 * Routes incoming game messages to registered handlers.
 *
 * Validates that host-only messages come from the host peer.
 */
export class MessageRouter {
  private readonly transport: TransportAdapter;
  private readonly hostPeerId: string;
  private readonly isHost: boolean;
  private handlers: MessageHandlers = {};
  private boundMessageHandler:
    | ((peerId: string, data: Uint8Array) => void)
    | null = null;

  /** Called when a host-only message is received from a non-host peer */
  onUnauthorizedMessage:
    | ((msg: GameMessage, fromPeerId: string) => void)
    | null = null;

  /** Called when an error occurs during message processing */
  onError:
    | ((error: Error, data: Uint8Array, fromPeerId: string) => void)
    | null = null;

  constructor(config: MessageRouterConfig) {
    this.transport = config.transport;
    this.hostPeerId = config.hostPeerId;
    this.isHost = config.isHost;
  }

  // ===========================================================================
  // Handler Registration
  // ===========================================================================

  onWelcome(handler: MessageHandler<WelcomeMessage>): this {
    this.handlers[GameMessageType.Welcome] = handler;
    return this;
  }

  onPlayerJoined(handler: MessageHandler<PlayerJoinedExtMessage>): this {
    this.handlers[GameMessageType.PlayerJoinedExt] = handler;
    return this;
  }

  onPlayerLeft(handler: MessageHandler<PlayerLeftExtMessage>): this {
    this.handlers[GameMessageType.PlayerLeftExt] = handler;
    return this;
  }

  onChatMessage(handler: MessageHandler<ChatMessageMessage>): this {
    this.handlers[GameMessageType.ChatMessage] = handler;
    return this;
  }

  onReadyState(handler: MessageHandler<ReadyStateMessage>): this {
    this.handlers[GameMessageType.ReadyState] = handler;
    return this;
  }

  onPermissionUpdate(handler: MessageHandler<PermissionUpdateMessage>): this {
    this.handlers[GameMessageType.PermissionUpdate] = handler;
    return this;
  }

  onShipAssignment(handler: MessageHandler<ShipAssignmentMessage>): this {
    this.handlers[GameMessageType.ShipAssignment] = handler;
    return this;
  }

  onCampaignSync(handler: MessageHandler<CampaignSyncMessage>): this {
    this.handlers[GameMessageType.CampaignSync] = handler;
    return this;
  }

  onActionRequest(handler: MessageHandler<ActionRequestMessage>): this {
    this.handlers[GameMessageType.ActionRequest] = handler;
    return this;
  }

  onActionResponse(handler: MessageHandler<ActionResponseMessage>): this {
    this.handlers[GameMessageType.ActionResponse] = handler;
    return this;
  }

  onContractAccepted(handler: MessageHandler<ContractAcceptedMessage>): this {
    this.handlers[GameMessageType.ContractAccepted] = handler;
    return this;
  }

  onLaunchCountdown(handler: MessageHandler<LaunchCountdownMessage>): this {
    this.handlers[GameMessageType.LaunchCountdown] = handler;
    return this;
  }

  onLaunchAborted(handler: MessageHandler<LaunchAbortedMessage>): this {
    this.handlers[GameMessageType.LaunchAborted] = handler;
    return this;
  }

  onMissionStarted(handler: MessageHandler<MissionStartedMessage>): this {
    this.handlers[GameMessageType.MissionStarted] = handler;
    return this;
  }

  onMissionEnded(handler: MessageHandler<MissionEndedMessage>): this {
    this.handlers[GameMessageType.MissionEnded] = handler;
    return this;
  }

  onSessionEnded(handler: MessageHandler<SessionEndedMessage>): this {
    this.handlers[GameMessageType.SessionEnded] = handler;
    return this;
  }

  onKickNotification(handler: MessageHandler<KickNotificationMessage>): this {
    this.handlers[GameMessageType.KickNotification] = handler;
    return this;
  }

  onCallsignAnnounce(handler: MessageHandler<CallsignAnnounceMessage>): this {
    this.handlers[GameMessageType.CallsignAnnounce] = handler;
    return this;
  }

  onCallsignChangeRequest(
    handler: MessageHandler<CallsignChangeRequestMessage>,
  ): this {
    this.handlers[GameMessageType.CallsignChangeRequest] = handler;
    return this;
  }

  onCallsignChanged(handler: MessageHandler<CallsignChangedMessage>): this {
    this.handlers[GameMessageType.CallsignChanged] = handler;
    return this;
  }

  // ===========================================================================
  // Message Dispatch
  // ===========================================================================

  /**
   * Dispatch a raw message to the appropriate handler.
   *
   * Returns true if the message was a game message and was handled.
   * Returns false if the message was not a game message (e.g., rollback-netcode message).
   */
  dispatch(data: Uint8Array, fromPeerId: string): boolean {
    // Check if this is a game message
    if (!isGameMessage(data)) {
      return false;
    }

    let msg: GameMessage;
    try {
      msg = decodeMessage(data);
    } catch (error) {
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        data,
        fromPeerId,
      );
      return true; // Still a game message, just couldn't decode
    }

    // Validate host-only messages
    if (isHostOnlyMessage(msg.type) && fromPeerId !== this.hostPeerId) {
      this.onUnauthorizedMessage?.(msg, fromPeerId);
      return true;
    }

    // Dispatch to handler
    const handler = this.handlers[msg.type];
    if (handler) {
      try {
        // TypeScript knows the handler matches the message type
        (handler as MessageHandler<GameMessage>)(msg, fromPeerId);
      } catch (error) {
        this.onError?.(
          error instanceof Error ? error : new Error(String(error)),
          data,
          fromPeerId,
        );
      }
    }

    return true;
  }

  // ===========================================================================
  // Send Helpers
  // ===========================================================================

  /**
   * Send a message to the host.
   * No-op if local peer is the host.
   */
  sendToHost(msg: GameMessage): void {
    if (this.isHost) return;
    const data = encodeMessage(msg);
    this.transport.send(this.hostPeerId, data, true);
  }

  /**
   * Send a message to a specific peer.
   */
  sendToPeer(peerId: string, msg: GameMessage): void {
    const data = encodeMessage(msg);
    this.transport.send(peerId, data, true);
  }

  /**
   * Broadcast a message to all connected peers.
   */
  broadcast(msg: GameMessage): void {
    const data = encodeMessage(msg);
    this.transport.broadcast(data, true);
  }

  /**
   * Broadcast a message to all peers except one.
   * Useful for host broadcasting after receiving a message from a guest.
   */
  broadcastExcept(msg: GameMessage, excludePeerId: string): void {
    const data = encodeMessage(msg);
    for (const peerId of this.transport.connectedPeers) {
      if (peerId !== excludePeerId) {
        this.transport.send(peerId, data, true);
      }
    }
  }

  // ===========================================================================
  // Transport Integration
  // ===========================================================================

  /**
   * Wire the router to a transport's onMessage callback.
   *
   * This creates a wrapper that first tries to dispatch game messages,
   * then falls through to the existing handler for rollback-netcode messages.
   */
  wireToTransport(
    existingHandler?: (peerId: string, data: Uint8Array) => void,
  ): void {
    this.boundMessageHandler = (peerId: string, data: Uint8Array) => {
      const handled = this.dispatch(data, peerId);
      if (!handled && existingHandler) {
        existingHandler(peerId, data);
      }
    };
    this.transport.onMessage = this.boundMessageHandler;
  }

  /**
   * Remove the router from the transport.
   * Restores the previous handler if provided.
   */
  unwireFromTransport(
    previousHandler?: (peerId: string, data: Uint8Array) => void,
  ): void {
    this.transport.onMessage = previousHandler ?? null;
    this.boundMessageHandler = null;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clear all handlers and error callbacks.
   */
  dispose(): void {
    this.handlers = {};
    this.onUnauthorizedMessage = null;
    this.onError = null;
    this.boundMessageHandler = null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new message router.
 */
export function createMessageRouter(
  config: MessageRouterConfig,
): MessageRouter {
  return new MessageRouter(config);
}
