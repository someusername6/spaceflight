/**
 * In-memory storage implementation for local development.
 */

import type { Config } from '../config.js';
import type { Peer, Room, RoomEvent, Signal } from '../types.js';
import type { SignalingStorage } from './types.js';

interface RoomData {
  room: Room;
  peers: Map<string, Peer>;
  signals: Signal[];
  events: RoomEvent[];
}

/** Token index entry pointing to room and peer */
interface TokenIndex {
  roomCode: string;
  peerId: string;
}

export class MemoryStorage implements SignalingStorage {
  private rooms = new Map<string, RoomData>();
  /** Index for O(1) token lookups */
  private tokenIndex = new Map<string, TokenIndex>();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  // Rooms

  async createRoom(room: Room): Promise<void> {
    this.rooms.set(room.code, {
      room,
      peers: new Map(),
      signals: [],
      events: [],
    });
  }

  async getRoom(code: string): Promise<Room | null> {
    return this.rooms.get(code)?.room ?? null;
  }

  async updateRoom(code: string, updates: Partial<Room>): Promise<void> {
    const data = this.rooms.get(code);
    if (data) {
      data.room = { ...data.room, ...updates };
    }
  }

  async deleteRoom(code: string): Promise<void> {
    const data = this.rooms.get(code);
    if (data) {
      // Clean up token index for all peers in this room
      for (const peer of data.peers.values()) {
        this.tokenIndex.delete(peer.token);
      }
    }
    this.rooms.delete(code);
  }

  // Peers

  async addPeer(code: string, peer: Peer): Promise<void> {
    const data = this.rooms.get(code);
    if (data) {
      data.peers.set(peer.peerId, peer);
      this.tokenIndex.set(peer.token, { roomCode: code, peerId: peer.peerId });
    }
  }

  async getPeer(code: string, peerId: string): Promise<Peer | null> {
    return this.rooms.get(code)?.peers.get(peerId) ?? null;
  }

  async getPeerByToken(code: string, token: string): Promise<Peer | null> {
    const index = this.tokenIndex.get(token);
    if (!index || index.roomCode !== code) {
      return null;
    }
    return this.rooms.get(code)?.peers.get(index.peerId) ?? null;
  }

  async getPeers(code: string): Promise<Peer[]> {
    const data = this.rooms.get(code);
    if (!data) {
      return [];
    }
    return Array.from(data.peers.values());
  }

  async removePeer(code: string, peerId: string): Promise<void> {
    const data = this.rooms.get(code);
    if (data) {
      const peer = data.peers.get(peerId);
      if (peer) {
        this.tokenIndex.delete(peer.token);
      }
      data.peers.delete(peerId);
    }
  }

  // Signals

  async addSignal(code: string, signal: Signal): Promise<void> {
    const data = this.rooms.get(code);
    if (data) {
      data.signals.push(signal);
    }
  }

  async getSignals(
    code: string,
    forPeerId: string,
    since?: number,
  ): Promise<Signal[]> {
    const data = this.rooms.get(code);
    if (!data) {
      return [];
    }

    const now = Date.now();
    const cutoff = now - this.config.signalExpiryMs;

    return data.signals.filter(
      (s) =>
        s.toPeerId === forPeerId &&
        s.timestamp > cutoff &&
        (since === undefined || s.timestamp > since),
    );
  }

  // Events

  async addEvent(code: string, event: RoomEvent): Promise<void> {
    const data = this.rooms.get(code);
    if (data) {
      data.events.push(event);
    }
  }

  async getEvents(code: string, since?: number): Promise<RoomEvent[]> {
    const data = this.rooms.get(code);
    if (!data) {
      return [];
    }

    const now = Date.now();
    const cutoff = now - this.config.eventExpiryMs;

    return data.events.filter(
      (e) =>
        e.timestamp > cutoff && (since === undefined || e.timestamp > since),
    );
  }

  // Cleanup

  async cleanup(now: number): Promise<void> {
    const roomExpiryCutoff = now - this.config.roomExpiryMs;
    const signalExpiryCutoff = now - this.config.signalExpiryMs;
    const eventExpiryCutoff = now - this.config.eventExpiryMs;

    for (const [code, data] of this.rooms.entries()) {
      // Remove expired rooms
      if (data.room.lastActivity < roomExpiryCutoff) {
        // Clean up token index for all peers in this room
        for (const peer of data.peers.values()) {
          this.tokenIndex.delete(peer.token);
        }
        this.rooms.delete(code);
        continue;
      }

      // Clean up expired signals
      data.signals = data.signals.filter(
        (s) => s.timestamp > signalExpiryCutoff,
      );

      // Clean up expired events
      data.events = data.events.filter((e) => e.timestamp > eventExpiryCutoff);
    }
  }
}
