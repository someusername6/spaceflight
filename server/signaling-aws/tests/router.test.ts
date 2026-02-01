/**
 * Unit tests for request router.
 * Tests that routes match correctly - handler logic is tested separately.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../src/config';
import type { RateLimiter } from '../src/rate-limiter/dynamodb-rate-limiter';
import { type RouteContext, route } from '../src/router';
import type { SignalingStorage } from '../src/storage/types';

// Test config
const mockConfig: Config = {
  tableName: 'test-table',
  maxPeersPerRoom: 4,
  roomExpirySeconds: 3600,
  signalExpirySeconds: 60,
  joinRateLimitPerSecond: 5,
  createRateLimitPerMinute: 10,
  signalRateLimitPerSecond: 20,
};

// Mock storage that returns valid data
function createMockStorage(): SignalingStorage {
  return {
    createRoom: vi.fn().mockResolvedValue(undefined),
    getRoom: vi.fn().mockResolvedValue({
      code: 'TESTROOM',
      hostId: 'peer-host',
      gameVersion: '1.0.0',
      state: 'lobby',
      createdAt: 0,
      lastActivity: 0,
      kickedCallsigns: [],
    }),
    updateRoom: vi.fn().mockResolvedValue(undefined),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
    addPeer: vi.fn().mockResolvedValue(undefined),
    getPeer: vi.fn().mockResolvedValue({
      id: 'peer-test',
      token: 'test-token',
      callsign: 'Test',
      joinedAt: 0,
    }),
    getPeerByToken: vi.fn().mockResolvedValue({
      id: 'peer-host',
      token: 'test-token',
      callsign: 'Host',
      joinedAt: 0,
    }),
    removePeer: vi.fn().mockResolvedValue(undefined),
    listPeers: vi.fn().mockResolvedValue([]),
    kickPeer: vi.fn().mockResolvedValue(undefined),
    addSignal: vi.fn().mockResolvedValue(undefined),
    getSignals: vi.fn().mockResolvedValue([]),
    addEvent: vi.fn().mockResolvedValue(undefined),
    getEvents: vi.fn().mockResolvedValue([]),
  };
}

// Mock rate limiter
function createMockRateLimiter(): RateLimiter {
  return {
    checkJoin: vi.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
    checkCreate: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
    checkSignal: vi.fn().mockResolvedValue({ allowed: true, remaining: 19 }),
  };
}

function createContext(
  method: string,
  path: string,
  overrides: Partial<RouteContext> = {},
): RouteContext {
  return {
    method,
    path,
    clientIp: '127.0.0.1',
    authorization: 'Bearer test-token',
    query: {},
    storage: createMockStorage(),
    rateLimiter: createMockRateLimiter(),
    config: mockConfig,
    ...overrides,
  };
}

describe('Router', () => {
  describe('Route matching', () => {
    it('matches exact paths (GET /health)', async () => {
      const ctx = createContext('GET', '/health');
      const result = await route(ctx);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: 'ok' });
    });

    it('matches POST /rooms', async () => {
      const ctx = createContext('POST', '/rooms', {
        body: { gameVersion: '1.0.0' },
      });
      const result = await route(ctx);
      // Real handler returns 200 with room data
      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('roomCode');
    });

    it('matches parameterized paths (POST /rooms/ABCD1234/join)', async () => {
      const ctx = createContext('POST', '/rooms/ABCD1234/join', {
        body: { callsign: 'Player1' },
      });
      const result = await route(ctx);
      // Real handler returns 200 with join data
      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('guestId');
    });

    it('matches DELETE /rooms/:code', async () => {
      const ctx = createContext('DELETE', '/rooms/TESTROOM/');
      const result = await route(ctx);
      // Should not match (trailing slash)
      expect(result.status).toBe(404);

      const ctx2 = createContext('DELETE', '/rooms/TESTROOM');
      const result2 = await route(ctx2);
      expect(result2.status).toBe(200);
    });

    it('matches GET /rooms/:code/signals', async () => {
      const ctx = createContext('GET', '/rooms/ABCD1234/signals');
      const result = await route(ctx);
      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('signals');
    });

    it('matches GET /rooms/:code/events', async () => {
      const ctx = createContext('GET', '/rooms/ABCD1234/events');
      const result = await route(ctx);
      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('events');
    });

    it('matches POST /rooms/:code/signals', async () => {
      const ctx = createContext('POST', '/rooms/ABCD1234/signals', {
        body: { toPeerId: 'peer-target', type: 'offer', data: {} },
      });
      const result = await route(ctx);
      expect(result.status).toBe(200);
    });

    it('matches POST /rooms/:code/leave', async () => {
      const ctx = createContext('POST', '/rooms/ABCD1234/leave');
      const result = await route(ctx);
      expect(result.status).toBe(200);
    });

    it('matches POST /rooms/:code/kick', async () => {
      const storage = createMockStorage();
      // For kick, we need target peer to be different from host
      vi.mocked(storage.getPeer).mockResolvedValue({
        id: 'peer-guest',
        token: 'guest-token',
        callsign: 'Guest',
        joinedAt: 0,
      });

      const ctx = createContext('POST', '/rooms/ABCD1234/kick', {
        storage,
        body: { peerId: 'peer-guest' },
      });
      const result = await route(ctx);
      expect(result.status).toBe(200);
    });

    it('matches POST /rooms/:code/state', async () => {
      const ctx = createContext('POST', '/rooms/ABCD1234/state', {
        body: { state: 'playing' },
      });
      const result = await route(ctx);
      expect(result.status).toBe(200);
    });

    it('returns 404 for unmatched paths', async () => {
      const ctx = createContext('GET', '/unknown');
      const result = await route(ctx);
      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        error: 'not_found',
        message: 'Route not found',
      });
    });

    it('returns 404 for wrong method on valid path', async () => {
      // GET on /rooms should fail (POST is expected)
      const ctx = createContext('GET', '/rooms');
      const result = await route(ctx);
      expect(result.status).toBe(404);
    });

    it('rejects room codes with wrong length', async () => {
      // Too short
      const ctx1 = createContext('POST', '/rooms/ABC/join');
      const result1 = await route(ctx1);
      expect(result1.status).toBe(404);

      // Too long
      const ctx2 = createContext('POST', '/rooms/ABCDEFGHIJ/join');
      const result2 = await route(ctx2);
      expect(result2.status).toBe(404);
    });
  });

  describe('Case sensitivity', () => {
    it('path matching is case-insensitive', async () => {
      const ctx1 = createContext('GET', '/HEALTH');
      const result1 = await route(ctx1);
      expect(result1.status).toBe(200);

      const ctx2 = createContext('POST', '/ROOMS', {
        body: { gameVersion: '1.0.0' },
      });
      const result2 = await route(ctx2);
      expect(result2.status).toBe(200);

      const ctx3 = createContext('POST', '/Rooms/AbCd1234/Join', {
        body: { callsign: 'Test' },
      });
      const result3 = await route(ctx3);
      expect(result3.status).toBe(200);
    });

    it('room code is normalized to uppercase', async () => {
      // Lowercase room code should still match and work
      const ctx = createContext('POST', '/rooms/abcd1234/join', {
        body: { callsign: 'Test' },
      });
      const result = await route(ctx);
      expect(result.status).toBe(200);
    });
  });

  describe('Room code validation', () => {
    it('accepts alphanumeric room codes', async () => {
      const ctx = createContext('POST', '/rooms/A1B2C3D4/join', {
        body: { callsign: 'Test' },
      });
      const result = await route(ctx);
      expect(result.status).toBe(200);
    });

    it('rejects room codes with special characters', async () => {
      const ctx = createContext('POST', '/rooms/A1B2-3D4/join');
      const result = await route(ctx);
      expect(result.status).toBe(404);
    });
  });
});
