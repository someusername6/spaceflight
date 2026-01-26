/**
 * Tests for WebRTC signaling relay: SDP/ICE exchange.
 */

import assert from 'node:assert';
import { before, describe, it } from 'node:test';
import {
  checkServerRunning,
  createRoom,
  getSignals,
  joinRoom,
  postSignal,
} from './test-utils.mjs';

describe('Signaling Relay', () => {
  before(async () => {
    const running = await checkServerRunning();
    if (!running) {
      throw new Error(
        'Signaling server not running. Start with: cd server/signaling && npm run dev',
      );
    }
  });

  describe('Signal Exchange', () => {
    it('relays offer from guest to host', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;
      const hostId = createResult.data.hostId;

      const joinResult = await joinRoom(code);
      const guestToken = joinResult.data.guestToken;

      // Guest sends offer to host
      const offerData = JSON.stringify({
        type: 'offer',
        sdp: 'v=0\no=- 123 456 IN IP4 127.0.0.1...',
      });
      const postResult = await postSignal(
        code,
        guestToken,
        hostId,
        'offer',
        offerData,
      );

      assert.strictEqual(postResult.status, 200);

      // Host retrieves signal
      const getResult = await getSignals(code, hostToken);

      assert.strictEqual(getResult.status, 200);
      assert.strictEqual(getResult.data.signals.length, 1);
      assert.strictEqual(getResult.data.signals[0].type, 'offer');
      assert.strictEqual(getResult.data.signals[0].data, offerData);
      assert.strictEqual(
        getResult.data.signals[0].fromPeerId,
        joinResult.data.guestId,
      );
    });

    it('relays answer from host to guest', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      const joinResult = await joinRoom(code);
      const guestToken = joinResult.data.guestToken;
      const guestId = joinResult.data.guestId;

      // Host sends answer to guest
      const answerData = JSON.stringify({
        type: 'answer',
        sdp: 'v=0\no=- 789 012 IN IP4 127.0.0.1...',
      });
      const postResult = await postSignal(
        code,
        hostToken,
        guestId,
        'answer',
        answerData,
      );

      assert.strictEqual(postResult.status, 200);

      // Guest retrieves signal
      const getResult = await getSignals(code, guestToken);

      assert.strictEqual(getResult.status, 200);
      assert.strictEqual(getResult.data.signals.length, 1);
      assert.strictEqual(getResult.data.signals[0].type, 'answer');
    });

    it('relays ICE candidates', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;
      const hostId = createResult.data.hostId;

      const joinResult = await joinRoom(code);
      const guestToken = joinResult.data.guestToken;

      // Guest sends ICE candidate
      const iceData = JSON.stringify({
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 12345 typ host',
        sdpMLineIndex: 0,
        sdpMid: 'audio',
      });
      await postSignal(code, guestToken, hostId, 'ice', iceData);

      // Host retrieves ICE candidate
      const getResult = await getSignals(code, hostToken);

      assert.strictEqual(getResult.status, 200);
      assert.strictEqual(getResult.data.signals.length, 1);
      assert.strictEqual(getResult.data.signals[0].type, 'ice');
      assert.strictEqual(getResult.data.signals[0].data, iceData);
    });

    it('filters signals by since timestamp', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;
      const hostId = createResult.data.hostId;

      const joinResult = await joinRoom(code);
      const guestToken = joinResult.data.guestToken;

      // Send first signal
      await postSignal(code, guestToken, hostId, 'ice', 'ice1');

      // Get first signal and note timestamp
      const firstGet = await getSignals(code, hostToken);
      const firstTimestamp = firstGet.data.signals[0].timestamp;

      // Wait a bit
      await new Promise((r) => setTimeout(r, 10));

      // Send second signal
      await postSignal(code, guestToken, hostId, 'ice', 'ice2');

      // Get only signals after first timestamp
      const filteredGet = await getSignals(code, hostToken, firstTimestamp);

      assert.strictEqual(filteredGet.status, 200);
      assert.strictEqual(filteredGet.data.signals.length, 1);
      assert.strictEqual(filteredGet.data.signals[0].data, 'ice2');
    });

    it('rejects signal to non-existent peer', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      const result = await postSignal(
        code,
        hostToken,
        'non-existent-peer-id',
        'offer',
        'data',
      );

      assert.strictEqual(result.status, 400);
    });

    it('rejects invalid signal type', async () => {
      const createResult = await createRoom('0.2.11');
      const code = createResult.data.roomCode;
      const hostToken = createResult.data.hostToken;

      const joinResult = await joinRoom(code);
      const guestId = joinResult.data.guestId;

      const result = await postSignal(
        code,
        hostToken,
        guestId,
        'invalid',
        'data',
      );

      assert.strictEqual(result.status, 400);
    });
  });
});
