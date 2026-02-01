/**
 * Rate limiting for the signaling server.
 *
 * For local development, uses in-memory tracking.
 * For Lambda, this would use DynamoDB with short TTL.
 */

import type { Config } from './config.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** Signal rate limit: 20 signals per second per peer */
const SIGNAL_RATE_LIMIT_PER_SECOND = 20;

export class RateLimiter {
  /** Per-second limits (for join) */
  private perSecond = new Map<string, RateLimitEntry>();

  /** Per-minute limits (for create) */
  private perMinute = new Map<string, RateLimitEntry>();

  /** Per-peer signal limits (for signal flood protection) */
  private perPeerSignal = new Map<string, RateLimitEntry>();

  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Check if a join attempt is allowed.
   * Returns true if allowed, false if rate limited.
   */
  checkJoin(ip: string): boolean {
    return this.check(
      this.perSecond,
      ip,
      this.config.joinRateLimitPerSecond,
      1000,
    );
  }

  /**
   * Check if a room creation is allowed.
   * Returns true if allowed, false if rate limited.
   */
  checkCreate(ip: string): boolean {
    return this.check(
      this.perMinute,
      ip,
      this.config.createRateLimitPerMinute,
      60000,
    );
  }

  /**
   * Check if a signal from a peer is allowed.
   * Returns true if allowed, false if rate limited.
   * Limits to 20 signals per second per room:peer combination.
   */
  checkSignal(roomCode: string, peerId: string): boolean {
    const key = `${roomCode}:${peerId}`;
    return this.check(
      this.perPeerSignal,
      key,
      SIGNAL_RATE_LIMIT_PER_SECOND,
      1000,
    );
  }

  private check(
    map: Map<string, RateLimitEntry>,
    key: string,
    limit: number,
    windowMs: number,
  ): boolean {
    const now = Date.now();
    const entry = map.get(key);

    // No entry or expired window: allow and start new window
    if (!entry || now >= entry.resetAt) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    // Within window: check count
    if (entry.count >= limit) {
      return false;
    }

    // Allow and increment
    entry.count++;
    return true;
  }

  /**
   * Clean up expired entries (call periodically).
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.perSecond.entries()) {
      if (now >= entry.resetAt) {
        this.perSecond.delete(key);
      }
    }

    for (const [key, entry] of this.perMinute.entries()) {
      if (now >= entry.resetAt) {
        this.perMinute.delete(key);
      }
    }

    for (const [key, entry] of this.perPeerSignal.entries()) {
      if (now >= entry.resetAt) {
        this.perPeerSignal.delete(key);
      }
    }
  }
}
