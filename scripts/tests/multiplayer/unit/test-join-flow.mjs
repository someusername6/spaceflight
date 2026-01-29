/**
 * Join Flow Integration Tests
 *
 * Tests the full join game flow using a real signaling server.
 * These tests start the signaling server, run connection scenarios,
 * and verify the join/host flow works correctly.
 *
 * Run: npx tsx scripts/tests/multiplayer/test-join-flow.mjs
 *
 * Note: These tests require the signaling server to be compilable.
 * If tests fail to start, check server/signaling/ for TypeScript errors.
 */

// Import mocks first - this sets up globalThis.__APP_VERSION__ before other imports
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { createConnectionFlow } from '../../../../src/multiplayer/networking/connection-flow.ts';
import {
  createSignalingClient,
  SignalingError,
} from '../../../../src/multiplayer/networking/signaling-client.ts';
import {
  createTestConfig,
  DEFAULT_PORT,
  startSignalingServer,
  stopSignalingServer,
  waitForServerReady,
} from './signaling-utils.mjs';

describe('Join Flow Integration', () => {
  let serverProcess;

  before(async () => {
    // Start the signaling server
    try {
      serverProcess = await startSignalingServer(DEFAULT_PORT);
      await waitForServerReady(DEFAULT_PORT, 5000);
    } catch (error) {
      console.error('Failed to start signaling server:', error.message);
      throw error;
    }
  });

  after(async () => {
    // Stop the signaling server
    if (serverProcess) {
      await stopSignalingServer(serverProcess);
    }
  });

  describe('Room Creation', () => {
    it('host can create room and get room code', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const client = createSignalingClient(config);

      try {
        const result = await client.createRoom();

        assert.ok(result.roomCode, 'Room code should be returned');
        assert.strictEqual(
          result.roomCode.length,
          8,
          'Room code should be 8 characters',
        );
        assert.ok(result.hostId, 'Host ID should be returned');
        assert.ok(result.hostToken, 'Host token should be returned');

        // Verify client state
        assert.strictEqual(client.roomCode, result.roomCode);
        assert.strictEqual(client.localPeerId, result.hostId);
        assert.strictEqual(client.isHost, true);
      } finally {
        // Clean up
        try {
          await client.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        client.dispose();
      }
    });

    it('multiple rooms can be created', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const client1 = createSignalingClient(config);
      const client2 = createSignalingClient(config);

      try {
        const result1 = await client1.createRoom();
        const result2 = await client2.createRoom();

        assert.notStrictEqual(
          result1.roomCode,
          result2.roomCode,
          'Room codes should be unique',
        );
        assert.notStrictEqual(
          result1.hostId,
          result2.hostId,
          'Host IDs should be unique',
        );
      } finally {
        try {
          await client1.deleteRoom();
          await client2.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        client1.dispose();
        client2.dispose();
      }
    });
  });

  describe('Room Joining', () => {
    it('guest can join room with valid code', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      try {
        // Host creates room
        const createResult = await hostClient.createRoom();

        // Guest joins room
        const joinResult = await guestClient.joinRoom(createResult.roomCode);

        assert.ok(joinResult.guestId, 'Guest ID should be returned');
        assert.ok(joinResult.guestToken, 'Guest token should be returned');
        assert.strictEqual(
          joinResult.hostId,
          createResult.hostId,
          'Host ID should match',
        );

        // Verify guest client state
        assert.strictEqual(guestClient.roomCode, createResult.roomCode);
        assert.strictEqual(guestClient.localPeerId, joinResult.guestId);
        assert.strictEqual(guestClient.isHost, false);
      } finally {
        try {
          await guestClient.leaveRoom();
          await hostClient.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        guestClient.dispose();
        hostClient.dispose();
      }
    });

    it('join fails with invalid room code', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const client = createSignalingClient(config);

      try {
        await client.joinRoom('INVALID1');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(
          error instanceof SignalingError,
          'Should be a SignalingError',
        );
        // Server returns invalid_room or bad_request depending on validation
        assert.ok(
          ['invalid_room', 'bad_request'].includes(error.code),
          `Error code should be invalid_room or bad_request, got: ${error.code}`,
        );
      } finally {
        client.dispose();
      }
    });

    it('existing peers are returned on join', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guest1Client = createSignalingClient(config);
      const guest2Client = createSignalingClient(config);

      try {
        // Host creates room
        const createResult = await hostClient.createRoom();

        // First guest joins
        const join1Result = await guest1Client.joinRoom(createResult.roomCode);
        const existingBeforeGuest1 = join1Result.existingPeers.length;

        // Second guest joins - should see first guest as existing peer
        const join2Result = await guest2Client.joinRoom(createResult.roomCode);

        // Second guest should see at least one more peer than first guest did
        assert.ok(
          join2Result.existingPeers.length > existingBeforeGuest1,
          `Second guest should see more peers than first guest (${join2Result.existingPeers.length} vs ${existingBeforeGuest1})`,
        );
        // And specifically, the first guest should be in the list
        assert.ok(
          join2Result.existingPeers.includes(join1Result.guestId),
          'Second guest should see first guest as existing peer',
        );
      } finally {
        try {
          await guest2Client.leaveRoom();
          await guest1Client.leaveRoom();
          await hostClient.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        guest2Client.dispose();
        guest1Client.dispose();
        hostClient.dispose();
      }
    });
  });

  describe('Signal Exchange', () => {
    it('signals can be exchanged between peers', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      try {
        // Setup room
        const createResult = await hostClient.createRoom();
        const joinResult = await guestClient.joinRoom(createResult.roomCode);

        // Guest sends signal to host
        await guestClient.postSignal(
          createResult.hostId,
          'offer',
          JSON.stringify({ type: 'offer', sdp: 'test-sdp' }),
        );

        // Host polls for signals
        const signals = await hostClient.pollSignals();

        assert.strictEqual(signals.length, 1, 'Should receive one signal');
        assert.strictEqual(signals[0].fromPeerId, joinResult.guestId);
        assert.strictEqual(signals[0].type, 'offer');
        assert.ok(signals[0].data.includes('test-sdp'));
      } finally {
        try {
          await guestClient.leaveRoom();
          await hostClient.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        guestClient.dispose();
        hostClient.dispose();
      }
    });
  });

  describe('Room Events', () => {
    it('host receives peer_joined event', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      try {
        // Host creates room and polls initially to clear any events
        const createResult = await hostClient.createRoom();
        await hostClient.pollEvents();

        // Guest joins
        const joinResult = await guestClient.joinRoom(createResult.roomCode);

        // Host polls for events
        const events = await hostClient.pollEvents();

        assert.strictEqual(events.length, 1, 'Should receive one event');
        assert.strictEqual(events[0].type, 'peer_joined');
        assert.strictEqual(events[0].data.peerId, joinResult.guestId);
      } finally {
        try {
          await guestClient.leaveRoom();
          await hostClient.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        guestClient.dispose();
        hostClient.dispose();
      }
    });

    it('host receives peer_left event', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);
      const guestClient = createSignalingClient(config);

      try {
        // Setup room with guest
        const createResult = await hostClient.createRoom();
        await hostClient.pollEvents(); // Clear initial events
        const joinResult = await guestClient.joinRoom(createResult.roomCode);
        await hostClient.pollEvents(); // Clear join event

        // Guest leaves
        await guestClient.leaveRoom();

        // Host polls for events
        const events = await hostClient.pollEvents();

        assert.strictEqual(events.length, 1, 'Should receive one event');
        assert.strictEqual(events[0].type, 'peer_left');
        assert.strictEqual(events[0].data.peerId, joinResult.guestId);
      } finally {
        try {
          await hostClient.deleteRoom();
        } catch {
          // Ignore cleanup errors
        }
        guestClient.dispose();
        hostClient.dispose();
      }
    });
  });

  describe('Disconnect', () => {
    it('disconnect cleans up properly', async () => {
      const config = createTestConfig(DEFAULT_PORT);
      const hostClient = createSignalingClient(config);

      // Create room
      await hostClient.createRoom();
      assert.ok(hostClient.roomCode, 'Should have room code');

      // Leave room
      await hostClient.leaveRoom();

      assert.strictEqual(
        hostClient.roomCode,
        null,
        'Room code should be cleared',
      );
      assert.strictEqual(
        hostClient.localPeerId,
        null,
        'Peer ID should be cleared',
      );
      assert.strictEqual(hostClient.token, null, 'Token should be cleared');

      hostClient.dispose();
    });
  });

  describe('ConnectionFlow Integration', () => {
    it('host can create room via ConnectionFlow', async () => {
      const networkingConfig = {
        signaling: createTestConfig(DEFAULT_PORT),
        webrtc: {
          iceServers: [],
          meshTimeoutMs: 5000,
        },
      };

      const stateChanges = [];
      const connectionFlow = createConnectionFlow(networkingConfig, {
        onStateChange: (state) => {
          stateChanges.push(state);
        },
      });

      try {
        const result = await connectionFlow.createRoom();

        assert.ok(result.roomCode, 'Should get room code');
        assert.ok(result.localPeerId, 'Should get local peer ID');
        assert.strictEqual(result.isHost, true, 'Should be host');
        assert.strictEqual(
          result.hostPeerId,
          result.localPeerId,
          'Host peer ID should match local',
        );

        // Check state transitions occurred
        assert.ok(
          stateChanges.some((s) => s.status === 'creating-room'),
          'Should have been in creating-room state',
        );
        assert.ok(
          stateChanges.some((s) => s.status === 'connected'),
          'Should have reached connected state',
        );
      } finally {
        await connectionFlow.disconnect();
        connectionFlow.dispose();
      }
    });
  });
});
