/**
 * Unit tests for SignalingClient HTTP retry logic.
 *
 * Run with: npx tsx scripts/tests/networking/test-http-retry.mjs
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Import mocks - must be before any module that uses WebRTC
import './webrtc-mocks.mjs';

// =============================================================================
// Tests: SignalingClient HTTP Retry Logic
// =============================================================================

describe('SignalingClient HTTP Retry Logic', () => {
  // Mock fetch for testing
  let originalFetch;
  let fetchCalls;

  function installMockFetch(mockFn) {
    originalFetch = globalThis.fetch;
    fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return mockFn(...args);
    };
  }

  function restoreFetch() {
    globalThis.fetch = originalFetch;
  }

  it('retries on transient HTTP errors (500, 502, 503, 504)', async () => {
    let callCount = 0;
    installMockFetch(async () => {
      callCount++;
      if (callCount <= 2) {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        json: async () => ({
          roomCode: 'TEST1234',
          hostId: 'host-1',
          hostToken: 'token-1',
        }),
      };
    });

    const { SignalingClient } = await import(
      '../../../src/multiplayer/networking/signaling-client.ts'
    );

    const client = new SignalingClient({
      serverUrl: 'http://localhost:3001',
      gameVersion: '0.0.0-test',
      pollIntervalMs: 100,
    });

    try {
      const result = await client.createRoom();
      assert.strictEqual(result.roomCode, 'TEST1234');
      assert.strictEqual(callCount, 3, 'Should retry twice then succeed');
    } finally {
      restoreFetch();
    }
  });

  it('retries on network failures (TypeError from fetch)', async () => {
    let callCount = 0;
    installMockFetch(async () => {
      callCount++;
      if (callCount <= 2) {
        throw new TypeError('Failed to fetch');
      }
      return {
        ok: true,
        json: async () => ({
          roomCode: 'TEST1234',
          hostId: 'host-1',
          hostToken: 'token-1',
        }),
      };
    });

    const { SignalingClient } = await import(
      '../../../src/multiplayer/networking/signaling-client.ts'
    );

    const client = new SignalingClient({
      serverUrl: 'http://localhost:3001',
      gameVersion: '0.0.0-test',
      pollIntervalMs: 100,
    });

    try {
      const result = await client.createRoom();
      assert.strictEqual(result.roomCode, 'TEST1234');
      assert.strictEqual(callCount, 3, 'Should retry twice then succeed');
    } finally {
      restoreFetch();
    }
  });

  it('does not retry on 400 Bad Request', async () => {
    let callCount = 0;
    installMockFetch(async () => {
      callCount++;
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: 'bad_request', message: 'Invalid input' }),
      };
    });

    const { SignalingClient, SignalingError } = await import(
      '../../../src/multiplayer/networking/signaling-client.ts'
    );

    const client = new SignalingClient({
      serverUrl: 'http://localhost:3001',
      gameVersion: '0.0.0-test',
      pollIntervalMs: 100,
    });

    try {
      await client.createRoom();
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error instanceof SignalingError);
      assert.strictEqual(error.code, 'bad_request');
      assert.strictEqual(callCount, 1, 'Should not retry on 400');
    } finally {
      restoreFetch();
    }
  });

  it('does not retry on 404 Not Found', async () => {
    let callCount = 0;
    installMockFetch(async () => {
      callCount++;
      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: 'invalid_room',
          message: 'Room not found',
        }),
      };
    });

    const { SignalingClient, SignalingError } = await import(
      '../../../src/multiplayer/networking/signaling-client.ts'
    );

    const client = new SignalingClient({
      serverUrl: 'http://localhost:3001',
      gameVersion: '0.0.0-test',
      pollIntervalMs: 100,
    });

    try {
      await client.joinRoom('INVALID1');
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error instanceof SignalingError);
      assert.strictEqual(error.code, 'invalid_room');
      assert.strictEqual(callCount, 1, 'Should not retry on 404');
    } finally {
      restoreFetch();
    }
  });

  it('retries on 429 Too Many Requests', async () => {
    let callCount = 0;
    installMockFetch(async () => {
      callCount++;
      if (callCount <= 2) {
        return { ok: false, status: 429 };
      }
      return {
        ok: true,
        json: async () => ({
          roomCode: 'TEST1234',
          hostId: 'host-1',
          hostToken: 'token-1',
        }),
      };
    });

    const { SignalingClient } = await import(
      '../../../src/multiplayer/networking/signaling-client.ts'
    );

    const client = new SignalingClient({
      serverUrl: 'http://localhost:3001',
      gameVersion: '0.0.0-test',
      pollIntervalMs: 100,
    });

    try {
      const result = await client.createRoom();
      assert.strictEqual(result.roomCode, 'TEST1234');
      assert.strictEqual(callCount, 3, 'Should retry on 429');
    } finally {
      restoreFetch();
    }
  });

  it('gives up after MAX_RETRIES (3) attempts', async () => {
    let callCount = 0;
    installMockFetch(async () => {
      callCount++;
      return { ok: false, status: 503 };
    });

    const { SignalingClient, SignalingError } = await import(
      '../../../src/multiplayer/networking/signaling-client.ts'
    );

    const client = new SignalingClient({
      serverUrl: 'http://localhost:3001',
      gameVersion: '0.0.0-test',
      pollIntervalMs: 100,
    });

    try {
      await client.createRoom();
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error instanceof SignalingError);
      // 1 initial + 3 retries = 4 total attempts
      assert.strictEqual(
        callCount,
        4,
        'Should try 4 times total (1 + 3 retries)',
      );
    } finally {
      restoreFetch();
    }
  });
});

console.log('HTTP retry tests completed!');
