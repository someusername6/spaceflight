/**
 * Tests for mesh network formation and room state management.
 *
 * Note: Connection tracking (POST /connected) was removed in the simplification.
 * Mesh formation is now handled entirely by the clients via WebRTC.
 * The signaling server only relays SDP/ICE and doesn't track connection state.
 */

import assert from 'node:assert';
import { before, describe, it } from 'node:test';
import {
  checkServerRunning,
  createRoom,
  getEvents,
  joinRoom,
  setState,
} from './test-utils.mjs';

describe('Mesh Formation', () => {
  before(async () => {
    const running = await checkServerRunning();
    if (!running) {
      throw new Error(
        'Signaling server not running. Start with: cd server/signaling && npm run dev',
      );
    }
  });

  describe('Room State', () => {
    it('allows host to set playing state', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      const result = await setState(code, hostToken, 'playing');

      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.success, true);

      // Verify game_started event
      const eventsResult = await getEvents(code, hostToken);
      const startEvent = eventsResult.data.events.find(
        (e) => e.type === 'game_started',
      );
      assert.ok(startEvent, 'should have game_started event');
    });

    it('prevents join when playing', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      await setState(code, hostToken, 'playing');

      const result = await joinRoom(code);

      assert.strictEqual(result.status, 409);
      assert.strictEqual(result.data.error, 'game_in_progress');
    });

    it('allows return to lobby', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      await setState(code, hostToken, 'playing');
      await setState(code, hostToken, 'lobby');

      const result = await joinRoom(code);

      assert.strictEqual(result.status, 200);
    });

    it('rejects non-host state changes', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      const joinResult = await joinRoom(code);

      const result = await setState(
        code,
        joinResult.data.guestToken,
        'playing',
      );

      assert.strictEqual(result.status, 403);
    });
  });
});
