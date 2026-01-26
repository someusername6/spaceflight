/**
 * Session State - Tracks multiplayer session information.
 *
 * NOTE: This module is PREPARATORY for Phase 5 (GameSession Integration).
 * It is intentionally not integrated with ConnectionFlow in Phase 4.
 *
 * Phase 5 will use this to:
 * - Track player callsigns and permissions
 * - Manage lobby state (ready status, team assignments)
 * - Coordinate game start synchronization
 * - Handle mid-game player disconnects
 *
 * The interface is defined now to establish the contract early and allow
 * parallel development of dependent features.
 */

import type { TransportAdapter } from 'rollback-netcode';
import type { SignalingClient } from './signaling-client';

/**
 * Multiplayer session state.
 *
 * Tracks connection info and provides access to networking components.
 */
export interface MultiplayerSessionState {
  // Connection status
  readonly isMultiplayer: boolean;
  readonly isHost: boolean;
  readonly roomCode: string | null;
  readonly localPeerId: string | null;

  // Peer info
  readonly hostPeerId: string | null;
  readonly connectedPeerIds: ReadonlySet<string>;

  // Networking components
  readonly transport: TransportAdapter | null;
  readonly signalingClient: SignalingClient | null;
}

/**
 * Mutable session state for internal use.
 */
export interface MutableSessionState {
  isMultiplayer: boolean;
  isHost: boolean;
  roomCode: string | null;
  localPeerId: string | null;
  hostPeerId: string | null;
  connectedPeerIds: Set<string>;
  transport: TransportAdapter | null;
  signalingClient: SignalingClient | null;
}

/**
 * Create initial session state (not in multiplayer).
 */
export function createSessionState(): MutableSessionState {
  return {
    isMultiplayer: false,
    isHost: false,
    roomCode: null,
    localPeerId: null,
    hostPeerId: null,
    connectedPeerIds: new Set(),
    transport: null,
    signalingClient: null,
  };
}

/**
 * Reset session state to initial values.
 */
export function resetSessionState(state: MutableSessionState): void {
  state.isMultiplayer = false;
  state.isHost = false;
  state.roomCode = null;
  state.localPeerId = null;
  state.hostPeerId = null;
  state.connectedPeerIds.clear();
  state.transport = null;
  state.signalingClient = null;
}

/**
 * Update session state after successful connection.
 */
export function setConnectedState(
  state: MutableSessionState,
  params: {
    roomCode: string;
    localPeerId: string;
    isHost: boolean;
    hostPeerId: string;
    allPeerIds: string[];
    transport: TransportAdapter;
    signalingClient: SignalingClient;
  },
): void {
  state.isMultiplayer = true;
  state.isHost = params.isHost;
  state.roomCode = params.roomCode;
  state.localPeerId = params.localPeerId;
  state.hostPeerId = params.hostPeerId;
  state.connectedPeerIds = new Set(
    params.allPeerIds.filter((id) => id !== params.localPeerId),
  );
  state.transport = params.transport;
  state.signalingClient = params.signalingClient;
}

/**
 * Add a peer to the connected set.
 */
export function addConnectedPeer(
  state: MutableSessionState,
  peerId: string,
): void {
  state.connectedPeerIds.add(peerId);
}

/**
 * Remove a peer from the connected set.
 */
export function removeConnectedPeer(
  state: MutableSessionState,
  peerId: string,
): void {
  state.connectedPeerIds.delete(peerId);
}
