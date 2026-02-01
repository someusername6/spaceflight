/**
 * Router Send Helpers - Standalone message sending functions.
 *
 * These functions provide convenient ways to send messages through a router.
 * Extracted from MessageRouter class for file size management.
 */

import type { TransportAdapter } from 'rollback-netcode';
import { encodeMessage } from './encode';
import type { GameMessage } from './messages';

/**
 * Send a message to the host peer.
 * No-op if local peer is the host.
 */
export function sendToHost(
  transport: TransportAdapter,
  hostPeerId: string,
  isHost: boolean,
  msg: GameMessage,
): void {
  if (isHost) return;
  const data = encodeMessage(msg);
  transport.send(hostPeerId, data, true);
}

/**
 * Send a message to a specific peer.
 */
export function sendToPeer(
  transport: TransportAdapter,
  peerId: string,
  msg: GameMessage,
): void {
  const data = encodeMessage(msg);
  transport.send(peerId, data, true);
}

/**
 * Broadcast a message to all connected peers.
 */
export function broadcastMessage(
  transport: TransportAdapter,
  msg: GameMessage,
): void {
  const data = encodeMessage(msg);
  transport.broadcast(data, true);
}

/**
 * Broadcast a message to all peers except one.
 * Useful for host broadcasting after receiving a message from a guest.
 */
export function broadcastExcept(
  transport: TransportAdapter,
  msg: GameMessage,
  excludePeerId: string,
): void {
  const data = encodeMessage(msg);
  for (const peerId of transport.connectedPeers) {
    if (peerId !== excludePeerId) {
      transport.send(peerId, data, true);
    }
  }
}
