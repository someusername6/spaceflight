/**
 * Unit tests for API handlers.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../src/config';
import { createRoom } from '../src/handlers/create-room';
import { deleteRoom } from '../src/handlers/delete-room';
import { getEvents } from '../src/handlers/get-events';
import { getSignals } from '../src/handlers/get-signals';
import { health } from '../src/handlers/health';
import { joinRoom } from '../src/handlers/join-room';
import { kick } from '../src/handlers/kick';
import { leaveRoom } from '../src/handlers/leave-room';
import { postSignal } from '../src/handlers/post-signal';
import { setState } from '../src/handlers/set-state';
import type { RateLimiter } from '../src/rate-limiter/dynamodb-rate-limiter';
import type { RouteContext } from '../src/router';
import type { Peer, Room, SignalingStorage } from '../src/storage/types';

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

// Mock storage factory
function createMockStorage(): SignalingStorage {
  return {
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
    addPeer: vi.fn(),
    getPeer: vi.fn(),
    getPeerByToken: vi.fn(),
    removePeer: vi.fn(),
    listPeers: vi.fn(),
    kickPeer: vi.fn(),
    addSignal: vi.fn(),
    getSignals: vi.fn(),
    addEvent: vi.fn(),
    getEvents: vi.fn(),
  };
}

// Mock rate limiter factory
function createMockRateLimiter(allowed = true): RateLimiter {
  return {
    checkJoin: vi.fn().mockResolvedValue({ allowed, remaining: 4 }),
    checkCreate: vi.fn().mockResolvedValue({ allowed, remaining: 9 }),
    checkSignal: vi.fn().mockResolvedValue({ allowed, remaining: 19 }),
  };
}

// Context factory
function createContext(overrides: Partial<RouteContext> = {}): RouteContext {
  return {
    method: 'GET',
    path: '/health',
    clientIp: '127.0.0.1',
    query: {},
    storage: createMockStorage(),
    rateLimiter: createMockRateLimiter(),
    config: testConfig,
    ...overrides,
  };
}

// Test fixtures
const testRoom: Room = {
  code: 'TESTROOM',
  hostId: 'peer-host123',
  gameVersion: '1.0.0',
  state: 'lobby',
  createdAt: Math.floor(Date.now() / 1000),
  lastActivity: Math.floor(Date.now() / 1000),
  kickedCallsigns: [],
};

const hostPeer: Peer = {
  id: 'peer-host123',
  token: 'host-token-123',
  callsign: 'Host',
  joinedAt: Math.floor(Date.now() / 1000),
};

const guestPeer: Peer = {
  id: 'peer-guest456',
  token: 'guest-token-456',
  callsign: 'Guest',
  joinedAt: Math.floor(Date.now() / 1000),
};

describe('Handlers', () => {
  describe('health', () => {
    it('returns status ok', async () => {
      const ctx = createContext();
      const result = await health(ctx);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: 'ok' });
    });
  });

  describe('createRoom', () => {
    it('creates room successfully', async () => {
      const storage = createMockStorage();
      const ctx = createContext({ storage, body: { gameVersion: '1.0.0' } });

      const result = await createRoom(ctx);

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('roomCode');
      expect(result.body).toHaveProperty('hostId');
      expect(result.body).toHaveProperty('hostToken');
      expect(storage.createRoom).toHaveBeenCalled();
      expect(storage.addPeer).toHaveBeenCalled();
    });

    it('returns 429 when rate limited', async () => {
      const ctx = createContext({
        rateLimiter: createMockRateLimiter(false),
      });

      const result = await createRoom(ctx);

      expect(result.status).toBe(429);
    });

    it('retries on room code collision', async () => {
      const storage = createMockStorage();
      const error = new Error('Collision');
      error.name = 'ConditionalCheckFailedException';

      // First call fails, second succeeds
      vi.mocked(storage.createRoom)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      const ctx = createContext({ storage });
      const result = await createRoom(ctx);

      expect(result.status).toBe(200);
      expect(storage.createRoom).toHaveBeenCalledTimes(2);
    });

    it('returns 503 when throttled', async () => {
      const storage = createMockStorage();
      const error = new Error('Throttled');
      error.name = 'ProvisionedThroughputExceededException';
      vi.mocked(storage.createRoom).mockRejectedValue(error);

      const ctx = createContext({ storage });
      const result = await createRoom(ctx);

      expect(result.status).toBe(503);
    });
  });

  describe('joinRoom', () => {
    it('joins room successfully', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.listPeers).mockResolvedValue([hostPeer]);

      const ctx = createContext({
        storage,
        body: { callsign: 'Player1' },
      });

      const result = await joinRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('guestId');
      expect(result.body).toHaveProperty('guestToken');
      expect(result.body).toHaveProperty('hostId', 'peer-host123');
      expect(result.body).toHaveProperty('existingPeers');
    });

    it('returns 404 for non-existent room', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(null);

      const ctx = createContext({ storage });
      const result = await joinRoom(ctx, 'NOROOM');

      expect(result.status).toBe(404);
    });

    it('returns 403 for kicked callsign', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue({
        ...testRoom,
        kickedCallsigns: ['BadPlayer'],
      });

      const ctx = createContext({
        storage,
        body: { callsign: 'BadPlayer' },
      });

      const result = await joinRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(403);
    });

    it('returns 403 when room is full', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.listPeers).mockResolvedValue([
        hostPeer,
        guestPeer,
        { ...guestPeer, id: 'p3' },
        { ...guestPeer, id: 'p4' },
      ]);

      const ctx = createContext({ storage });
      const result = await joinRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      const ctx = createContext({
        rateLimiter: createMockRateLimiter(false),
      });

      const result = await joinRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(429);
    });
  });

  describe('leaveRoom', () => {
    it('leaves room successfully', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
      });

      const result = await leaveRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(storage.removePeer).toHaveBeenCalledWith(
        'TESTROOM',
        'peer-guest456',
      );
    });

    it('returns 401 without token', async () => {
      const ctx = createContext();
      const result = await leaveRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(401);
    });

    it('returns 401 for invalid token', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(null);

      const ctx = createContext({
        storage,
        authorization: 'Bearer bad-token',
      });

      const result = await leaveRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(401);
    });
  });

  describe('deleteRoom', () => {
    it('deletes room successfully as host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(hostPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer host-token-123',
      });

      const result = await deleteRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(storage.deleteRoom).toHaveBeenCalledWith('TESTROOM');
    });

    it('returns 403 for non-host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
      });

      const result = await deleteRoom(ctx, 'TESTROOM');

      expect(result.status).toBe(403);
    });
  });

  describe('postSignal', () => {
    it('posts signal successfully', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        body: {
          toPeerId: 'peer-host123',
          type: 'offer',
          data: { sdp: 'test' },
        },
      });

      const result = await postSignal(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(storage.addSignal).toHaveBeenCalledWith('TESTROOM', {
        fromPeerId: 'peer-guest456',
        toPeerId: 'peer-host123',
        type: 'offer',
        data: { sdp: 'test' },
      });
    });

    it('returns 400 for missing toPeerId', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        body: { type: 'offer' },
      });

      const result = await postSignal(ctx, 'TESTROOM');

      expect(result.status).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        rateLimiter: createMockRateLimiter(false),
        body: { toPeerId: 'peer-host123', type: 'offer' },
      });

      const result = await postSignal(ctx, 'TESTROOM');

      expect(result.status).toBe(429);
    });
  });

  describe('getSignals', () => {
    it('gets signals successfully', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);
      vi.mocked(storage.getSignals).mockResolvedValue([
        {
          fromPeerId: 'peer-host123',
          toPeerId: 'peer-guest456',
          type: 'offer',
          data: {},
        },
      ]);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        query: { since: '0' },
      });

      const result = await getSignals(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('signals');
    });

    it('converts milliseconds to seconds for since', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);
      vi.mocked(storage.getSignals).mockResolvedValue([]);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        query: { since: '1704067200000' }, // ms timestamp
      });

      await getSignals(ctx, 'TESTROOM');

      expect(storage.getSignals).toHaveBeenCalledWith(
        'TESTROOM',
        'peer-guest456',
        1704067200, // converted to seconds
      );
    });
  });

  describe('getEvents', () => {
    it('gets events successfully as host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(hostPeer);
      vi.mocked(storage.getEvents).mockResolvedValue([
        { type: 'peer_joined', data: { peerId: 'peer-guest456' } },
      ]);

      const ctx = createContext({
        storage,
        authorization: 'Bearer host-token-123',
      });

      const result = await getEvents(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('events');
    });

    it('returns 403 for non-host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
      });

      const result = await getEvents(ctx, 'TESTROOM');

      expect(result.status).toBe(403);
    });
  });

  describe('kick', () => {
    it('kicks peer successfully as host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(hostPeer);
      vi.mocked(storage.getPeer).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer host-token-123',
        body: { peerId: 'peer-guest456' },
      });

      const result = await kick(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(storage.kickPeer).toHaveBeenCalledWith(
        'TESTROOM',
        'peer-guest456',
        'Guest',
      );
    });

    it('returns 403 for non-host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        body: { peerId: 'peer-host123' },
      });

      const result = await kick(ctx, 'TESTROOM');

      expect(result.status).toBe(403);
    });

    it('returns 400 when trying to kick host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(hostPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer host-token-123',
        body: { peerId: 'peer-host123' },
      });

      const result = await kick(ctx, 'TESTROOM');

      expect(result.status).toBe(400);
    });
  });

  describe('setState', () => {
    it('sets state successfully as host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(hostPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer host-token-123',
        body: { state: 'playing' },
      });

      const result = await setState(ctx, 'TESTROOM');

      expect(result.status).toBe(200);
      expect(storage.updateRoom).toHaveBeenCalledWith('TESTROOM', {
        state: 'playing',
        lastActivity: expect.any(Number),
      });
    });

    it('returns 403 for non-host', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(guestPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer guest-token-456',
        body: { state: 'playing' },
      });

      const result = await setState(ctx, 'TESTROOM');

      expect(result.status).toBe(403);
    });

    it('returns 400 for missing state', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.getRoom).mockResolvedValue(testRoom);
      vi.mocked(storage.getPeerByToken).mockResolvedValue(hostPeer);

      const ctx = createContext({
        storage,
        authorization: 'Bearer host-token-123',
        body: {},
      });

      const result = await setState(ctx, 'TESTROOM');

      expect(result.status).toBe(400);
    });
  });
});
