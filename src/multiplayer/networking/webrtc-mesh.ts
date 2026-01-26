/**
 * WebRTC Mesh Manager - Manages peer connections for multiplayer.
 *
 * Creates a fully-connected mesh where each player has a direct WebRTC
 * connection to every other player. Each connection has two DataChannels:
 * - 'reliable': ordered, guaranteed delivery (for inputs, state sync)
 * - 'unreliable': unordered, no retransmit (reserved for future optimization)
 */

import type { SignalType, WebRTCMeshConfig } from './types';

/** Outgoing signal to be sent via signaling server */
export interface OutgoingSignal {
  toPeerId: string;
  type: SignalType;
  data: string;
}

/** Events emitted by the mesh */
export interface WebRTCMeshEvents {
  onPeerConnected: (peerId: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onMessage: (peerId: string, data: Uint8Array) => void;
  onMeshComplete: () => void;
  onMeshFailed: (error: Error) => void;
  onSignalNeeded: (signal: OutgoingSignal) => void;
}

/** Internal state for a peer connection */
interface PeerState {
  connection: RTCPeerConnection;
  reliableChannel: RTCDataChannel | null;
  unreliableChannel: RTCDataChannel | null;
  connected: boolean;
  iceCandidateBuffer: RTCIceCandidate[];
  remoteDescriptionSet: boolean;
}

/** Convert Uint8Array to ArrayBuffer for DataChannel.send() */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

/**
 * Manages WebRTC peer connections in a mesh topology.
 */
export class WebRTCMesh {
  private readonly config: WebRTCMeshConfig;
  private readonly events: Partial<WebRTCMeshEvents>;
  private readonly peers = new Map<string, PeerState>();
  private readonly _connectedPeers = new Set<string>();

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
    // Host starts with no expected peers; they're added as they join
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
      this.initiateConnection(peerId);
    }
  }

  /**
   * Add a new peer to the mesh (called by host when a peer joins).
   * The new peer will initiate the connection; host just prepares to receive.
   */
  addPeer(peerId: string): void {
    this.checkNotDisposed();
    this.expectedPeers.add(peerId);

    // Create connection but don't initiate - wait for their offer
    this.createPeerConnection(peerId, false);
  }

  /**
   * Remove a peer from the mesh.
   */
  removePeer(peerId: string): void {
    const state = this.peers.get(peerId);
    if (state) {
      this.cleanupPeerConnection(peerId, state);
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
      this.createPeerConnection(fromPeerId, false);
      state = this.peers.get(fromPeerId);
      if (!state) {
        throw new Error(`Failed to create peer connection for ${fromPeerId}`);
      }
    }

    switch (type) {
      case 'offer':
        await this.handleOffer(fromPeerId, state, data);
        break;
      case 'answer':
        await this.handleAnswer(fromPeerId, state, data);
        break;
      case 'ice':
        await this.handleIceCandidate(fromPeerId, state, data);
        break;
    }
  }

  private async handleOffer(
    fromPeerId: string,
    state: PeerState,
    data: string,
  ): Promise<void> {
    const offer = JSON.parse(data) as RTCSessionDescriptionInit;
    await state.connection.setRemoteDescription(offer);
    state.remoteDescriptionSet = true;

    // Process buffered ICE candidates
    await this.processBufferedIceCandidates(state);

    // Create and send answer
    const answer = await state.connection.createAnswer();
    await state.connection.setLocalDescription(answer);

    this.emitSignal({
      toPeerId: fromPeerId,
      type: 'answer',
      data: JSON.stringify(answer),
    });
  }

  private async handleAnswer(
    _fromPeerId: string,
    state: PeerState,
    data: string,
  ): Promise<void> {
    const answer = JSON.parse(data) as RTCSessionDescriptionInit;
    await state.connection.setRemoteDescription(answer);
    state.remoteDescriptionSet = true;

    // Process buffered ICE candidates
    await this.processBufferedIceCandidates(state);
  }

  private async handleIceCandidate(
    _fromPeerId: string,
    state: PeerState,
    data: string,
  ): Promise<void> {
    const candidate = JSON.parse(data) as RTCIceCandidateInit;
    const iceCandidate = new RTCIceCandidate(candidate);

    if (state.remoteDescriptionSet) {
      await state.connection.addIceCandidate(iceCandidate);
    } else {
      // Buffer until remote description is set
      state.iceCandidateBuffer.push(iceCandidate);
    }
  }

  private async processBufferedIceCandidates(state: PeerState): Promise<void> {
    for (const candidate of state.iceCandidateBuffer) {
      await state.connection.addIceCandidate(candidate);
    }
    state.iceCandidateBuffer = [];
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

    // Select channel based on reliability requirement
    const channel = reliable ? state.reliableChannel : state.unreliableChannel;
    if (!channel || channel.readyState !== 'open') {
      throw new Error(`Data channel not open for peer ${peerId}`);
    }

    channel.send(toArrayBuffer(data));
  }

  /**
   * Broadcast a message to all connected peers.
   */
  broadcast(data: Uint8Array, reliable: boolean): void {
    for (const peerId of this._connectedPeers) {
      try {
        this.send(peerId, data, reliable);
      } catch {
        // Ignore send errors during broadcast
      }
    }
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

    for (const [peerId, state] of this.peers) {
      this.cleanupPeerConnection(peerId, state);
    }
    this.peers.clear();
    this._connectedPeers.clear();
    this.expectedPeers.clear();
  }

  // ===========================================================================
  // Private: Connection Management
  // ===========================================================================

  private initiateConnection(peerId: string): void {
    this.createPeerConnection(peerId, true);
  }

  private createPeerConnection(peerId: string, initiator: boolean): void {
    const connection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    const state: PeerState = {
      connection,
      reliableChannel: null,
      unreliableChannel: null,
      connected: false,
      iceCandidateBuffer: [],
      remoteDescriptionSet: false,
    };

    this.peers.set(peerId, state);

    // Set up ICE candidate handling
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitSignal({
          toPeerId: peerId,
          type: 'ice',
          data: JSON.stringify(event.candidate.toJSON()),
        });
      }
    };

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      this.handleConnectionStateChange(peerId, state);
    };

    // Handle incoming data channels (for non-initiators)
    connection.ondatachannel = (event) => {
      this.handleIncomingDataChannel(peerId, state, event.channel);
    };

    // If initiator, create data channels and offer
    if (initiator) {
      this.createDataChannels(peerId, state);
      this.createAndSendOffer(peerId, state);
    }
  }

  private createDataChannels(peerId: string, state: PeerState): void {
    // Reliable channel: ordered, guaranteed delivery
    const reliable = state.connection.createDataChannel('reliable', {
      ordered: true,
    });
    this.setupDataChannel(peerId, state, reliable, 'reliable');
    state.reliableChannel = reliable;

    // Unreliable channel: for future optimization
    const unreliable = state.connection.createDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });
    this.setupDataChannel(peerId, state, unreliable, 'unreliable');
    state.unreliableChannel = unreliable;
  }

  private handleIncomingDataChannel(
    peerId: string,
    state: PeerState,
    channel: RTCDataChannel,
  ): void {
    if (channel.label === 'reliable') {
      state.reliableChannel = channel;
      this.setupDataChannel(peerId, state, channel, 'reliable');
    } else if (channel.label === 'unreliable') {
      state.unreliableChannel = channel;
      this.setupDataChannel(peerId, state, channel, 'unreliable');
    }
  }

  private setupDataChannel(
    peerId: string,
    state: PeerState,
    channel: RTCDataChannel,
    label: string,
  ): void {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      // Check if both channels are open
      if (this.areBothChannelsOpen(state)) {
        this.handlePeerConnected(peerId, state);
      }
    };

    channel.onclose = () => {
      if (state.connected) {
        this.handlePeerDisconnected(peerId, state);
      }
    };

    channel.onerror = (event) => {
      console.error(`DataChannel ${label} error for peer ${peerId}:`, event);
    };

    // Only handle messages on reliable channel
    if (label === 'reliable') {
      channel.onmessage = (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        this.events.onMessage?.(peerId, data);
      };
    }
  }

  private areBothChannelsOpen(state: PeerState): boolean {
    return (
      state.reliableChannel?.readyState === 'open' &&
      state.unreliableChannel?.readyState === 'open'
    );
  }

  private async createAndSendOffer(
    peerId: string,
    state: PeerState,
  ): Promise<void> {
    const offer = await state.connection.createOffer();
    await state.connection.setLocalDescription(offer);

    this.emitSignal({
      toPeerId: peerId,
      type: 'offer',
      data: JSON.stringify(offer),
    });
  }

  private handleConnectionStateChange(peerId: string, state: PeerState): void {
    const connState = state.connection.connectionState;

    if (connState === 'failed' || connState === 'disconnected') {
      if (state.connected) {
        this.handlePeerDisconnected(peerId, state);
      }
    }
  }

  private handlePeerConnected(peerId: string, state: PeerState): void {
    if (state.connected) return;
    state.connected = true;
    this._connectedPeers.add(peerId);

    this.events.onPeerConnected?.(peerId);

    // Check if mesh is complete
    if (!this.meshCompleted && this.isMeshComplete()) {
      this.meshCompleted = true;
      if (this.meshTimeoutId) {
        clearTimeout(this.meshTimeoutId);
        this.meshTimeoutId = null;
      }
      this.events.onMeshComplete?.();
    }
  }

  private handlePeerDisconnected(peerId: string, state: PeerState): void {
    if (!state.connected) return;
    state.connected = false;
    this._connectedPeers.delete(peerId);

    this.events.onPeerDisconnected?.(peerId);
  }

  private cleanupPeerConnection(peerId: string, state: PeerState): void {
    state.reliableChannel?.close();
    state.unreliableChannel?.close();
    state.connection.close();
    state.connected = false;
    this._connectedPeers.delete(peerId);
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

/**
 * Create a WebRTC mesh with the given configuration.
 */
export function createWebRTCMesh(
  config: WebRTCMeshConfig,
  events?: Partial<WebRTCMeshEvents>,
): WebRTCMesh {
  return new WebRTCMesh(config, events);
}
