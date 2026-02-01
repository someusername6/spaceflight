/**
 * Connection Flow - Orchestrates the full multiplayer connection process.
 *
 * Coordinates between SignalingClient, WebRTCMesh, and WebRTCTransport to
 * establish a multiplayer session. Handles the complete flow:
 * 1. Create/join room via signaling server
 * 2. Exchange WebRTC signals (SDP offers/answers, ICE candidates)
 * 3. Form mesh with all peers
 * 4. Return transport adapter for rollback-netcode
 *
 * The transport is wrapped with TransformingTransport from rollback-netcode,
 * which provides automatic gzip compression and message segmentation for
 * payloads exceeding WebRTC's ~16KB DataChannel limit.
 */

import { TransformingTransport, type TransportAdapter } from 'rollback-netcode';
import { toConnectionError } from './connection-errors';
import { createGuestMesh } from './guest-mesh';
import { createSignalPoller } from './signal-poller';
import { SignalQueue } from './signal-queue';
import {
  createSignalingClient,
  type SignalingClient,
} from './signaling-client';
import type {
  ConnectionResult,
  ConnectionState,
  NetworkingConfig,
} from './types';
import { DEFAULT_NETWORKING_CONFIG } from './types';
import { WebRTCMesh } from './webrtc-mesh';
import {
  createWebRTCTransport,
  type WebRTCTransport,
} from './webrtc-transport';

/** Events emitted during connection flow */
export interface ConnectionFlowEvents {
  onStateChange: (state: ConnectionState) => void;
}

/**
 * Orchestrates multiplayer connection setup.
 */
export class ConnectionFlow {
  private readonly config: NetworkingConfig;
  private readonly events: Partial<ConnectionFlowEvents>;

  private signalingClient: SignalingClient | null = null;
  private mesh: WebRTCMesh | null = null;
  private rawTransport: WebRTCTransport | null = null;
  private transport: TransportAdapter | null = null;

  private _state: ConnectionState = { status: 'idle' };
  private disposed = false;

  private readonly signalQueue = new SignalQueue();
  private readonly poller: ReturnType<typeof createSignalPoller>;

  constructor(
    config: Partial<NetworkingConfig> = {},
    events: Partial<ConnectionFlowEvents> = {},
  ) {
    this.config = {
      signaling: {
        ...DEFAULT_NETWORKING_CONFIG.signaling,
        ...config.signaling,
      },
      webrtc: { ...DEFAULT_NETWORKING_CONFIG.webrtc, ...config.webrtc },
    };
    this.events = events;
    this.poller = createSignalPoller({
      getSignalingClient: () => this.signalingClient,
      getMesh: () => this.mesh,
      getRawTransport: () => this.rawTransport,
      signalQueue: this.signalQueue,
      pollIntervalMs: this.config.signaling.pollIntervalMs,
    });
  }

  // ===========================================================================
  // Public Properties
  // ===========================================================================

  get state(): ConnectionState {
    return this._state;
  }

  // ===========================================================================
  // Connection Actions
  // ===========================================================================

  /**
   * Create a new room and wait for peers to join.
   *
   * Returns when at least one peer has connected, or can be used to get
   * the room code immediately and wait for peers separately.
   */
  async createRoom(): Promise<ConnectionResult> {
    this.checkNotDisposed();
    this.ensureIdle();

    this.setState({ status: 'creating-room' });

    try {
      // Create signaling client
      this.signalingClient = createSignalingClient(this.config.signaling);

      // Create room on signaling server
      const result = await this.signalingClient.createRoom();

      this.setState({ status: 'signaling', roomCode: result.roomCode });

      // Create mesh as host
      this.mesh = this.createMesh();
      this.mesh.initializeAsHost(result.hostId);

      // Create transport with compression and segmentation wrapper
      this.rawTransport = createWebRTCTransport(this.mesh);
      this.transport = new TransformingTransport(this.rawTransport);

      // Start polling for signals and events
      this.poller.start();

      this.setState({ status: 'connected', roomCode: result.roomCode });

      return {
        roomCode: result.roomCode,
        localPeerId: result.hostId,
        isHost: true,
        hostPeerId: result.hostId,
        allPeerIds: [result.hostId],
      };
    } catch (error) {
      const connError = toConnectionError(error);
      this.setState({ status: 'error', error: connError });
      throw connError;
    }
  }

