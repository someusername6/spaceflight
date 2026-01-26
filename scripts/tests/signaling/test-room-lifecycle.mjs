/**
 * Tests for room lifecycle: create, join, leave, delete.
 */

import assert from 'node:assert';
import { before, describe, it } from 'node:test';
import {
  checkServerRunning,
  createRoom,
  deleteRoom,
  getEvents,
  joinRoom,
  leaveRoom,
} from './test-utils.mjs';

describe('Room Lifecycle', () => {
  before(async () => {
    const running = await checkServerRunning();
    if (!running) {
      throw new Error(
        'Signaling server not running. Start with: cd server/signaling && npm run dev',
      );
    }
  });

  describe('Create Room', () => {
    it('creates a room with valid game version', async () => {
      const result = await createRoom('0.2.11');

      assert.strictEqual(result.status, 201);
      assert.ok(result.data.roomCode, 'should have roomCode');
      assert.strictEqual(
        result.data.roomCode.length,
        8,
        'roomCode should be 8 chars',
      );
      assert.ok(result.data.hostId, 'should have hostId');
      assert.ok(result.data.hostToken, 'should have hostToken');
    });

    it('rejects missing game version', async () => {
      const result = await createRoom('');

      assert.strictEqual(result.status, 400);
      assert.strictEqual(result.data.error, 'bad_request');
    });
  });

  describe('Join Room', () => {
    it('joins an existing room', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      const joinResult = await joinRoom(code);

      assert.strictEqual(joinResult.status, 200);
      assert.ok(joinResult.data.guestId, 'should have guestId');
      assert.ok(joinResult.data.guestToken, 'should have guestToken');
      assert.strictEqual(
        joinResult.data.hostId,
        createResult.data.hostId,
        'should match host ID',
      );
      assert.ok(
        Array.isArray(joinResult.data.existingPeers),
        'should have existingPeers',
      );
      assert.strictEqual(
        joinResult.data.existingPeers.length,
        1,
        'should have 1 existing peer (host)',
      );
    });

    it('rejects non-existent room', async () => {
      // Use a valid format code that doesn't exist
      const result = await joinRoom('ZZZZZZZZ');

      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.data.error, 'invalid_room');
    });

    it('rejects invalid room code format', async () => {
      // '1' is not in allowed characters (excluded to avoid confusion with 'I')
      const result = await joinRoom('INVALID1');

      assert.strictEqual(result.status, 400);
      assert.strictEqual(result.data.error, 'bad_request');
    });

    it('rejects version mismatch', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      const result = await joinRoom(code, '0.2.10');

      assert.strictEqual(result.status, 409);
      assert.strictEqual(result.data.error, 'version_mismatch');
    });
  });

  describe('Leave Room', () => {
    it('allows guest to leave', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const joinResult = await joinRoom(code);

      const leaveResult = await leaveRoom(code, joinResult.data.guestToken);

      assert.strictEqual(leaveResult.status, 200);
      assert.strictEqual(leaveResult.data.success, true);

      // Verify peer_left event was created
      const eventsResult = await getEvents(code, createResult.data.hostToken);
      assert.strictEqual(eventsResult.status, 200);
      const leftEvent = eventsResult.data.events.find(
        (e) => e.type === 'peer_left',
      );
      assert.ok(leftEvent, 'should have peer_left event');
    });

    it('deletes room when host leaves', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      await leaveRoom(code, createResult.data.hostToken);

      // Room should be deleted
      const joinResult = await joinRoom(code);
      assert.strictEqual(joinResult.status, 404);
    });

    it('rejects invalid token', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      const result = await leaveRoom(code, 'invalid-token');

      assert.strictEqual(result.status, 401);
    });
  });

  describe('Delete Room', () => {
    it('allows host to delete room', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;

      const deleteResult = await deleteRoom(code, createResult.data.hostToken);

      assert.strictEqual(deleteResult.status, 200);
      assert.strictEqual(deleteResult.data.success, true);

      // Room should be gone
      const joinResult = await joinRoom(code);
      assert.strictEqual(joinResult.status, 404);
    });

    it('rejects non-host token', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const joinResult = await joinRoom(code);

      const result = await deleteRoom(code, joinResult.data.guestToken);

      assert.strictEqual(result.status, 403);
    });
  });
});
