/**
 * Lobby Protocol Routing - Transport layer for lobby protocol messages.
 *
 * Responsibilities:
 * - Decode/encode game messages (binary protocol)
 * - Route incoming messages to appropriate handlers
 * - Setup message handling with LobbyContext
 */

import { getStoredCallsign } from '../../multiplayer/callsign-storage';
import { createCampaignSyncManager } from '../../multiplayer/campaign-sync';
import {
  createGuestLobbyPlayer,
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import { addPlayer, addSystemMessage } from '../../multiplayer/lobby-state';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  CallsignAnnounceMessage,
  GameMessage,
  PlayerJoinedExtMessage,
  WelcomeMessage,
} from '../../multiplayer/protocol/messages';
import { createMessageRouter } from '../../multiplayer/protocol/router';
import { GameMessageType } from '../../multiplayer/protocol/types';
import type { CampaignState } from '../types';
import { setLobbyState } from './lobby-actions';
import type { LobbyContext } from './lobby-context';

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
    // Return dummy objects if no transport
    const dummyRouter = createMessageRouter({
      transport: {} as never,
      hostPeerId,
      isHost,
    });
    const dummySyncManager = createCampaignSyncManager(dummyRouter, isHost);
    return {
      cleanup: () => {},
      router: dummyRouter,
      syncManager: dummySyncManager,
    };
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
  ctx.router.onReadyState(handler);
  ctx.router.onPermissionUpdate(handler);
  ctx.router.onPlayerJoined(handler);
  ctx.router.onPlayerLeft(handler);
  ctx.router.onWelcome(handler);
  ctx.router.onShipAssignment(handler);

  // Host-specific: handle CallsignAnnounce
  if (ctx.isHost) {
    ctx.router.onCallsignAnnounce((msg, peerId) => {
      handleCallsignAnnounce(ctx, peerId, msg.callsign);
    });
  }

  // Wire router to transport (cleanup handled by setupMessageHandling)
  ctx.router.wireToTransport(transport.onMessage ?? undefined);
}

// =============================================================================
// Host Message Handlers
// =============================================================================

/**
 * Handle CallsignAnnounce from a newly connected guest.
 */
function handleCallsignAnnounce(
  ctx: LobbyContext,
  peerId: string,
  callsign: string,
): void {
  if (!ctx.campaignState) return;

  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  // Check for duplicate announce
  if (ctx.lobbyState.players.some((p) => p.playerId === peerId)) {
    return;
  }

  // Create new player
  const newPlayer = createGuestLobbyPlayer(peerId, callsign);

  // Add to local state
  let newState = addPlayer(ctx.lobbyState, newPlayer);
  newState = addSystemMessage(newState, `${newPlayer.callsign} joined`);
  setLobbyState(ctx, newState);

  // Register in sync manager
  ctx.syncManager.setPlayerInfo(peerId, lobbyPlayerToGamePlayer(newPlayer));

  // Send Welcome to new peer
  const welcomeMessage: WelcomeMessage = {
    type: GameMessageType.Welcome,
    playerId: peerId,
    campaignState: ctx.campaignState,
    players: newState.players.map((p) => lobbyPlayerToGamePlayer(p)),
  };
  transport.send(peerId, encodeMessage(welcomeMessage), true);

  // Broadcast PlayerJoinedExt to others
  const joinedMessage: PlayerJoinedExtMessage = {
    type: GameMessageType.PlayerJoinedExt,
    player: lobbyPlayerToGamePlayer(newPlayer),
  };
  const joinedData = encodeMessage(joinedMessage);
  for (const otherPeerId of transport.connectedPeers) {
    if (otherPeerId !== peerId) {
      transport.send(otherPeerId, joinedData, true);
    }
  }
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
