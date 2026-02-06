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
import { setPlayerAutoaimDegrees } from '../../multiplayer/lobby-state';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  CallsignAnnounceMessage,
  GameMessage,
  PermissionUpdateMessage,
} from '../../multiplayer/protocol/messages';
import { createMessageRouter } from '../../multiplayer/protocol/router-factory';
import { GameMessageType } from '../../multiplayer/protocol/types';
import {
  getPlayerAutoaim,
  isValidPlayerAutoaim,
} from '../../settings/game-settings';
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
  /** Function to get current lobby state (for permission resync on reconnect) */
  getLobbyState?: () =>
    | import('../../multiplayer/lobby-state').LobbyState
    | null;
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
    getLobbyState,
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

  // Host: resync permissions when a peer reconnects
  if (isHost && getLobbyState) {
    transport.onConnect = (peerId: string) => {
      originalOnConnect?.(peerId);

      // Check if this is a known player (reconnecting)
      const lobbyState = getLobbyState();
      if (!lobbyState) return;

      const player = lobbyState.players.find((p) => p.playerId === peerId);
      if (player && !player.isHost) {
        // Resend permissions to reconnected peer
        const permissionMsg: PermissionUpdateMessage = {
          type: GameMessageType.PermissionUpdate,
          playerId: peerId,
          permissions: player.permissions,
        };
        transport.send(peerId, encodeMessage(permissionMsg), true);
      }
    };
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

  // Register handlers — validate chat text on host to reject malformed messages
  ctx.router.onChatMessage((msg) => {
    if (ctx.isHost) {
      if (
        typeof msg.text !== 'string' ||
        msg.text.trim().length === 0 ||
        msg.text.length > 200
      ) {
        console.warn('[lobby-routing] ChatMessage rejected: invalid text');
        return;
      }
    }
    handler(msg);
  });
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
      handleCallsignAnnounce(ctx, peerId, msg.callsign, msg.autoaimDegrees);
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

  // AutoaimUpdate handler: host validates and broadcasts, guests apply directly
  ctx.router.onAutoaimUpdate((msg, fromPeerId) => {
    // Host validation
    if (ctx.isHost) {
      // Verify sender matches playerId (can't change others' autoaim)
      if (msg.playerId !== fromPeerId) {
        console.warn('[lobby-routing] AutoaimUpdate rejected: sender mismatch');
        return;
      }

      // Validate autoaim range
      if (!isValidPlayerAutoaim(msg.autoaimDegrees)) {
        console.warn(
          '[lobby-routing] AutoaimUpdate rejected: invalid autoaim value',
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
    const newState = setPlayerAutoaimDegrees(
      ctx.lobbyState,
      msg.playerId,
      msg.autoaimDegrees,
    );
    setLobbyState(ctx, newState);
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
// Broadcast is used because transport.send(peerId) requires knowing the host's
// peerId, which isn't available here. In 2-player this is equivalent to unicast.
export function sendCallsignAnnounce(connectionFlow: ConnectionFlow): void {
  const transport = connectionFlow.getTransport();
  if (!transport) return;

  const callsign = getStoredCallsign() ?? 'Guest';
  const message: CallsignAnnounceMessage = {
    type: GameMessageType.CallsignAnnounce,
    callsign,
    autoaimDegrees: getPlayerAutoaim(),
  };

  transport.broadcast(encodeMessage(message), true);
}
