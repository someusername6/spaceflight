/**
 * Unit tests for DynamoDB storage adapter.
 * Uses an in-memory mock to simulate DynamoDB operations.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../src/config';
import type { Peer, Room, RoomEvent, Signal } from '../src/storage/types';

// In-memory mock storage for testing without DynamoDB
class MockDynamoDBStorage {
  private items: Map<string, Record<string, unknown>> = new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  private key(pk: string, sk: string): string {
    return `${pk}|${sk}`;
  }

  async createRoom(room: Room): Promise<void> {
    const pk = `ROOM#${room.code}`;
    const sk = '#META';
    const k = this.key(pk, sk);

    if (this.items.has(k)) {
      const error = new Error('Room already exists');
      error.name = 'ConditionalCheckFailedException';
      throw error;
    }

    const now = Math.floor(Date.now() / 1000);
    this.items.set(k, {
      PK: pk,
      SK: sk,
      ...room,
      expiresAt: now + this.config.roomExpirySeconds,
    });
  }

  async getRoom(code: string): Promise<Room | null> {
    const item = this.items.get(this.key(`ROOM#${code}`, '#META'));
    if (!item) return null;
    return {
      code: item.code as string,
      hostId: item.hostId as string,
      gameVersion: item.gameVersion as string,
      state: item.state as string,
      createdAt: item.createdAt as number,
      lastActivity: item.lastActivity as number,
      kickedCallsigns: (item.kickedCallsigns as string[]) ?? [],
    };
  }

  async updateRoom(code: string, updates: Partial<Room>): Promise<void> {
    const k = this.key(`ROOM#${code}`, '#META');
    const item = this.items.get(k);
    if (!item) return;
    Object.assign(item, updates);
  }

  async deleteRoom(code: string): Promise<void> {
    const prefix = `ROOM#${code}`;
    const peers = await this.listPeers(code);

    // Delete all room items
    for (const [key] of this.items) {
      if (key.startsWith(`${prefix}|`)) {
        this.items.delete(key);
      }
    }

    // Delete token indices
    for (const peer of peers) {
      this.items.delete(this.key(`TOKEN#${peer.token}`, '#'));
    }
  }

  async addPeer(code: string, peer: Peer): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.roomExpirySeconds;

    // Add peer
    this.items.set(this.key(`ROOM#${code}`, `PEER#${peer.id}`), {
      PK: `ROOM#${code}`,
      SK: `PEER#${peer.id}`,
      ...peer,
      expiresAt,
    });

    // Add token index
    this.items.set(this.key(`TOKEN#${peer.token}`, '#'), {
      PK: `TOKEN#${peer.token}`,
      SK: '#',
      roomCode: code,
      peerId: peer.id,
      expiresAt,
    });

    // Add event
    const eventId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    this.items.set(this.key(`ROOM#${code}`, `EVT#${now}#${eventId}`), {
      PK: `ROOM#${code}`,
      SK: `EVT#${now}#${eventId}`,
      type: 'peer_joined',
      data: { peerId: peer.id, callsign: peer.callsign },
      createdAt: now,
      expiresAt: now + this.config.signalExpirySeconds,
    });
  }

  async getPeer(code: string, peerId: string): Promise<Peer | null> {
    const item = this.items.get(this.key(`ROOM#${code}`, `PEER#${peerId}`));
    if (!item) return null;
    return {
      id: item.id as string,
      token: item.token as string,
      callsign: item.callsign as string,
      joinedAt: item.joinedAt as number,
    };
  }

  async getPeerByToken(code: string, token: string): Promise<Peer | null> {
    const tokenItem = this.items.get(this.key(`TOKEN#${token}`, '#'));
    if (!tokenItem || tokenItem.roomCode !== code) return null;
    return this.getPeer(code, tokenItem.peerId as string);
  }

  async removePeer(code: string, peerId: string): Promise<void> {
    const peer = await this.getPeer(code, peerId);
    if (!peer) return;

    const now = Math.floor(Date.now() / 1000);

    // Delete peer
    this.items.delete(this.key(`ROOM#${code}`, `PEER#${peerId}`));

    // Delete token index
    this.items.delete(this.key(`TOKEN#${peer.token}`, '#'));

    // Add event
    const eventId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    this.items.set(this.key(`ROOM#${code}`, `EVT#${now}#${eventId}`), {
      PK: `ROOM#${code}`,
      SK: `EVT#${now}#${eventId}`,
      type: 'peer_left',
      data: { peerId },
      createdAt: now,
      expiresAt: now + this.config.signalExpirySeconds,
    });
  }

  async listPeers(code: string): Promise<Peer[]> {
    const peers: Peer[] = [];
    const prefix = `ROOM#${code}|PEER#`;
    for (const [key, item] of this.items) {
      if (key.startsWith(prefix)) {
        peers.push({
          id: item.id as string,
          token: item.token as string,
          callsign: item.callsign as string,
          joinedAt: item.joinedAt as number,
        });
      }
    }
    return peers;
  }

  async kickPeer(
    code: string,
    peerId: string,
    callsign: string,
  ): Promise<void> {
    const peer = await this.getPeer(code, peerId);
    if (!peer) return;

    const now = Math.floor(Date.now() / 1000);

    // Update room's kickedCallsigns
    const room = await this.getRoom(code);
    if (room) {
      room.kickedCallsigns.push(callsign);
      await this.updateRoom(code, { kickedCallsigns: room.kickedCallsigns });
    }

    // Delete peer
    this.items.delete(this.key(`ROOM#${code}`, `PEER#${peerId}`));

    // Delete token index
    this.items.delete(this.key(`TOKEN#${peer.token}`, '#'));

    // Add kick event
    const eventId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    this.items.set(this.key(`ROOM#${code}`, `EVT#${now}#${eventId}`), {
      PK: `ROOM#${code}`,
      SK: `EVT#${now}#${eventId}`,
      type: 'peer_kicked',
      data: { peerId, callsign },
      createdAt: now,
      expiresAt: now + this.config.signalExpirySeconds,
    });
  }

  async addSignal(code: string, signal: Signal): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const signalId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    this.items.set(
      this.key(`ROOM#${code}`, `SIG#${signal.toPeerId}#${now}#${signalId}`),
      {
        PK: `ROOM#${code}`,
        SK: `SIG#${signal.toPeerId}#${now}#${signalId}`,
        fromPeerId: signal.fromPeerId,
        toPeerId: signal.toPeerId,
        type: signal.type,
        data: signal.data,
        createdAt: now,
        expiresAt: now + this.config.signalExpirySeconds,
      },
    );
  }

  async getSignals(
    code: string,
    peerId: string,
    since: number,
  ): Promise<Signal[]> {
    const signals: Signal[] = [];
    const prefix = `ROOM#${code}|SIG#${peerId}#`;
    for (const [key, item] of this.items) {
      if (key.startsWith(prefix) && (item.createdAt as number) > since) {
        signals.push({
          fromPeerId: item.fromPeerId as string,
          toPeerId: item.toPeerId as string,
          type: item.type as string,
          data: item.data,
        });
      }
    }
    return signals;
  }

  async addEvent(code: string, event: RoomEvent): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const eventId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    this.items.set(this.key(`ROOM#${code}`, `EVT#${now}#${eventId}`), {
      PK: `ROOM#${code}`,
      SK: `EVT#${now}#${eventId}`,
      type: event.type,
      data: event.data,
      createdAt: now,
      expiresAt: now + this.config.signalExpirySeconds,
    });
  }

  async getEvents(code: string, since: number): Promise<RoomEvent[]> {
    const events: RoomEvent[] = [];
    const prefix = `ROOM#${code}|EVT#`;
    for (const [key, item] of this.items) {
      if (key.startsWith(prefix) && (item.createdAt as number) > since) {
        events.push({
          type: item.type as string,
          data: item.data as Record<string, unknown>,
        });
      }
    }
    return events;
  }
}

// Test config
const testConfig: Config = {
  tableName: 'test-table',
  maxPeersPerRoom: 4,
  roomExpirySeconds: 3600,
  signalExpirySeconds: 60,
  joinRateLimitPerSecond: 5,
  createRateLimitPerMinute: 10,
  signalRateLimitPerSecond: 20,
};

describe('DynamoDB Storage', () => {
  let storage: MockDynamoDBStorage;

  beforeEach(() => {
    storage = new MockDynamoDBStorage(testConfig);
  });

  describe('Room operations', () => {
    const testRoom: Room = {
      code: 'TESTROOM',
      hostId: 'peer-host123',
      gameVersion: '1.0.0',
      state: 'lobby',
      createdAt: Math.floor(Date.now() / 1000),
      lastActivity: Math.floor(Date.now() / 1000),
      kickedCallsigns: [],
    };

    it('createRoom succeeds for new room', async () => {
      await storage.createRoom(testRoom);
      const room = await storage.getRoom('TESTROOM');
      expect(room).not.toBeNull();
      expect(room?.code).toBe('TESTROOM');
      expect(room?.hostId).toBe('peer-host123');
    });

    it('createRoom fails for existing room', async () => {
      await storage.createRoom(testRoom);
      await expect(storage.createRoom(testRoom)).rejects.toThrow();
    });

    it('getRoom returns null for non-existent room', async () => {
      const room = await storage.getRoom('NONEXISTENT');
      expect(room).toBeNull();
    });

    it('getRoom returns room data for existing room', async () => {
      await storage.createRoom(testRoom);
      const room = await storage.getRoom('TESTROOM');
      expect(room).toEqual(
        expect.objectContaining({
          code: 'TESTROOM',
          hostId: 'peer-host123',
          gameVersion: '1.0.0',
          state: 'lobby',
        }),
      );
    });

    it('updateRoom modifies specific fields', async () => {
      await storage.createRoom(testRoom);
      await storage.updateRoom('TESTROOM', { state: 'playing' });
      const room = await storage.getRoom('TESTROOM');
      expect(room?.state).toBe('playing');
      expect(room?.hostId).toBe('peer-host123'); // unchanged
    });

    it('deleteRoom removes room and all associated items', async () => {
      await storage.createRoom(testRoom);
      const peer: Peer = {
        id: 'peer-guest1',
        token: 'token123',
        callsign: 'Player1',
        joinedAt: Math.floor(Date.now() / 1000),
      };
      await storage.addPeer('TESTROOM', peer);

      await storage.deleteRoom('TESTROOM');

      expect(await storage.getRoom('TESTROOM')).toBeNull();
      expect(await storage.getPeer('TESTROOM', 'peer-guest1')).toBeNull();
      expect(await storage.getPeerByToken('TESTROOM', 'token123')).toBeNull();
    });
  });

  describe('Peer operations', () => {
    const testRoom: Room = {
      code: 'TESTROOM',
      hostId: 'peer-host123',
      gameVersion: '1.0.0',
      state: 'lobby',
      createdAt: Math.floor(Date.now() / 1000),
      lastActivity: Math.floor(Date.now() / 1000),
      kickedCallsigns: [],
    };

    const testPeer: Peer = {
      id: 'peer-guest1',
      token: 'token123',
      callsign: 'Player1',
      joinedAt: Math.floor(Date.now() / 1000),
    };

    beforeEach(async () => {
      await storage.createRoom(testRoom);
    });

    it('addPeer creates peer, token index, and event atomically', async () => {
      await storage.addPeer('TESTROOM', testPeer);

      const peer = await storage.getPeer('TESTROOM', 'peer-guest1');
      expect(peer).not.toBeNull();
      expect(peer?.callsign).toBe('Player1');

      const peerByToken = await storage.getPeerByToken('TESTROOM', 'token123');
      expect(peerByToken).not.toBeNull();

      const events = await storage.getEvents('TESTROOM', 0);
      expect(events.some((e) => e.type === 'peer_joined')).toBe(true);
    });

    it('getPeer returns null for non-existent peer', async () => {
      const peer = await storage.getPeer('TESTROOM', 'nonexistent');
      expect(peer).toBeNull();
    });

    it('getPeerByToken returns peer for valid token', async () => {
      await storage.addPeer('TESTROOM', testPeer);
      const peer = await storage.getPeerByToken('TESTROOM', 'token123');
      expect(peer).not.toBeNull();
      expect(peer?.id).toBe('peer-guest1');
    });

    it('getPeerByToken returns null for invalid token', async () => {
      await storage.addPeer('TESTROOM', testPeer);
      const peer = await storage.getPeerByToken('TESTROOM', 'wrongtoken');
      expect(peer).toBeNull();
    });

    it('getPeerByToken returns null for wrong room', async () => {
      await storage.addPeer('TESTROOM', testPeer);
      const peer = await storage.getPeerByToken('WRONGROOM', 'token123');
      expect(peer).toBeNull();
    });

    it('removePeer deletes peer, token index, and adds event', async () => {
      await storage.addPeer('TESTROOM', testPeer);
      await storage.removePeer('TESTROOM', 'peer-guest1');

      expect(await storage.getPeer('TESTROOM', 'peer-guest1')).toBeNull();
      expect(await storage.getPeerByToken('TESTROOM', 'token123')).toBeNull();

      const events = await storage.getEvents('TESTROOM', 0);
      expect(events.some((e) => e.type === 'peer_left')).toBe(true);
    });

    it('listPeers returns all peers in room', async () => {
      await storage.addPeer('TESTROOM', testPeer);
      await storage.addPeer('TESTROOM', {
        id: 'peer-guest2',
        token: 'token456',
        callsign: 'Player2',
        joinedAt: Math.floor(Date.now() / 1000),
      });

      const peers = await storage.listPeers('TESTROOM');
      expect(peers).toHaveLength(2);
      expect(peers.map((p) => p.id).sort()).toEqual([
        'peer-guest1',
        'peer-guest2',
      ]);
    });
  });

  describe('Kick operations', () => {
    it('kickPeer updates kickedCallsigns, removes peer, adds event', async () => {
      const room: Room = {
        code: 'TESTROOM',
        hostId: 'peer-host123',
        gameVersion: '1.0.0',
        state: 'lobby',
        createdAt: Math.floor(Date.now() / 1000),
        lastActivity: Math.floor(Date.now() / 1000),
        kickedCallsigns: [],
      };
      await storage.createRoom(room);

      const peer: Peer = {
        id: 'peer-guest1',
        token: 'token123',
        callsign: 'BadPlayer',
        joinedAt: Math.floor(Date.now() / 1000),
      };
      await storage.addPeer('TESTROOM', peer);

      await storage.kickPeer('TESTROOM', 'peer-guest1', 'BadPlayer');

      // Peer should be removed
      expect(await storage.getPeer('TESTROOM', 'peer-guest1')).toBeNull();
      expect(await storage.getPeerByToken('TESTROOM', 'token123')).toBeNull();

      // Callsign should be in kicked list
      const updatedRoom = await storage.getRoom('TESTROOM');
      expect(updatedRoom?.kickedCallsigns).toContain('BadPlayer');

      // Event should be added
      const events = await storage.getEvents('TESTROOM', 0);
      expect(events.some((e) => e.type === 'peer_kicked')).toBe(true);
    });
  });

  describe('Signal operations', () => {
    beforeEach(async () => {
      const room: Room = {
        code: 'TESTROOM',
        hostId: 'peer-host123',
        gameVersion: '1.0.0',
        state: 'lobby',
        createdAt: Math.floor(Date.now() / 1000),
        lastActivity: Math.floor(Date.now() / 1000),
        kickedCallsigns: [],
      };
      await storage.createRoom(room);
    });

    it('addSignal creates signal with correct data', async () => {
      const signal: Signal = {
        fromPeerId: 'peer-a',
        toPeerId: 'peer-b',
        type: 'offer',
        data: { sdp: 'test-sdp' },
      };
      await storage.addSignal('TESTROOM', signal);

      const signals = await storage.getSignals('TESTROOM', 'peer-b', 0);
      expect(signals).toHaveLength(1);
      expect(signals[0].fromPeerId).toBe('peer-a');
      expect(signals[0].type).toBe('offer');
    });

    it('getSignals returns only signals for specified peer', async () => {
      await storage.addSignal('TESTROOM', {
        fromPeerId: 'peer-a',
        toPeerId: 'peer-b',
        type: 'offer',
        data: {},
      });
      await storage.addSignal('TESTROOM', {
        fromPeerId: 'peer-a',
        toPeerId: 'peer-c',
        type: 'offer',
        data: {},
      });

      const signalsB = await storage.getSignals('TESTROOM', 'peer-b', 0);
      const signalsC = await storage.getSignals('TESTROOM', 'peer-c', 0);

      expect(signalsB).toHaveLength(1);
      expect(signalsC).toHaveLength(1);
    });

    it('getSignals filters by since timestamp', async () => {
      const oldTime = Math.floor(Date.now() / 1000) - 10;

      await storage.addSignal('TESTROOM', {
        fromPeerId: 'peer-a',
        toPeerId: 'peer-b',
        type: 'offer',
        data: {},
      });

      // Query with timestamp in the future should return nothing
      const signals = await storage.getSignals(
        'TESTROOM',
        'peer-b',
        Math.floor(Date.now() / 1000) + 100,
      );
      expect(signals).toHaveLength(0);

      // Query with old timestamp should return the signal
      const signalsOld = await storage.getSignals(
        'TESTROOM',
        'peer-b',
        oldTime,
      );
      expect(signalsOld).toHaveLength(1);
    });
  });

  describe('Event operations', () => {
    beforeEach(async () => {
      const room: Room = {
        code: 'TESTROOM',
        hostId: 'peer-host123',
        gameVersion: '1.0.0',
        state: 'lobby',
        createdAt: Math.floor(Date.now() / 1000),
        lastActivity: Math.floor(Date.now() / 1000),
        kickedCallsigns: [],
      };
      await storage.createRoom(room);
    });

    it('addEvent creates event', async () => {
      const event: RoomEvent = {
        type: 'custom_event',
        data: { message: 'test' },
      };
      await storage.addEvent('TESTROOM', event);

      const events = await storage.getEvents('TESTROOM', 0);
      expect(events.some((e) => e.type === 'custom_event')).toBe(true);
    });

    it('getEvents filters by since timestamp', async () => {
      await storage.addEvent('TESTROOM', {
        type: 'test_event',
        data: {},
      });

      // Query with timestamp in the future should return nothing
      const events = await storage.getEvents(
        'TESTROOM',
        Math.floor(Date.now() / 1000) + 100,
      );
      expect(events.filter((e) => e.type === 'test_event')).toHaveLength(0);

      // Query with old timestamp should return the event
      const eventsOld = await storage.getEvents(
        'TESTROOM',
        Math.floor(Date.now() / 1000) - 10,
      );
      expect(eventsOld.some((e) => e.type === 'test_event')).toBe(true);
    });
  });
});
