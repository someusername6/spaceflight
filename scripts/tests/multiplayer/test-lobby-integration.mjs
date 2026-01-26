/**
 * Lobby Integration Tests
 *
 * Tests for lobby functionality with signaling server.
 * Server is automatically started/stopped by the test framework.
 */

import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';

import { createSignalingClient } from '../../../src/multiplayer/networking/signaling-client.ts';
import {
  createTestConfig,
  DEFAULT_PORT,
  startSignalingServer,
  stopSignalingServer,
  waitForServerReady,
} from './signaling-server-utils.mjs';

describe('Lobby Integration', () => {
  let serverProcess;

  before(async () => {
    serverProcess = await startSignalingServer(DEFAULT_PORT);
    await waitForServerReady(DEFAULT_PORT, 5000);
  });

  after(async () => {
    await stopSignalingServer(serverProcess);
  });

  describe('Room Creation', () => {
    it('host creates room and receives room code', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const client = createSignalingClient(config);

      const result = await client.createRoom();

      assert.ok(result.roomCode, 'Room code should be returned');
      assert.strictEqual(
        result.roomCode.length,
        8,
        'Room code should be 8 characters',
      );
      assert.ok(result.hostId, 'Host ID should be returned');
      assert.ok(result.hostToken, 'Host token should be returned');

      client.dispose();
    });

    it('host receives unique room codes for multiple rooms', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const client1 = createSignalingClient(config);
      const client2 = createSignalingClient(config);

      const result1 = await client1.createRoom();
      const result2 = await client2.createRoom();

      assert.notStrictEqual(
        result1.roomCode,
        result2.roomCode,
        'Room codes should be unique',
      );

      client1.dispose();
      client2.dispose();
    });
  });

  describe('Room Joining', () => {
    it('guest joins existing room', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      const hostResult = await hostClient.createRoom();
      const guestResult = await guestClient.joinRoom(hostResult.roomCode);

      assert.ok(guestResult.guestId, 'Guest ID should be returned');
      assert.ok(guestResult.guestToken, 'Guest token should be returned');
      assert.strictEqual(
        guestResult.hostId,
        hostResult.hostId,
        'Host ID should match',
      );

      hostClient.dispose();
      guestClient.dispose();
    });

    it('host receives peer_joined event when guest joins', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      const hostResult = await hostClient.createRoom();
      await guestClient.joinRoom(hostResult.roomCode);

      // Poll for events
      const events = await hostClient.pollEvents();

      const joinEvent = events.find((e) => e.type === 'peer_joined');
      assert.ok(joinEvent, 'Should receive peer_joined event');
      assert.ok(joinEvent.data.peerId, 'Event should contain peer ID');

      hostClient.dispose();
      guestClient.dispose();
    });

    it('host receives peer_left event when guest leaves', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      const hostResult = await hostClient.createRoom();
      await guestClient.joinRoom(hostResult.roomCode);

      // Poll to clear join event
      await hostClient.pollEvents();

      // Guest leaves
      await guestClient.leaveRoom();

      // Wait a bit for the event to propagate
      await sleep(100);

      // Poll for leave event
      const events = await hostClient.pollEvents();

      const leaveEvent = events.find((e) => e.type === 'peer_left');
      assert.ok(leaveEvent, 'Should receive peer_left event');

      hostClient.dispose();
      guestClient.dispose();
    });

    it('rejects join for invalid room code', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const client = createSignalingClient(config);

      await assert.rejects(
        () => client.joinRoom('INVALID1'),
        /not found|invalid/i,
        'Should reject invalid room code',
      );

      client.dispose();
    });
  });

  describe('Signal Exchange', () => {
    it('signals can be exchanged between host and guest', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      const hostResult = await hostClient.createRoom();
      const guestResult = await guestClient.joinRoom(hostResult.roomCode);

      // Guest sends a signal to host
      await guestClient.postSignal(
        hostResult.hostId,
        'offer',
        'test-offer-data',
      );

      // Host polls for signals
      const signals = await hostClient.pollSignals();

      const offerSignal = signals.find((s) => s.type === 'offer');
      assert.ok(offerSignal, 'Host should receive offer signal');
      assert.strictEqual(offerSignal.fromPeerId, guestResult.guestId);
      assert.strictEqual(offerSignal.data, 'test-offer-data');

      // Host sends answer back
      await hostClient.postSignal(
        guestResult.guestId,
        'answer',
        'test-answer-data',
      );

      // Guest polls for signals
      const guestSignals = await guestClient.pollSignals();

      const answerSignal = guestSignals.find((s) => s.type === 'answer');
      assert.ok(answerSignal, 'Guest should receive answer signal');
      assert.strictEqual(answerSignal.fromPeerId, hostResult.hostId);
      assert.strictEqual(answerSignal.data, 'test-answer-data');

      hostClient.dispose();
      guestClient.dispose();
    });

    it('ICE candidates can be exchanged', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      const hostResult = await hostClient.createRoom();
      const guestResult = await guestClient.joinRoom(hostResult.roomCode);

      // Exchange ICE candidates
      await hostClient.postSignal(
        guestResult.guestId,
        'ice',
        'host-ice-candidate',
      );
      await guestClient.postSignal(
        hostResult.hostId,
        'ice',
        'guest-ice-candidate',
      );

      // Both should receive each other's candidates
      const hostSignals = await hostClient.pollSignals();
      const guestSignals = await guestClient.pollSignals();

      const hostIce = hostSignals.find((s) => s.type === 'ice');
      const guestIce = guestSignals.find((s) => s.type === 'ice');

      assert.ok(hostIce, 'Host should receive ICE candidate');
      assert.ok(guestIce, 'Guest should receive ICE candidate');

      hostClient.dispose();
      guestClient.dispose();
    });
  });

  describe('Multiple Peers', () => {
    it('multiple guests can join the same room', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guest1Client = createSignalingClient(config);
      const guest2Client = createSignalingClient(config);

      const hostResult = await hostClient.createRoom();
      const guest1Result = await guest1Client.joinRoom(hostResult.roomCode);
      const guest2Result = await guest2Client.joinRoom(hostResult.roomCode);

      // Second guest should see first guest in existing peers (existingPeers is string[])
      assert.ok(
        guest2Result.existingPeers.includes(guest1Result.guestId),
        'Second guest should see first guest in existing peers',
      );

      hostClient.dispose();
      guest1Client.dispose();
      guest2Client.dispose();
    });
  });
});

/**
 * Sleep utility.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
