/**
 * Storage interface for the signaling server.
 *
 * This abstraction allows swapping between in-memory (dev) and DynamoDB (prod).
 */

import type { Peer, Room, RoomEvent, Signal } from '../types.js';

export interface SignalingStorage {
  // Rooms
  createRoom(room: Room): Promise<void>;
  getRoom(code: string): Promise<Room | null>;
  updateRoom(code: string, updates: Partial<Room>): Promise<void>;
  deleteRoom(code: string): Promise<void>;

  // Peers
  addPeer(code: string, peer: Peer): Promise<void>;
  getPeer(code: string, peerId: string): Promise<Peer | null>;
  getPeerByToken(code: string, token: string): Promise<Peer | null>;
  getPeers(code: string): Promise<Peer[]>;
  removePeer(code: string, peerId: string): Promise<void>;

  // Signals
  addSignal(code: string, signal: Signal): Promise<void>;
  getSignals(
    code: string,
    forPeerId: string,
    since?: number,
  ): Promise<Signal[]>;

  // Events
  addEvent(code: string, event: RoomEvent): Promise<void>;
  getEvents(code: string, since?: number): Promise<RoomEvent[]>;

  // Cleanup (for in-memory only; DynamoDB uses TTL)
  cleanup?(now: number): Promise<void>;
}
