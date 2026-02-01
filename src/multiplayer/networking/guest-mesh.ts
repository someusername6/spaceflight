/**
 * Guest Mesh Creation - Creates and initializes mesh for guest players.
 */

import type { SignalQueue } from './signal-queue';
import type { ConnectionState, WebRTCMeshConfig } from './types';
import { type OutgoingSignal, WebRTCMesh } from './webrtc-mesh';
import type { WebRTCTransport } from './webrtc-transport';

/** Callbacks for guest mesh events */
export interface GuestMeshCallbacks {
  /** Get raw transport for mesh event callbacks (before TransformingTransport wrapper) */
  getRawTransport: () => WebRTCTransport | null;
  startPolling: () => void;
  setState: (state: ConnectionState) => void;
  signalQueue: SignalQueue;
  setMesh: (mesh: WebRTCMesh) => void;
}

/**
 * Create mesh as guest and wait for it to complete.
 */
export function createGuestMesh(
  config: WebRTCMeshConfig,
  guestId: string,
  hostId: string,
  existingPeers: string[],
  roomCode: string,
  totalPeers: number,
  callbacks: GuestMeshCallbacks,
): Promise<{ mesh: WebRTCMesh }> {
  return new Promise((resolve, reject) => {
    const mesh = new WebRTCMesh(config, {
      onMeshComplete: () => {
        resolve({ mesh });
      },
      onMeshFailed: (error: Error) => {
        reject(error);
      },
      onPeerConnected: (peerId: string) => {
        // Note: rawTransport is null during mesh formation, but that's OK -
        // the session queries connectedPeers on startup to get initial state.
        callbacks.getRawTransport()?.onConnect?.(peerId);
        const connected = mesh.connectedPeers.size;
        callbacks.setState({
          status: 'forming-mesh',
          roomCode,
          connectedPeers: connected,
          totalPeers,
        });
      },
      onPeerDisconnected: (peerId: string) => {
        callbacks.getRawTransport()?.onDisconnect?.(peerId);
      },
      onMessage: (peerId: string, data: Uint8Array) => {
        callbacks.getRawTransport()?.onMessage?.(peerId, data);
      },
      onSignalNeeded: (signal: OutgoingSignal) => {
        callbacks.signalQueue.queue(signal);
      },
    });

    callbacks.setMesh(mesh);

    // Start polling for signals before initializing (so we can receive answers)
    callbacks.startPolling();

    // Initialize as guest - this will start sending offers
    mesh.initializeAsGuest(guestId, hostId, existingPeers);
  });
}
