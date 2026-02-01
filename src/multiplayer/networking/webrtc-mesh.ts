/**
 * WebRTC Mesh Manager - Manages peer connections for multiplayer.
 *
 * Creates a fully-connected mesh where each player has a direct WebRTC
 * connection to every other player. Each connection has two DataChannels:
 * - 'reliable': ordered, guaranteed delivery (for inputs, state sync)
 * - 'unreliable': unordered, no retransmit (reserved for future optimization)
 */

import { logDebug } from '../../core/logger';
import {
  handleAnswer,
  handleIceCandidate,
  handleOffer,
} from './mesh-signaling';
import {
  cleanupPeerConnection,
  createPeerConnection,
  type OutgoingSignal,
  type PeerState,
  toArrayBuffer,
} from './peer-connection';
import { ReconnectionManager } from './reconnection';
import type { SignalType, WebRTCMeshConfig } from './types';

// Re-export for external use
export type { OutgoingSignal } from './peer-connection';

/** Result of a broadcast operation */
export interface BroadcastResult {
  success: number;
  failed: string[];
}

/** Events emitted by the mesh */
export interface WebRTCMeshEvents {
  onPeerConnected: (peerId: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onMessage: (peerId: string, data: Uint8Array) => void;
  onMeshComplete: () => void;
  onMeshFailed: (error: Error) => void;
  onSignalNeeded: (signal: OutgoingSignal) => void;
  onPeerReconnecting?: (peerId: string) => void;
  onPeerReconnectionAttempt?: (peerId: string) => void;
  onPeerReconnectionFailed?: (peerId: string) => void;
  onBroadcastError?: (peerId: string, error: unknown) => void;
}

/**
 * Manages WebRTC peer connections in a mesh topology.
 */
export class WebRTCMesh {
  private readonly config: WebRTCMeshConfig;
  private readonly events: Partial<WebRTCMeshEvents>;
  private readonly peers = new Map<string, PeerState>();
  private readonly _connectedPeers = new Set<string>();
  private readonly reconnectionManager = new ReconnectionManager();

  private _localPeerId: string | null = null;
  private expectedPeers = new Set<string>();
  private meshCompleted = false;
  private meshFailed = false;
  private meshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    config: WebRTCMeshConfig,
    events: Partial<WebRTCMeshEvents> = {},
  ) {
    this.config = config;
    this.events = events;
  }

  // ===========================================================================
  // Public Properties
  // ===========================================================================

  get localPeerId(): string {
    if (!this._localPeerId) {
      throw new Error('Mesh not initialized');
    }
    return this._localPeerId;
  }

  get connectedPeers(): ReadonlySet<string> {
    return this._connectedPeers;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the mesh as the host.
   * Host waits for guests to connect; doesn't initiate connections.
   */
  initializeAsHost(hostPeerId: string): void {
    this.checkNotDisposed();
    this._localPeerId = hostPeerId;
  }

  /**
   * Initialize the mesh as a guest.
   * Guest initiates connections to all existing peers (including host).
   */
  initializeAsGuest(
    guestPeerId: string,
    hostId: string,
    existingPeerIds: string[],
  ): void {
    this.checkNotDisposed();
    this._localPeerId = guestPeerId;

    // All existing peers (including host) need to be connected
    const allPeers = [hostId, ...existingPeerIds.filter((id) => id !== hostId)];
    for (const peerId of allPeers) {
      this.expectedPeers.add(peerId);
    }

    // Start mesh timeout
    this.startMeshTimeout();

    // Initiate connections to all existing peers
    for (const peerId of allPeers) {
      this.initiatePeerConnection(peerId);
    }
  }

  /**
   * Add a new peer to the mesh (called by host when a peer joins).
   * The new peer will initiate the connection; host just prepares to receive.
   */
  addPeer(peerId: string): void {
    this.checkNotDisposed();

    // Skip if we already have this peer (prevents duplicate connections)
    if (this.peers.has(peerId)) {
      return;
    }

    this.expectedPeers.add(peerId);

    // Create connection but don't initiate - wait for their offer
    this.createPeer(peerId, false);
  }

  /**
   * Remove a peer from the mesh.
   */
  removePeer(peerId: string): void {
    const state = this.peers.get(peerId);
    if (state) {
      cleanupPeerConnection(state);
    }
    this.peers.delete(peerId);
    this._connectedPeers.delete(peerId);
    this.expectedPeers.delete(peerId);
  }

  // ===========================================================================
  // Signaling
  // ===========================================================================

  /**
   * Handle an incoming signal from the signaling server.
   */
  async handleSignal(
    fromPeerId: string,
    type: SignalType,
    data: string,
  ): Promise<void> {
    this.checkNotDisposed();

    let state = this.peers.get(fromPeerId);

    // If we don't have a connection for this peer yet, create one
    if (!state) {
      this.createPeer(fromPeerId, false);
      state = this.peers.get(fromPeerId);
      if (!state) {
        throw new Error(`Failed to create peer connection for ${fromPeerId}`);
      }
    }

    switch (type) {
      case 'offer': {
        const signal = await handleOffer(fromPeerId, state, data);
        this.emitSignal(signal);
        break;
      }
      case 'answer':
        await handleAnswer(state, data);
        break;
      case 'ice':
        await handleIceCandidate(state, data);
        break;
    }
  }

  // ===========================================================================
  // Messaging
  // ===========================================================================

  /**
   * Send a message to a specific peer.
   */
  send(peerId: string, data: Uint8Array, reliable: boolean): void {
    this.checkNotDisposed();

    const state = this.peers.get(peerId);
    if (!state) {
      throw new Error(`No connection to peer ${peerId}`);
    }

    const channel = reliable ? state.reliableChannel : state.unreliableChannel;
    if (!channel || channel.readyState !== 'open') {
      throw new Error(`Data channel not open for peer ${peerId}`);
    }

    channel.send(toArrayBuffer(data));
  }

  /**
   * Broadcast a message to all connected peers.
   * Returns the number of successful sends and list of failed peer IDs.
   */
  broadcast(data: Uint8Array, reliable: boolean): BroadcastResult {
    const failed: string[] = [];
    let success = 0;

    for (const peerId of this._connectedPeers) {
      try {
        this.send(peerId, data, reliable);
        success++;
      } catch (error) {
        console.warn(`Broadcast to ${peerId} failed:`, error);
        failed.push(peerId);
        this.events.onBroadcastError?.(peerId, error);
      }
    }

    return { success, failed };
  }

  // ===========================================================================
  // State
  // ===========================================================================

  /**
   * Check if the mesh is fully formed (all expected peers connected).
   */
  isMeshComplete(): boolean {
    if (this.expectedPeers.size === 0) {
      return true;
    }
    for (const peerId of this.expectedPeers) {
      if (!this._connectedPeers.has(peerId)) {
        return false;
      }
    }
    return true;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose of all connections and resources.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.meshTimeoutId) {
      clearTimeout(this.meshTimeoutId);
      this.meshTimeoutId = null;
    }

    this.reconnectionManager.reset();

    for (const state of this.peers.values()) {
      cleanupPeerConnection(state);
    }
    this.peers.clear();
    this._connectedPeers.clear();
    this.expectedPeers.clear();
  }

