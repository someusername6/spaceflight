/**
 * Lobby Protocol Routing - Transport layer for lobby protocol messages.
 *
 * Responsibilities:
 * - Decode/encode game messages (binary protocol)
 * - Route incoming messages to appropriate handlers
 * - Manage message subscriptions on transport layer
 * - Broadcast messages to connected peers
 * - Provide MessageRouter for campaign state synchronization
 */

import { getStoredCallsign } from '../../multiplayer/callsign-storage';
import {
  type CampaignSyncManager,
  createCampaignSyncManager,
} from '../../multiplayer/campaign-sync';
import {
  createGuestLobbyPlayer,
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import {
  addPlayer,
  addSystemMessage,
  type LobbyState,
} from '../../multiplayer/lobby-state';
import type { ConnectionFlow } from '../../multiplayer/networking/connection-flow';
import { decodeMessage } from '../../multiplayer/protocol/decode';
import { encodeMessage } from '../../multiplayer/protocol/encode';
import type {
  CallsignAnnounceMessage,
  GameMessage,
  PlayerJoinedExtMessage,
  WelcomeMessage,
} from '../../multiplayer/protocol/messages';
import {
  createMessageRouter,
  type MessageRouter,
} from '../../multiplayer/protocol/router';
import { GameMessageType } from '../../multiplayer/protocol/types';
import type { CampaignState } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Handler context for message processing */
export interface MessageHandlerContext {
  connectionFlow: ConnectionFlow;
  campaignState: CampaignState | null;
  getLobbyState: () => LobbyState | null;
  setLobbyState: (state: LobbyState) => void;
  updateUI: () => void;
  /** Callback when campaign state is updated by sync manager */
  onCampaignUpdate?: (state: CampaignState) => void;
}

/** Result of setting up message handling */
export interface MessageHandlingResult {
  cleanup: () => void;
  router: MessageRouter;
  syncManager: CampaignSyncManager;
}

// =============================================================================
// Message Decoding
// =============================================================================

/**
 * Decode a Uint8Array to a GameMessage.
 * Returns null if data is not a valid game message (e.g., rollback-netcode messages).
 */
export function decodeGameMessage(data: Uint8Array): GameMessage | null {
  // Check if this is a game message (0x80-0x93 range)
  const typeByte = data[0];
  if (
    typeByte === undefined ||
    typeByte < GameMessageType.Welcome ||
    typeByte > GameMessageType.CallsignChanged
  ) {
    return null;
  }

  try {
    return decodeMessage(data);
  } catch {
    return null;
  }
}

/**
 * Encode a GameMessage to Uint8Array using binary protocol.
 */
export function encodeGameMessage(message: GameMessage): Uint8Array {
  return encodeMessage(message);
}

// =============================================================================
// Message Handling Setup
// =============================================================================

/**
 * Setup message handling for lobby-related protocol messages.
 * Returns cleanup function, message router, and campaign sync manager.
 */
export function setupMessageHandling(
  ctx: MessageHandlerContext,
  hostPeerId: string,
  isHost: boolean,
): MessageHandlingResult {
  const transport = ctx.connectionFlow.getTransport();
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

  // Store the original handlers
  const originalOnMessage = transport.onMessage;
  const originalOnConnect = transport.onConnect;

  // Create message router
  const router = createMessageRouter({
    transport,
    hostPeerId,
    isHost,
  });

  // Create campaign sync manager
  const syncManager = createCampaignSyncManager(router, isHost);

  // Set up campaign update callback
  if (ctx.onCampaignUpdate) {
    syncManager.onCampaignUpdate = ctx.onCampaignUpdate;
  }

  // Initialize with current campaign state (for host)
  if (isHost && ctx.campaignState) {
    syncManager.setCampaignState(ctx.campaignState);
  }

  // Register lobby message handlers on the router
  if (isHost) {
    router.onCallsignAnnounce((msg, peerId) => {
      handleCallsignAnnounce(ctx, syncManager, peerId, msg.callsign);
    });
  }

  // Register common lobby message handlers (chat, ready state, etc.)
  registerLobbyMessageHandlers(router, ctx, hostPeerId);

  // Wire router to transport with fallback to original handler
  router.wireToTransport(originalOnMessage ?? undefined);

  // For host: handle peer connections (we wait for CallsignAnnounce)
  if (isHost) {
    transport.onConnect = (peerId: string) => {
      // Do nothing here - we wait for CallsignAnnounce from the guest.
      // This avoids race conditions where the guest hasn't set up handlers yet.
      originalOnConnect?.(peerId);
    };
  }

  // Return cleanup function and references
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
 * Create a standard lobby message handler.
 * All lobby messages follow the same pattern: get state, process, update UI.
 */
function createLobbyHandler(
  ctx: MessageHandlerContext,
  hostPeerId: string,
): (msg: GameMessage) => void {
  return (msg: GameMessage) => {
    const lobbyState = ctx.getLobbyState();
    if (!lobbyState) return;
    const result = processLobbyMessage(lobbyState, msg, hostPeerId);
    if (result) {
      ctx.setLobbyState(result.state);
      ctx.updateUI();
    }
  };
}

/**
 * Register handlers for common lobby messages (chat, ready state, permissions, etc.)
 */
function registerLobbyMessageHandlers(
  router: MessageRouter,
  ctx: MessageHandlerContext,
  hostPeerId: string,
): void {
  const handler = createLobbyHandler(ctx, hostPeerId);

  router.onChatMessage(handler);
  router.onReadyState(handler);
  router.onPermissionUpdate(handler);
  router.onPlayerJoined(handler);
  router.onPlayerLeft(handler);
  router.onWelcome(handler);
  router.onShipAssignment(handler);
}

// =============================================================================
// Host Message Handlers
// =============================================================================

/**
 * Handle CallsignAnnounce from a newly connected guest.
 * This signals that the guest is ready to receive messages.
 */
function handleCallsignAnnounce(
  ctx: MessageHandlerContext,
  syncManager: CampaignSyncManager,
  peerId: string,
  callsign: string,
): void {
  const lobbyState = ctx.getLobbyState();
  if (!lobbyState || !ctx.campaignState) return;

  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return;

  // Check if we already have this player (duplicate announce)
  if (lobbyState.players.some((p) => p.playerId === peerId)) {
    return;
  }

  // Create a new player with the announced callsign and default permissions
  const newPlayer = createGuestLobbyPlayer(peerId, callsign);

  // Add player to local state with system message
  let newState = addPlayer(lobbyState, newPlayer);
  newState = addSystemMessage(newState, `${newPlayer.callsign} joined`);
  ctx.setLobbyState(newState);
  ctx.updateUI();

  // Register player in sync manager for permission validation
  syncManager.setPlayerInfo(peerId, lobbyPlayerToGamePlayer(newPlayer));

  // Send Welcome message to the new peer
  const welcomeMessage: WelcomeMessage = {
    type: GameMessageType.Welcome,
    playerId: peerId,
    campaignState: ctx.campaignState,
    players: newState.players.map((p) => lobbyPlayerToGamePlayer(p)),
  };
  const welcomeData = encodeMessage(welcomeMessage);
  transport.send(peerId, welcomeData, true);

  // Broadcast PlayerJoinedExt to all other peers
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
 * This signals to the host that we're ready to receive Welcome.
 */
export function sendCallsignAnnounce(connectionFlow: ConnectionFlow): void {
  const transport = connectionFlow.getTransport();
  if (!transport) return;

  const callsign = getStoredCallsign() ?? 'Guest';
  const message: CallsignAnnounceMessage = {
    type: GameMessageType.CallsignAnnounce,
    callsign,
  };

  // Send directly to host (broadcast works since host is the only connected peer at this point)
  const data = encodeMessage(message);
  transport.broadcast(data, true);
}

// =============================================================================
// Broadcast Utilities
// =============================================================================

/**
 * Broadcast a game message to all connected peers.
 */
export function broadcastMessage(
  connectionFlow: ConnectionFlow,
  message: GameMessage,
): void {
  const transport = connectionFlow.getTransport();
  if (!transport) return;

  const data = encodeGameMessage(message);
  transport.broadcast(data, true);
}
