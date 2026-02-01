/**
 * Signal Poller - Handles periodic polling of signaling server.
 *
 * Extracted from ConnectionFlow to keep file sizes manageable.
 * Polls for incoming signals and room events, and flushes outgoing signals.
 */

import type { SignalQueue } from './signal-queue';
import type { SignalingClient } from './signaling-client';
import type { RoomEvent } from './types';
import type { WebRTCMesh } from './webrtc-mesh';
import type { WebRTCTransport } from './webrtc-transport';

/** Dependencies needed for signal polling */
export interface SignalPollerDeps {
  getSignalingClient: () => SignalingClient | null;
  getMesh: () => WebRTCMesh | null;
  getRawTransport: () => WebRTCTransport | null;
  signalQueue: SignalQueue;
  pollIntervalMs: number;
}

/**
 * Creates a signal poller that handles signaling server communication.
 */
export function createSignalPoller(deps: SignalPollerDeps) {
  let pollIntervalId: ReturnType<typeof setInterval> | null = null;

  async function pollAndProcess(): Promise<void> {
    const signalingClient = deps.getSignalingClient();
    const mesh = deps.getMesh();
    if (!signalingClient || !mesh) return;

    // Send any pending outgoing signals
    await deps.signalQueue.flush(signalingClient);

    // Poll for incoming signals
    try {
      const signals = await signalingClient.pollSignals();
      for (const signal of signals) {
        await mesh.handleSignal(signal.fromPeerId, signal.type, signal.data);
      }
    } catch (error) {
      console.error('Error polling signals:', error);
    }

    // Poll for events (host only needs this to track peer joins)
    if (signalingClient.isHost) {
      try {
        const events = await signalingClient.pollEvents();
        for (const event of events) {
          handleRoomEvent(event, mesh, deps.getRawTransport());
        }
      } catch (error) {
        console.error('Error polling events:', error);
      }
    }
  }

  function start(): void {
    if (pollIntervalId) return;

    pollIntervalId = setInterval(() => {
      pollAndProcess().catch((error) => {
        console.error('Polling error:', error);
      });
    }, deps.pollIntervalMs);

    // Initial poll
    pollAndProcess().catch((error) => {
      console.error('Initial polling error:', error);
    });
  }

  function stop(): void {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }

  return { start, stop };
}

function handleRoomEvent(
  event: RoomEvent,
  mesh: WebRTCMesh,
  rawTransport: WebRTCTransport | null,
): void {
  switch (event.type) {
    case 'peer_joined':
      if (event.data.peerId) {
        mesh.addPeer(event.data.peerId);
      }
      break;
    case 'peer_left':
    case 'peer_kicked':
      if (event.data.peerId) {
        mesh.removePeer(event.data.peerId);
        rawTransport?.onDisconnect?.(event.data.peerId);
      }
      break;
  }
}
