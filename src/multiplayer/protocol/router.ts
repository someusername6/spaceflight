/**
 * Message Router - Dispatches game protocol messages to handlers.
 *
 * Features:
 * - Type-safe handler registration
 * - Host-only message validation
 * - Send helpers for common patterns
 */

import type { TransportAdapter } from 'rollback-netcode';
import { decodeMessage, isGameMessage } from './decode';
import {
  type ActionRequestMessage,
  type ActionResponseMessage,
  type AutoaimUpdateMessage,
  type CallsignAnnounceMessage,
  type CallsignUpdateMessage,
  type CampaignSyncMessage,
  type ChatMessage,
  type ContractAcceptedMessage,
  type GameMessage,
  GameMessageType,
  type GuestQuitRequestMessage,
  isHostOnlyMessage,
  type KickNotificationMessage,
  type LaunchAbortedMessage,
  type LaunchCountdownMessage,
  type MissionEndedMessage,
  type MissionStartedMessage,
  type PauseReadyStateMessage,
  type PauseRequestMessage,
  type PermissionUpdateMessage,
  type PlayerDroppedMessage,
  type PlayerJoinedExtMessage,
  type PlayerLeftExtMessage,
  type ReadyStateMessage,
  type ReturnToLobbyMessage,
  type SessionEndedMessage,
  type ShipAssignmentMessage,
  type WelcomeMessage,
} from './messages';
import {
  broadcastExcept as broadcastExceptFn,
  broadcastMessage,
  sendToHost as sendToHostFn,
  sendToPeer as sendToPeerFn,
} from './router-send';
import type {
  MessageHandler,
  MessageHandlers,
  MessageRouterConfig,
} from './router-types';

// Re-export config type for consumers
export type { MessageRouterConfig } from './router-types';

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
  private errorCount = 0;

  /** Called when a host-only message is received from a non-host peer */
  onUnauthorizedMessage:
    | ((msg: GameMessage, fromPeerId: string) => void)
    | null = null;

  /** Called when an error occurs during message processing */
  onError: (error: Error, data: Uint8Array, fromPeerId: string) => void = (
    error,
    _data,
    fromPeerId,
  ) => {
    console.error(`[MessageRouter] Error from ${fromPeerId}:`, error.message);
    this.errorCount++;
  };

  /** Called when a peer disconnects */
  onPeerDisconnect: ((peerId: string) => void) | null = null;

  constructor(config: MessageRouterConfig) {
    this.transport = config.transport;
    this.hostPeerId = config.hostPeerId;
    this.isHost = config.isHost;
  }

  /** Get the number of errors that have occurred */
  getErrorCount(): number {
    return this.errorCount;
  }

  /** Reset the error count to zero */
  resetErrorCount(): void {
    this.errorCount = 0;
  }

  /** Get the host peer ID */
  getHostPeerId(): string {
    return this.hostPeerId;
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

  onChatMessage(handler: MessageHandler<ChatMessage>): this {
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

  onCallsignUpdate(handler: MessageHandler<CallsignUpdateMessage>): this {
    this.handlers[GameMessageType.CallsignUpdate] = handler;
    return this;
  }

  onPauseReadyState(handler: MessageHandler<PauseReadyStateMessage>): this {
    this.handlers[GameMessageType.PauseReadyState] = handler;
    return this;
  }

  onPlayerDropped(handler: MessageHandler<PlayerDroppedMessage>): this {
    this.handlers[GameMessageType.PlayerDropped] = handler;
    return this;
  }

  onGuestQuitRequest(handler: MessageHandler<GuestQuitRequestMessage>): this {
    this.handlers[GameMessageType.GuestQuitRequest] = handler;
    return this;
  }

  onPauseRequest(handler: MessageHandler<PauseRequestMessage>): this {
    this.handlers[GameMessageType.PauseRequest] = handler;
    return this;
  }

  onReturnToLobby(handler: MessageHandler<ReturnToLobbyMessage>): this {
    this.handlers[GameMessageType.ReturnToLobby] = handler;
    return this;
  }

  onAutoaimUpdate(handler: MessageHandler<AutoaimUpdateMessage>): this {
    this.handlers[GameMessageType.AutoaimUpdate] = handler;
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
      this.onError(
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
        this.onError(
          error instanceof Error ? error : new Error(String(error)),
          data,
          fromPeerId,
        );
      }
    }

    return true;
  }

  // ===========================================================================
  // Send Helpers (delegates to router-send.ts)
  // ===========================================================================

  /** Send a message to the host. No-op if local peer is the host. */
  sendToHost(msg: GameMessage): void {
    sendToHostFn(this.transport, this.hostPeerId, this.isHost, msg);
  }

  /** Send a message to a specific peer. */
  sendToPeer(peerId: string, msg: GameMessage): void {
    sendToPeerFn(this.transport, peerId, msg);
  }

  /** Broadcast a message to all connected peers. */
  broadcast(msg: GameMessage): void {
    broadcastMessage(this.transport, msg);
  }

  /** Broadcast a message to all peers except one. */
  broadcastExcept(msg: GameMessage, excludePeerId: string): void {
    broadcastExceptFn(this.transport, msg, excludePeerId);
  }

  // ===========================================================================
  // Transport Integration
  // ===========================================================================

  /** Store existing disconnect handler for unwiring */
  private existingDisconnectHandler: ((peerId: string) => void) | null = null;

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

    // Wire disconnect handler - capture in closure to avoid circular reference
    // when wireToTransport is called multiple times (mission start/end)
    const previousDisconnectHandler = this.transport.onDisconnect;
    // Only capture if it's not already our own handler (avoid self-reference)
    const isOurHandler =
      previousDisconnectHandler === this.boundDisconnectHandler;
    const existingDisconnect = isOurHandler ? null : previousDisconnectHandler;
    this.existingDisconnectHandler = existingDisconnect ?? null;

    this.boundDisconnectHandler = (peerId: string) => {
      existingDisconnect?.(peerId);
      this.onPeerDisconnect?.(peerId);
    };
    this.transport.onDisconnect = this.boundDisconnectHandler;
  }

  /** Bound disconnect handler for detecting self-reference */
  private boundDisconnectHandler: ((peerId: string) => void) | null = null;

  /**
   * Remove the router from the transport.
   * Restores the previous handler if provided.
   */
  unwireFromTransport(
    previousHandler?: (peerId: string, data: Uint8Array) => void,
  ): void {
    this.transport.onMessage = previousHandler ?? null;
    this.transport.onDisconnect = this.existingDisconnectHandler ?? null;
    this.boundMessageHandler = null;
    this.boundDisconnectHandler = null;
    this.existingDisconnectHandler = null;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clear all handlers and reset state.
   */
  dispose(): void {
    this.handlers = {};
    this.onUnauthorizedMessage = null;
    this.onPeerDisconnect = null;
    this.boundMessageHandler = null;
    this.boundDisconnectHandler = null;
    this.existingDisconnectHandler = null;
    this.errorCount = 0;
  }
}

// Factory function: see router-factory.ts
