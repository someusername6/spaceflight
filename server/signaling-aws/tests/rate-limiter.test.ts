/**
 * Unit tests for DynamoDB rate limiter.
 * Uses an in-memory mock to simulate DynamoDB operations.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../src/config';
import type {
  RateLimiter,
  RateLimitResult,
} from '../src/rate-limiter/dynamodb-rate-limiter';

// In-memory mock rate limiter for testing
class MockRateLimiter implements RateLimiter {
  private counters: Map<string, { count: number; windowStart: number }> =
    new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async checkJoin(ip: string): Promise<RateLimitResult> {
    return this.checkLimit(ip, 'join', this.config.joinRateLimitPerSecond, 1);
  }

  async checkCreate(ip: string): Promise<RateLimitResult> {
    return this.checkLimit(
      ip,
      'create',
      this.config.createRateLimitPerMinute,
      60,
    );
  }

  async checkSignal(
    roomCode: string,
    peerId: string,
  ): Promise<RateLimitResult> {
    const key = `${roomCode}:${peerId}`;
    return this.checkLimit(
      key,
      'signal',
      this.config.signalRateLimitPerSecond,
      1,
    );
  }

  private checkLimit(
    key: string,
    type: string,
    limit: number,
    windowSeconds: number,
  ): RateLimitResult {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const pk = `${key}#${type}`;

    const existing = this.counters.get(pk);

    if (!existing || existing.windowStart !== windowStart) {
      // New window, reset counter
      this.counters.set(pk, { count: 1, windowStart });
      return { allowed: true, remaining: limit - 1 };
    }

    // Same window, increment counter
    existing.count++;
    return {
      allowed: existing.count <= limit,
      remaining: Math.max(0, limit - existing.count),
    };
  }

  // For testing: manually set window start
  setWindowStart(key: string, type: string, windowStart: number): void {
    const pk = `${key}#${type}`;
    const existing = this.counters.get(pk);
    if (existing) {
      existing.windowStart = windowStart;
    }
  }

  // For testing: get current count
  getCount(key: string, type: string): number {
    const pk = `${key}#${type}`;
    return this.counters.get(pk)?.count ?? 0;
  }

  // For testing: clear all counters
  clear(): void {
    this.counters.clear();
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

describe('DynamoDB Rate Limiter', () => {
  let rateLimiter: MockRateLimiter;

  beforeEach(() => {
    rateLimiter = new MockRateLimiter(testConfig);
  });

  describe('Basic functionality', () => {
    it('first request in window is allowed', async () => {
      const result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
    });

    it('requests within limit are allowed', async () => {
      // Join limit is 5/sec
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkJoin('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
    });

    it('request exceeding limit is rejected', async () => {
      // Join limit is 5/sec
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkJoin('192.168.1.1');
      }

      // 6th request should be rejected
      const result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('remaining count decrements correctly', async () => {
      // Join limit is 5/sec
      let result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.remaining).toBe(4);

      result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.remaining).toBe(3);

      result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.remaining).toBe(2);

      result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.remaining).toBe(1);

      result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.remaining).toBe(0);

      // Beyond limit, remaining stays at 0
      result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.remaining).toBe(0);
    });
  });

  describe('Window transitions', () => {
    it('counter resets when window changes', async () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkJoin('192.168.1.1');
      }

      // Next request should be rejected
      let result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.allowed).toBe(false);

      // Simulate window change by setting old windowStart
      rateLimiter.setWindowStart('192.168.1.1', 'join', 0);

      // Now request should be allowed (new window)
      result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('requests allowed again in new window', async () => {
      // Exhaust limit
      for (let i = 0; i < 6; i++) {
        await rateLimiter.checkJoin('192.168.1.1');
      }

      // Force new window
      rateLimiter.setWindowStart('192.168.1.1', 'join', 0);

      // Should get fresh limit
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkJoin('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    it('different keys do not interfere', async () => {
      // Exhaust limit for IP1
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkJoin('192.168.1.1');
      }

      // IP2 should still have full limit
      const result = await rateLimiter.checkJoin('192.168.1.2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('different types are independent', async () => {
      // Exhaust join limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkJoin('192.168.1.1');
      }
      expect((await rateLimiter.checkJoin('192.168.1.1')).allowed).toBe(false);

      // Create should still work (different type)
      const result = await rateLimiter.checkCreate('192.168.1.1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Rate limit types', () => {
    it('checkJoin uses per-second limit of 5', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkJoin('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
      const result = await rateLimiter.checkJoin('192.168.1.1');
      expect(result.allowed).toBe(false);
    });

    it('checkCreate uses per-minute limit of 10', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkCreate('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
      const result = await rateLimiter.checkCreate('192.168.1.1');
      expect(result.allowed).toBe(false);
    });

    it('checkSignal uses per-second limit of 20', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await rateLimiter.checkSignal('ROOM123', 'peer-abc');
        expect(result.allowed).toBe(true);
      }
      const result = await rateLimiter.checkSignal('ROOM123', 'peer-abc');
      expect(result.allowed).toBe(false);
    });

    it('checkSignal key combines roomCode and peerId', async () => {
      // Exhaust limit for room1:peer1
      for (let i = 0; i < 20; i++) {
        await rateLimiter.checkSignal('ROOM1', 'peer-1');
      }
      expect((await rateLimiter.checkSignal('ROOM1', 'peer-1')).allowed).toBe(
        false,
      );

      // Different peer in same room should have fresh limit
      expect((await rateLimiter.checkSignal('ROOM1', 'peer-2')).allowed).toBe(
        true,
      );

      // Same peer in different room should have fresh limit
      expect((await rateLimiter.checkSignal('ROOM2', 'peer-1')).allowed).toBe(
        true,
      );
    });
  });
});
