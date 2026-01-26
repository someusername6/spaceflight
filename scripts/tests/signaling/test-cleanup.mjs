/**
 * Tests for automatic cleanup of expired rooms.
 *
 * These tests require the server to be running with short expiry times:
 *   ROOM_EXPIRY_MS=1000 SIGNAL_EXPIRY_MS=500 EVENT_EXPIRY_MS=500 npm run signaling:dev
 */

import assert from 'node:assert';
import { before, describe, it } from 'node:test';
import {
  checkServerRunning,
  createRoom,
  getEvents,
  getSignals,
  joinRoom,
  postSignal,
} from './test-utils.mjs';

const BASE_URL = process.env.SIGNALING_URL || 'http://localhost:3001';

/**
 * Trigger cleanup on the server.
 */
async function triggerCleanup() {
  const response = await fetch(`${BASE_URL}/debug/cleanup`, { method: 'POST' });
  return response.json();
}

describe('Cleanup', () => {
  before(async () => {
    const running = await checkServerRunning();
    if (!running) {
      throw new Error(
        'Signaling server not running. Start with short expiry times:\n' +
          'ROOM_EXPIRY_MS=1000 SIGNAL_EXPIRY_MS=500 EVENT_EXPIRY_MS=500 npm run signaling:dev',
      );
    }
  });

  describe('Room Expiry', () => {
    it('removes expired rooms after cleanup', async () => {
      // Create a room
      const createResult = await createRoom('0.2.11');
      assert.strictEqual(createResult.status, 201);
      const code = createResult.data.roomCode;

      // Verify room exists (can join)
      const joinResult = await joinRoom(code);
      assert.strictEqual(joinResult.status, 200, 'Room should exist initially');

      // Wait for room to expire (ROOM_EXPIRY_MS=1000)
      await new Promise((r) => setTimeout(r, 1100));

      // Trigger cleanup
      await triggerCleanup();

      // Try to join again - should fail with invalid_room
      const rejoinResult = await joinRoom(code);
      assert.strictEqual(
        rejoinResult.status,
        404,
        'Room should be expired and cleaned up',
      );
      assert.strictEqual(rejoinResult.data.error, 'invalid_room');
    });
  });

  describe('Signal Expiry', () => {
    it('removes expired signals after cleanup', async () => {
      // Create room and join
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;
      const hostId = createResult.data.hostId;

      const joinResult = await joinRoom(code);
      const guestToken = joinResult.data.guestToken;

      // Post a signal
      await postSignal(code, guestToken, hostId, 'offer', 'test-offer-data');

      // Verify signal exists
      const signals1 = await getSignals(code, hostToken);
      assert.strictEqual(
        signals1.data.signals.length,
        1,
        'Signal should exist',
      );

      // Wait for signal to expire (SIGNAL_EXPIRY_MS=500)
      await new Promise((r) => setTimeout(r, 600));

      // Trigger cleanup
      await triggerCleanup();

      // Signals should be gone
      const signals2 = await getSignals(code, hostToken);
      assert.strictEqual(
        signals2.data.signals.length,
        0,
        'Signal should be expired and cleaned up',
      );
    });
  });

  describe('Event Expiry', () => {
    it('removes expired events after cleanup', async () => {
      // Create room and join (generates peer_joined event)
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      await joinRoom(code);

      // Verify event exists
      const events1 = await getEvents(code, hostToken);
      assert.ok(events1.data.events.length > 0, 'Events should exist');

      // Wait for event to expire (EVENT_EXPIRY_MS=500)
      await new Promise((r) => setTimeout(r, 600));

      // Trigger cleanup
      await triggerCleanup();

      // Events should be gone
      const events2 = await getEvents(code, hostToken);
      assert.strictEqual(
        events2.data.events.length,
        0,
        'Events should be expired and cleaned up',
      );
    });
  });
});
