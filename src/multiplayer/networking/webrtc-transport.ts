/**
 * WebRTC Transport Adapter - Implements TransportAdapter for rollback-netcode.
 *
 * Wraps WebRTCMesh to provide the interface expected by the rollback engine.
 * This allows the game to use WebRTC for networked multiplayer.
 */

import type { ConnectionMetrics, TransportAdapter } from 'rollback-netcode';
import type { WebRTCMesh } from './webrtc-mesh';

/** Number of RTT samples to keep for calculating average and jitter */
const RTT_SAMPLE_COUNT = 10;

/** Internal metrics data for a peer */
interface PeerMetricsData {
  /** Recent RTT samples in milliseconds */
  rttSamples: number[];
  /** Pending pings: pingId -> sendTime (performance.now()) */
  pendingPings: Map<number, number>;
  /** When metrics were last updated */
  lastUpdated: number;
}

/**
 * Interface for RTT (Round-Trip Time) tracking.
 *
 * Enables measurement of network latency via application-layer ping/pong.
 * The rollback-netcode library or game code can use these methods to track
 * connection quality metrics.
 */
export interface RTTTracker {
  /**
   * Record that a ping was sent to a peer.
   * @param peerId - The peer the ping was sent to
   * @param pingId - Unique identifier for this ping (e.g., sequence number)
   */
  recordPingSent(peerId: string, pingId: number): void;

  /**
   * Record that a pong was received from a peer.
   * @param peerId - The peer the pong was received from
   * @param pingId - The identifier of the original ping
   */
  recordPongReceived(peerId: string, pingId: number): void;
}

/**
 * TransportAdapter implementation using WebRTC DataChannels.
 *
 * Also implements RTTTracker for connection quality monitoring.
 */
export class WebRTCTransport implements TransportAdapter, RTTTracker {
  private readonly mesh: WebRTCMesh;
  private readonly peerMetrics = new Map<string, PeerMetricsData>();
  private disposed = false;

  // Callbacks
  onMessage: ((peerId: string, message: Uint8Array) => void) | null = null;
  onConnect: ((peerId: string) => void) | null = null;
  onDisconnect: ((peerId: string) => void) | null = null;
  onError:
    | ((peerId: string | null, error: Error, context: string) => void)
    | null = null;

  constructor(mesh: WebRTCMesh) {
    this.mesh = mesh;
  }

  // ===========================================================================
  // TransportAdapter Interface
  // ===========================================================================

  get localPeerId(): string {
    return this.mesh.localPeerId;
  }

  get connectedPeers(): ReadonlySet<string> {
    return this.mesh.connectedPeers;
  }

  /**
   * Connect to a peer.
   *
   * Note: With WebRTC mesh, connections are established during mesh formation.
   * This method is mostly a no-op since connections are already established.
   */
  async connect(_peerId: string): Promise<void> {
    // WebRTC mesh handles connections during formation.
    // This method exists for interface compliance.
    // In future, we could support late-join connections here.
  }

  /**
   * Disconnect from a peer.
   */
  disconnect(peerId: string): void {
    this.mesh.removePeer(peerId);
    this.peerMetrics.delete(peerId);
  }

  /**
   * Disconnect from all peers.
   */
  disconnectAll(): void {
    for (const peerId of [...this.mesh.connectedPeers]) {
      this.mesh.removePeer(peerId);
    }
    this.peerMetrics.clear();
  }

  /**
   * Send a message to a specific peer.
   */
  send(peerId: string, message: Uint8Array, reliable: boolean): void {
    if (this.disposed) return;

    try {
      this.mesh.send(peerId, message, reliable);
    } catch (error) {
      this.onError?.(
        peerId,
        error instanceof Error ? error : new Error(String(error)),
        'send',
      );
    }
  }

  /**
   * Broadcast a message to all connected peers.
   */
  broadcast(message: Uint8Array, reliable: boolean): void {
    if (this.disposed) return;

    this.mesh.broadcast(message, reliable);
  }