  /**
   * Join an existing room.
   *
   * Returns when the mesh is fully formed (connected to all peers).
   * @param roomCode - The room code to join
   * @param callsign - Player callsign (for kicked callsign blocking)
   */
  async joinRoom(
    roomCode: string,
    callsign?: string,
  ): Promise<ConnectionResult> {
    this.checkNotDisposed();
    this.ensureIdle();

    this.setState({ status: 'joining-room', roomCode });

    try {
      // Create signaling client
      this.signalingClient = createSignalingClient(this.config.signaling);

      // Join room on signaling server
      const result = await this.signalingClient.joinRoom(roomCode, callsign);

      const allPeerIds = [result.hostId, ...result.existingPeers];
      const totalPeers = allPeerIds.length;

      this.setState({
        status: 'forming-mesh',
        roomCode,
        connectedPeers: 0,
        totalPeers,
      });

      // Create mesh and wait for completion
      const meshResult = await createGuestMesh(
        this.config.webrtc,
        result.guestId,
        result.hostId,
        result.existingPeers,
        roomCode,
        totalPeers,
        {
          getRawTransport: () => this.rawTransport,
          startPolling: () => this.poller.start(),
          setState: (state) => this.setState(state),
          signalQueue: this.signalQueue,
          setMesh: (mesh) => {
            this.mesh = mesh;
          },
        },
      );

      // Create transport with compression and segmentation wrapper
      this.rawTransport = createWebRTCTransport(meshResult.mesh);
      this.transport = new TransformingTransport(this.rawTransport);

      this.setState({ status: 'connected', roomCode });

      return {
        roomCode,
        localPeerId: result.guestId,
        isHost: false,
        hostPeerId: result.hostId,
        allPeerIds: [result.guestId, ...allPeerIds],
      };
    } catch (error) {
      const connError = toConnectionError(error);
      this.setState({ status: 'error', error: connError });
      throw connError;
    }
  }

  /**
   * Disconnect from the current session.
   */
  async disconnect(): Promise<void> {
    this.poller.stop();

    if (this.signalingClient) {
      try {
        await this.signalingClient.leaveRoom();
      } catch {
        // Ignore errors during disconnect
      }
      this.signalingClient.dispose();
      this.signalingClient = null;
    }

    if (this.transport) {
      this.transport.dispose?.();
      this.transport = null;
    }

    if (this.rawTransport) {
      this.rawTransport.dispose();
      this.rawTransport = null;
    }

    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }

    this.signalQueue.clear();
    this.setState({ status: 'idle' });
  }

  /**
   * Get the transport adapter for rollback-netcode.
   */
  getTransport(): TransportAdapter | null {
    return this.transport;
  }

  /**
   * Get the signaling client for host actions.
   */
  getSignalingClient(): SignalingClient | null {
    return this.signalingClient;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.poller.stop();
    this.transport?.dispose?.();
    this.rawTransport?.dispose();
    this.mesh?.dispose();
    this.signalingClient?.dispose();

    this.transport = null;
    this.rawTransport = null;
    this.mesh = null;
    this.signalingClient = null;
    this.signalQueue.clear();
  }

  // ===========================================================================
  // Private: Mesh Creation
  // ===========================================================================

  private createMesh(): WebRTCMesh {
    // Mesh callbacks invoke rawTransport's handlers. When the session sets
    // transport.onMessage (on TransformingTransport), it replaces rawTransport's
    // handlers with internal ones that decompress/reassemble before forwarding.
    return new WebRTCMesh(this.config.webrtc, {
      onPeerConnected: (peerId) => {
        this.rawTransport?.onConnect?.(peerId);
      },
      onPeerDisconnected: (peerId) => {
        this.rawTransport?.onDisconnect?.(peerId);
      },
      onMessage: (peerId, data) => {
        this.rawTransport?.onMessage?.(peerId, data);
      },
      onSignalNeeded: (signal) => {
        this.signalQueue.queue(signal);
      },
    });
  }

  // ===========================================================================
  // Private: State Management
  // ===========================================================================

  private setState(state: ConnectionState): void {
    this._state = state;
    this.events.onStateChange?.(state);
  }

  private ensureIdle(): void {
    if (this._state.status !== 'idle') {
      throw new Error(
        `Cannot start connection from state: ${this._state.status}`,
      );
    }
  }

  private checkNotDisposed(): void {
    if (this.disposed) {
      throw new Error('ConnectionFlow has been disposed');
    }
  }
}

/**
 * Create a connection flow orchestrator.
 */
export function createConnectionFlow(
  config?: Partial<NetworkingConfig>,
  events?: Partial<ConnectionFlowEvents>,
): ConnectionFlow {
  return new ConnectionFlow(config, events);
}
