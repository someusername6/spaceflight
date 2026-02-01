/**
 * Lobby Protocol Routing - Transport layer for lobby protocol messages.
 *
 * Responsibilities:
 * - Decode/encode game messages (binary protocol)
 * - Route incoming messages to appropriate handlers
 * - Setup message handling with LobbyContext
 */

import {
  getStoredCallsign,
  isCallsignConflict,
  validateCallsign,
} from '../../multiplayer/callsign-storage';
import { createCampaignSyncManager } from '../../multiplayer/campaign-sync';
import { processLobbyMessage } from '../../multiplayer/lobby-messages';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  CallsignAnnounceMessage,
  GameMessage,
} from '../../multiplayer/protocol/messages';
import { createMessageRouter } from '../../multiplayer/protocol/router';
import { GameMessageType } from '../../multiplayer/protocol/types';
import { reconstituteCampaignState } from '../storage/campaign-utils';
import type { CampaignState } from '../types';
import {
  autoUnreadyIfNeeded,
  handlePlayerUnready,
  setLobbyState,
} from './lobby-actions';
import type { LobbyContext } from './lobby-context';
import { wireGuestHandlers } from './lobby-guest-handlers';
import { handleCallsignAnnounce } from './lobby-host-handlers';

// =============================================================================
// Types
// =============================================================================

/** Configuration for setting up message handling */
export interface MessageHandlingConfig {
  connectionFlow: ConnectionFlow;
  hostPeerId: string;
  isHost: boolean;
  campaignState: CampaignState | null;
  onCampaignUpdate?: (state: CampaignState) => void;
}

/** Result of setting up message handling */
export interface MessageHandlingResult {
  cleanup: () => void;
  router: ReturnType<typeof createMessageRouter>;
  syncManager: ReturnType<typeof createCampaignSyncManager>;
}

// =============================================================================
// Message Handling Setup
// =============================================================================

/**
 * Setup message handling and return components needed for LobbyContext.
 * This is called during lobby setup to create the router and sync manager.
 */
export function setupMessageHandling(
  config: MessageHandlingConfig,
): MessageHandlingResult {
  const {
    connectionFlow,
    hostPeerId,
    isHost,
    campaignState,
    onCampaignUpdate,
  } = config;

  const transport = connectionFlow.getTransport();
  if (!transport) {
    throw new Error('Cannot setup message handling without transport');
  }

  // Store original handlers for cleanup
  const originalOnMessage = transport.onMessage;
  const originalOnConnect = transport.onConnect;

  // Create router and sync manager
  const router = createMessageRouter({ transport, hostPeerId, isHost });
  const syncManager = createCampaignSyncManager(router, isHost);

  // Set up campaign update callback
  if (onCampaignUpdate) {
    syncManager.onCampaignUpdate = onCampaignUpdate;
  }

  // Initialize with current campaign state (for host)
  if (isHost && campaignState) {
    syncManager.setCampaignState(campaignState);
  }

  return {
    cleanup: () => {
      router.unwireFromTransport(originalOnMessage ?? undefined);
      transport.onConnect = originalOnConnect;
      syncManager.dispose();
      router.dispose();
    },
    router,
    syncManager,
  };
}

/**
 * Wire up message handlers to the router using the LobbyContext.
 * Called after LobbyContext is created.
 *
 * Note: Transport handler management (onMessage, onConnect) is handled by
 * setupMessageHandling's cleanup function, not here.
 */
export function wireMessageHandlers(
  ctx: LobbyContext,
  hostPeerId: string,
): void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  // Create standard lobby message handler
  const handler = (msg: GameMessage) => {
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }
  };

  // Register handlers
  ctx.router.onChatMessage(handler);
  ctx.router.onPermissionUpdate(handler);
  ctx.router.onPlayerJoined(handler);
  ctx.router.onPlayerLeft(handler);

  // ShipAssignment handler: process lobby state AND trigger auto-unready if local player
  ctx.router.onShipAssignment((msg) => {
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }

    // If local player's ship assignment changed, auto-unready
    if (msg.playerId === ctx.localPlayerId) {
      autoUnreadyIfNeeded(ctx);
    }
  });

  // ReadyState handler: process lobby state AND check countdown abort
  ctx.router.onReadyState((msg) => {
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }

    // Host: check if this unready should abort a countdown
    if (ctx.isHost && 'playerId' in msg && 'ready' in msg) {
      const readyMsg = msg as { playerId: string; ready: boolean };
      if (!readyMsg.ready) {
        handlePlayerUnready(ctx, readyMsg.playerId);
      }
    }
  });

  // Welcome handler: process lobby state AND feed campaign state to sync manager
  // (Router only supports one handler per type, so we must combine both here
  // instead of relying on CampaignSyncManager's separate onWelcome handler)
  ctx.router.onWelcome((msg) => {
    // Update lobby state (players list)
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }

    // Feed campaign state to sync manager (guest only)
    if (!ctx.isHost && msg.campaignState) {
      const reconstituted = reconstituteCampaignState(msg.campaignState);
      ctx.syncManager.setCampaignState(reconstituted);
      for (const player of msg.players) {
        ctx.syncManager.setPlayerInfo(player.playerId, player);
      }
      ctx.syncManager.onCampaignUpdate?.(reconstituted);
    }
  });

  // Host-specific: handle CallsignAnnounce
  if (ctx.isHost) {
    ctx.router.onCallsignAnnounce((msg, peerId) => {
      handleCallsignAnnounce(ctx, peerId, msg.callsign);
    });
  }

  // CallsignUpdate handler: host validates and broadcasts, guests apply directly
  ctx.router.onCallsignUpdate((msg, fromPeerId) => {
    // Host validation
    if (ctx.isHost) {
      // Verify sender matches playerId (can't change others' callsigns)
      if (msg.playerId !== fromPeerId) {
        console.warn(
          '[lobby-routing] CallsignUpdate rejected: sender mismatch',
        );
        return;
      }

      // Validate callsign format
      const validation = validateCallsign(msg.callsign);
      if (!validation.valid) {
        console.warn(
          `[lobby-routing] CallsignUpdate rejected: ${validation.error}`,
        );
        return;
      }

      // Check for conflicts (case-insensitive)
      if (
        isCallsignConflict(ctx.lobbyState.players, msg.callsign, msg.playerId)
      ) {
        console.warn(
          '[lobby-routing] CallsignUpdate rejected: callsign already taken',
        );
        return;
      }

      // Rebroadcast valid update to all peers (including back to sender)
      const transport = ctx.connectionFlow.getTransport();
      if (transport) {
        transport.broadcast(encodeMessage(msg), true);
      }
    }

    // Apply valid update to local state (both host and guest)
    const result = processLobbyMessage(ctx.lobbyState, msg, hostPeerId);
    if (result) {
      setLobbyState(ctx, result.state);
    }
  });

  // Guest-only handlers (host manages these differently)
  if (!ctx.isHost) {
    wireGuestHandlers(ctx);
  }

  // Wire router to transport (cleanup handled by setupMessageHandling)
  ctx.router.wireToTransport(transport.onMessage ?? undefined);
}

// =============================================================================
// Guest Message Sending
// =============================================================================

/**
 * Send CallsignAnnounce to host (guest only).
 */
export function sendCallsignAnnounce(connectionFlow: ConnectionFlow): void {
  const transport = connectionFlow.getTransport();
  if (!transport) return;

  const callsign = getStoredCallsign() ?? 'Guest';
  const message: CallsignAnnounceMessage = {
    type: GameMessageType.CallsignAnnounce,
    callsign,
  };

  transport.broadcast(encodeMessage(message), true);
}