  /**
   * Get connection metrics for a peer.
   *
   * Returns RTT statistics calculated from ping/pong measurements.
   * Call recordPingSent() when sending a ping and recordPongReceived()
   * when receiving the pong to populate these metrics.
   */
  getConnectionMetrics(peerId: string): ConnectionMetrics | null {
    const metrics = this.peerMetrics.get(peerId);
    if (!metrics || metrics.rttSamples.length === 0) {
      return null;
    }

    // Calculate average RTT
    const rtt =
      metrics.rttSamples.reduce((a, b) => a + b, 0) / metrics.rttSamples.length;

    // Calculate jitter (average deviation from mean RTT)
    let jitter = 0;
    if (metrics.rttSamples.length > 1) {
      const deviations = metrics.rttSamples.map((sample) =>
        Math.abs(sample - rtt),
      );
      jitter = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    }

    // Estimate packet loss from pending pings older than 2 seconds
    // Also clean up stale pings to prevent unbounded growth
    const now = performance.now();
    const staleThreshold = 2000;
    const stalePingIds: number[] = [];
    for (const [pingId, sendTime] of metrics.pendingPings.entries()) {
      if (now - sendTime > staleThreshold) {
        stalePingIds.push(pingId);
      }
    }
    // Clean up stale pings after counting
    for (const pingId of stalePingIds) {
      metrics.pendingPings.delete(pingId);
    }
    const totalPings = metrics.rttSamples.length + stalePingIds.length;
    const packetLoss = totalPings > 0 ? stalePingIds.length / totalPings : 0;

    return {
      rtt,
      jitter,
      packetLoss,
      lastUpdated: metrics.lastUpdated,
    };
  }

  // ===========================================================================
  // RTT Tracking
  // ===========================================================================
  //
  // These methods enable RTT measurement via application-layer ping/pong.
  // The rollback-netcode library handles keepalive pings internally and will
  // call these methods to track round-trip times.
  //
  // Usage pattern:
  //   1. When sending a ping, call recordPingSent(peerId, pingId)
  //   2. When receiving the corresponding pong, call recordPongReceived(peerId, pingId)
  //   3. Query metrics via getConnectionMetrics(peerId)
  //
  // The pingId should be a unique identifier (e.g., sequence number or timestamp)
  // that the remote peer echoes back in the pong response.

  /**
   * Record that a ping was sent to a peer.
   *
   * @param peerId - The peer the ping was sent to
   * @param pingId - Unique identifier for this ping (e.g., timestamp or sequence number)
   */
  recordPingSent(peerId: string, pingId: number): void {
    const metrics = this.getOrCreatePeerMetrics(peerId);
    metrics.pendingPings.set(pingId, performance.now());
  }

  /**
   * Record that a pong was received from a peer.
   *
   * @param peerId - The peer the pong was received from
   * @param pingId - The identifier of the original ping
   */
  recordPongReceived(peerId: string, pingId: number): void {
    const metrics = this.peerMetrics.get(peerId);
    if (!metrics) return;

    const sendTime = metrics.pendingPings.get(pingId);
    if (sendTime === undefined) return;

    // Calculate RTT and add sample
    const rtt = performance.now() - sendTime;
    metrics.rttSamples.push(rtt);

    // Keep only recent samples
    if (metrics.rttSamples.length > RTT_SAMPLE_COUNT) {
      metrics.rttSamples.shift();
    }

    metrics.pendingPings.delete(pingId);
    metrics.lastUpdated = Date.now();
  }

  private getOrCreatePeerMetrics(peerId: string): PeerMetricsData {
    let metrics = this.peerMetrics.get(peerId);
    if (!metrics) {
      metrics = {
        rttSamples: [],
        pendingPings: new Map(),
        lastUpdated: Date.now(),
      };
      this.peerMetrics.set(peerId, metrics);
    }
    return metrics;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.onMessage = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.onError = null;
    this.peerMetrics.clear();

    // Note: We don't dispose the mesh here; the ConnectionFlow owns it
  }
}

/**
 * Create a transport adapter from a WebRTC mesh.
 *
 * Also wires up the mesh events to the transport callbacks.
 */
export function createWebRTCTransport(mesh: WebRTCMesh): WebRTCTransport {
  const transport = new WebRTCTransport(mesh);

  // Note: Event wiring is done externally by ConnectionFlow
  // because the mesh is created with events before we have the transport.

  return transport;
}
