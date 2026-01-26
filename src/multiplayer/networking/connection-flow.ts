/**
 * Connection Flow - Orchestrates the full multiplayer connection process.
 *
 * Coordinates between SignalingClient, WebRTCMesh, and WebRTCTransport to
 * establish a multiplayer session. Handles the complete flow:
 * 1. Create/join room via signaling server
 * 2. Exchange WebRTC signals (SDP offers/answers, ICE candidates)
 * 3. Form mesh with all peers
 * 4. Return transport adapter for rollback-netcode
 */

import type { TransportAdapter } from 'rollback-netcode';
import {
  createSignalingClient,
  type SignalingClient,
  SignalingError,
} from './signaling-client';
import type {
  ConnectionError,
  ConnectionResult,
  ConnectionState,
  NetworkingConfig,
  RoomEvent,
} from './types';
import { DEFAULT_NETWORKING_CONFIG } from './types';
import { type OutgoingSignal, WebRTCMesh } from './webrtc-mesh';
import {
  createWebRTCTransport,
  type WebRTCTransport,
} from './webrtc-transport';

/** Signal with retry tracking */
interface PendingSignal extends OutgoingSignal {
  retryCount: number;
}

/** Maximum retry attempts for failed signals */
const MAX_SIGNAL_RETRIES = 3;

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
  private transport: WebRTCTransport | null = null;

  private _state: ConnectionState = { status: 'idle' };
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  // Pending signal queue (signals generated before we can send them)
  private pendingSignals: PendingSignal[] = [];

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

      // Create transport
      this.transport = createWebRTCTransport(this.mesh);
      this.wireTransportCallbacks();

      // Start polling for signals and events
      this.startPolling();

      this.setState({ status: 'connected', roomCode: result.roomCode });

      return {
        roomCode: result.roomCode,
        localPeerId: result.hostId,
        isHost: true,
        hostPeerId: result.hostId,
        allPeerIds: [result.hostId],
      };
    } catch (error) {
      const connError = this.toConnectionError(error);
      this.setState({ status: 'error', error: connError });
      throw connError;
    }
  }

  /**
   * Join an existing room.
   *
   * Returns when the mesh is fully formed (connected to all peers).
   */
  async joinRoom(roomCode: string): Promise<ConnectionResult> {
    this.checkNotDisposed();
    this.ensureIdle();

    this.setState({ status: 'joining-room', roomCode });

    try {
      // Create signaling client
      this.signalingClient = createSignalingClient(this.config.signaling);

      // Join room on signaling server
      const result = await this.signalingClient.joinRoom(roomCode);

      const allPeerIds = [result.hostId, ...result.existingPeers];
      const totalPeers = allPeerIds.length;

      this.setState({
        status: 'forming-mesh',
        roomCode,
        connectedPeers: 0,
        totalPeers,
      });

      // Create mesh and wait for completion
      const meshResult = await this.createGuestMesh(
        result.guestId,
        result.hostId,
        result.existingPeers,
        roomCode,
        totalPeers,
      );

      // Create transport
      this.transport = createWebRTCTransport(meshResult.mesh);
      this.wireTransportCallbacks();

      // Start polling for signals (mesh creation already started polling)
      // Polling is already started in createGuestMesh

      this.setState({ status: 'connected', roomCode });

      return {
        roomCode,
        localPeerId: result.guestId,
        isHost: false,
        hostPeerId: result.hostId,
        allPeerIds: [result.guestId, ...allPeerIds],
      };
    } catch (error) {
      const connError = this.toConnectionError(error);
      this.setState({ status: 'error', error: connError });
      throw connError;
    }
  }

  /**
   * Create mesh as guest and wait for it to complete.
   */
  private async createGuestMesh(
    guestId: string,
    hostId: string,
    existingPeers: string[],
    roomCode: string,
    totalPeers: number,
  ): Promise<{ mesh: WebRTCMesh }> {
    return new Promise((resolve, reject) => {
      const mesh = new WebRTCMesh(this.config.webrtc, {
        onMeshComplete: () => {
          resolve({ mesh });
        },
        onMeshFailed: (error: Error) => {
          reject(error);
        },
        onPeerConnected: (peerId: string) => {
          this.transport?.onConnect?.(peerId);
          const connected = mesh.connectedPeers.size;
          this.setState({
            status: 'forming-mesh',
            roomCode,
            connectedPeers: connected,
            totalPeers,
          });
        },
        onPeerDisconnected: (peerId: string) => {
          this.transport?.onDisconnect?.(peerId);
        },
        onMessage: (peerId: string, data: Uint8Array) => {
          this.transport?.onMessage?.(peerId, data);
        },
        onSignalNeeded: (signal: OutgoingSignal) => {
          this.queueSignal(signal);
        },
      });

      this.mesh = mesh;

      // Start polling for signals before initializing (so we can receive answers)
      this.startPolling();

      // Initialize as guest - this will start sending offers
      mesh.initializeAsGuest(guestId, hostId, existingPeers);
    });
  }

  /**
   * Disconnect from the current session.
   */
  async disconnect(): Promise<void> {
    this.stopPolling();

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
      this.transport.dispose();
      this.transport = null;
    }

    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }

    this.pendingSignals = [];
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

    this.stopPolling();
    this.transport?.dispose();
    this.mesh?.dispose();
    this.signalingClient?.dispose();

    this.transport = null;
    this.mesh = null;
    this.signalingClient = null;
    this.pendingSignals = [];
  }

  // ===========================================================================
  // Private: Mesh Creation
  // ===========================================================================

  private createMesh(): WebRTCMesh {
    return new WebRTCMesh(this.config.webrtc, {
      onPeerConnected: (peerId) => {
        this.transport?.onConnect?.(peerId);
      },
      onPeerDisconnected: (peerId) => {
        this.transport?.onDisconnect?.(peerId);
      },
      onMessage: (peerId, data) => {
        this.transport?.onMessage?.(peerId, data);
      },
      onSignalNeeded: (signal) => {
        this.queueSignal(signal);
      },
      onMeshComplete: () => {
        // Handled by joinRoom promise
      },
      onMeshFailed: () => {
        // Handled by joinRoom promise
      },
    });
  }

  private wireTransportCallbacks(): void {
    // Transport callbacks are already wired via mesh events
  }

  // ===========================================================================
  // Private: Signal Polling
  // ===========================================================================

  private startPolling(): void {
    if (this.pollIntervalId) return;

    this.pollIntervalId = setInterval(() => {
      this.pollAndProcess().catch((error) => {
        console.error('Polling error:', error);
      });
    }, this.config.signaling.pollIntervalMs);

    // Initial poll
    this.pollAndProcess().catch((error) => {
      console.error('Initial polling error:', error);
    });
  }

  private stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private async pollAndProcess(): Promise<void> {
    if (!this.signalingClient || !this.mesh) return;

    // Send any pending outgoing signals
    await this.flushPendingSignals();

    // Poll for incoming signals
    try {
      const signals = await this.signalingClient.pollSignals();
      for (const signal of signals) {
        await this.mesh.handleSignal(
          signal.fromPeerId,
          signal.type,
          signal.data,
        );
      }
    } catch (error) {
      console.error('Error polling signals:', error);
    }

    // Poll for events (host only needs this to track peer joins)
    if (this.signalingClient.isHost) {
      try {
        const events = await this.signalingClient.pollEvents();
        for (const event of events) {
          this.handleRoomEvent(event);
        }
      } catch (error) {
        console.error('Error polling events:', error);
      }
    }
  }

  private handleRoomEvent(event: RoomEvent): void {
    if (!this.mesh) return;

    switch (event.type) {
      case 'peer_joined':
        if (event.data.peerId) {
          this.mesh.addPeer(event.data.peerId);
        }
        break;
      case 'peer_left':
      case 'peer_kicked':
        if (event.data.peerId) {
          this.mesh.removePeer(event.data.peerId);
          this.transport?.onDisconnect?.(event.data.peerId);
        }
        break;
    }
  }

  private queueSignal(signal: OutgoingSignal): void {
    this.pendingSignals.push({ ...signal, retryCount: 0 });
  }

  private async flushPendingSignals(): Promise<void> {
    if (!this.signalingClient || this.pendingSignals.length === 0) return;

    const signals = [...this.pendingSignals];
    this.pendingSignals = [];

    const failedSignals: PendingSignal[] = [];

    for (const signal of signals) {
      try {
        await this.signalingClient.postSignal(
          signal.toPeerId,
          signal.type,
          signal.data,
        );
      } catch (error) {
        console.error('Error sending signal:', error);
        // Re-queue with incremented retry count if under max retries
        if (signal.retryCount < MAX_SIGNAL_RETRIES) {
          failedSignals.push({
            ...signal,
            retryCount: signal.retryCount + 1,
          });
        } else {
          console.error(
            `Signal to ${signal.toPeerId} failed after ${MAX_SIGNAL_RETRIES} retries, dropping`,
          );
        }
      }
    }

    // Re-queue failed signals for next poll cycle
    if (failedSignals.length > 0) {
      this.pendingSignals.push(...failedSignals);
    }
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

  // ===========================================================================
  // Private: Error Handling
  // ===========================================================================

  private toConnectionError(error: unknown): ConnectionError {
    if (error instanceof SignalingError) {
      return {
        code: this.mapSignalingErrorCode(error.code),
        message: error.message,
      };
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return { code: 'mesh_timeout', message: error.message };
      }
      return { code: 'network_error', message: error.message };
    }

    return { code: 'network_error', message: String(error) };
  }

  private mapSignalingErrorCode(code: string): ConnectionError['code'] {
    switch (code) {
      case 'invalid_room':
        return 'invalid_room';
      case 'room_full':
        return 'room_full';
      case 'game_in_progress':
        return 'game_in_progress';
      case 'version_mismatch':
        return 'version_mismatch';
      default:
        return 'signaling_error';
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
