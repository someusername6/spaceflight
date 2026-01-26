/**
 * Lobby Message Handler - Handle incoming protocol messages in lobby.
 *
 * Responsibilities:
 * - Decode game messages from binary data
 * - Process Welcome, PlayerJoinedExt, ReadyState, ChatMessage
 * - Send CallsignAnnounce, Welcome, PlayerJoinedExt broadcasts
 */

import { getStoredCallsign } from '../../multiplayer/callsign-storage';
import {
  lobbyPlayerToGamePlayer,
  processLobbyMessage,
} from '../../multiplayer/lobby-messages';
import {
  addPlayer,
  addSystemMessage,
  type LobbyPlayer,
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
 * Returns a cleanup function.
 */
export function setupMessageHandling(
  ctx: MessageHandlerContext,
  hostPeerId: string,
  isHost: boolean,
): () => void {
  const transport = ctx.connectionFlow.getTransport();
  if (!transport) return () => {};

  // Store the original handlers
  const originalOnMessage = transport.onMessage;
  const originalOnConnect = transport.onConnect;

  // Wrap the onMessage handler to process lobby messages
  transport.onMessage = (peerId: string, data: Uint8Array) => {
    const lobbyState = ctx.getLobbyState();

    // Try to decode as a game message
    try {
      const message = decodeGameMessage(data);
      if (message && lobbyState) {
        // Host handles CallsignAnnounce specially - this triggers Welcome
        if (isHost && message.type === GameMessageType.CallsignAnnounce) {
          const announceMsg = message as CallsignAnnounceMessage;
          handleCallsignAnnounce(ctx, peerId, announceMsg.callsign);
        } else {
          const result = processLobbyMessage(lobbyState, message, hostPeerId);
          if (result) {
            ctx.setLobbyState(result.state);
            ctx.updateUI();
          }
        }
      }
    } catch {
      // Not a game message, ignore
    }

    // Call original handler
    originalOnMessage?.(peerId, data);
  };

  // For host: handle peer connections (we wait for CallsignAnnounce)
  if (isHost) {
    transport.onConnect = (peerId: string) => {
      // Do nothing here - we wait for CallsignAnnounce from the guest.
      // This avoids race conditions where the guest hasn't set up handlers yet.
      originalOnConnect?.(peerId);
    };
  }

  // Return cleanup function
  return () => {
    transport.onMessage = originalOnMessage;
    transport.onConnect = originalOnConnect;
  };
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

  // Create a new player with the announced callsign
  const newPlayer: LobbyPlayer = {
    playerId: peerId,
    callsign,
    shipId: null,
    isReady: false,
    isHost: false,
    ping: 0,
  };

  // Add player to local state with system message
  let newState = addPlayer(lobbyState, newPlayer);
  newState = addSystemMessage(newState, `${newPlayer.callsign} joined`);
  ctx.setLobbyState(newState);
  ctx.updateUI();

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