  // ===========================================================================
  // Private: Connection Management
  // ===========================================================================

  private initiatePeerConnection(peerId: string): void {
    this.createPeer(peerId, true);
  }

  private createPeer(peerId: string, initiator: boolean): void {
    // Clean up any existing connection first to prevent leaks
    if (this.peers.has(peerId)) {
      cleanupPeerConnection(this.peers.get(peerId)!);
      this.peers.delete(peerId);
    }
    const state = createPeerConnection(
      peerId,
      initiator,
      this.config,
      {
        onSignalNeeded: (signal) => this.emitSignal(signal),
        onPeerConnected: (id) => this.handlePeerConnected(id),
        onPeerDisconnected: (id) => this.handlePeerDisconnected(id),
        onMessage: (id, data) => this.events.onMessage?.(id, data),
        onReconnecting: (id) => this.events.onPeerReconnecting?.(id),
        onReconnectionAttempt: (id) =>
          this.events.onPeerReconnectionAttempt?.(id),
        onReconnectionFailed: (id) =>
          this.events.onPeerReconnectionFailed?.(id),
      },
      () => {
        // State change callback - not needed for mesh tracking
      },
      this.reconnectionManager,
      (id) => this.initiateReconnection(id),
    );

    this.peers.set(peerId, state);
  }

  /**
   * Initiate a reconnection attempt for a peer.
   * Uses tie-breaker: lower peer ID initiates to prevent dual-offer deadlock.
   */
  private initiateReconnection(peerId: string): void {
    // Clean up old connection
    const oldState = this.peers.get(peerId);
    if (oldState) {
      cleanupPeerConnection(oldState);
    }
    this.peers.delete(peerId);

    // Tie-breaker: lower peer ID becomes the initiator
    // This prevents both peers from sending offers simultaneously
    const shouldInitiate = this.localPeerId < peerId;

    logDebug(
      `[Mesh] Reconnect: attempting to ${peerId} (initiator: ${shouldInitiate})`,
    );

    this.createPeer(peerId, shouldInitiate);
  }

  private handlePeerConnected(peerId: string): void {
    this._connectedPeers.add(peerId);
    this.events.onPeerConnected?.(peerId);

    if (!this.meshCompleted && this.isMeshComplete()) {
      this.meshCompleted = true;
      if (this.meshTimeoutId) {
        clearTimeout(this.meshTimeoutId);
        this.meshTimeoutId = null;
      }
      this.events.onMeshComplete?.();
    }
  }

  private handlePeerDisconnected(peerId: string): void {
    this._connectedPeers.delete(peerId);
    this.events.onPeerDisconnected?.(peerId);
  }

  // ===========================================================================
  // Private: Mesh Timeout
  // ===========================================================================

  private startMeshTimeout(): void {
    this.meshTimeoutId = setTimeout(() => {
      if (!this.meshCompleted && !this.meshFailed) {
        this.meshFailed = true;
        const missing = [...this.expectedPeers].filter(
          (id) => !this._connectedPeers.has(id),
        );
        this.events.onMeshFailed?.(
          new Error(
            `Mesh formation timeout. Missing peers: ${missing.join(', ')}`,
          ),
        );
      }
    }, this.config.meshTimeoutMs);
  }

  private emitSignal(signal: OutgoingSignal): void {
    this.events.onSignalNeeded?.(signal);
  }

  private checkNotDisposed(): void {
    if (this.disposed) {
      throw new Error('WebRTCMesh has been disposed');
    }
  }
}
