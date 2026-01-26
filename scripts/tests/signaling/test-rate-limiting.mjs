/**
 * Tests for rate limiting.
 */

import assert from 'node:assert';
import { before, describe, it } from 'node:test';
import {
  checkServerRunning,
  createRoom,
  getEvents,
  joinRoom,
  kick,
} from './test-utils.mjs';

describe('Rate Limiting', () => {
  before(async () => {
    const running = await checkServerRunning();
    if (!running) {
      throw new Error(
        'Signaling server not running. Start with: cd server/signaling && npm run dev',
      );
    }
  });

  describe('Join Rate Limit', () => {
    it('enforces rate limits or room capacity on rapid joins', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      // Send 5 rapid join requests
      // Room can only hold 4 (including host), so max 3 successful joins
      // With low rate limits, some may also be rate-limited
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(joinRoom(code));
      }

      const results = await Promise.all(promises);

      // Count different responses
      const successful = results.filter((r) => r.status === 200).length;
      const rateLimited = results.filter((r) => r.status === 429).length;
      const roomFull = results.filter((r) => r.status === 409).length;

      // At most 3 can succeed (room capacity: host + 3 = 4)
      assert.ok(
        successful <= 3,
        `Expected at most 3 successful joins, got ${successful}`,
      );

      // The rest should be room_full or rate_limited
      assert.ok(
        roomFull > 0 || rateLimited > 0,
        `Expected some rejected, got ${successful} successful, ${rateLimited} rate limited, ${roomFull} room full`,
      );
    });
  });

  describe('Kick Players', () => {
    it('allows host to kick a player by peerId', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      // Player joins
      const joinResult = await joinRoom(code);
      assert.strictEqual(
        joinResult.status,
        200,
        `Join failed: ${JSON.stringify(joinResult.data)}`,
      );
      const guestId = joinResult.data.guestId;

      // Host kicks player
      const kickResult = await kick(code, hostToken, guestId);
      assert.strictEqual(
        kickResult.status,
        200,
        `Kick failed: ${JSON.stringify(kickResult.data)}`,
      );
    });

    it('creates peer_kicked event', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      const joinResult = await joinRoom(code);
      const guestId = joinResult.data.guestId;
      await kick(code, hostToken, guestId);

      // Check for event
      const eventsResult = await getEvents(code, hostToken);

      const kickEvent = eventsResult.data.events.find(
        (e) => e.type === 'peer_kicked',
      );
      assert.ok(kickEvent, 'should have peer_kicked event');
      assert.strictEqual(kickEvent.data.peerId, guestId);
    });

    it('rejects kick of non-existent peer', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      const result = await kick(code, hostToken, 'non-existent-peer-id');
      assert.strictEqual(result.status, 400);
    });

    it('rejects host kicking themselves', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;
      const hostId = createResult.data.hostId;

      const result = await kick(code, hostToken, hostId);
      assert.strictEqual(result.status, 400);
    });
  });

  describe('Room Capacity', () => {
    it('rejects join when room is full', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      // Fill the room (host + 3 guests = 4 max)
      for (let i = 1; i <= 3; i++) {
        const result = await joinRoom(code);
        assert.strictEqual(
          result.status,
          200,
          `Player ${i} join failed: ${JSON.stringify(result.data)}`,
        );
      }

      const result = await joinRoom(code);

      assert.strictEqual(result.status, 409);
      assert.strictEqual(result.data.error, 'room_full');
    });
  });
});
