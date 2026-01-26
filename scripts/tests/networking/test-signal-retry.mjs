/**
 * Unit tests for signal retry logic.
 *
 * Run with: npx tsx scripts/tests/networking/test-signal-retry.mjs
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Import mocks - must be before any module that uses WebRTC
import { getPrivate, setPrivate } from './webrtc-mocks.mjs';

// =============================================================================
// Tests: Signal Retry Logic
// =============================================================================

describe('Signal Retry Logic', () => {
  it('retries failed signals up to MAX_SIGNAL_RETRIES times', async () => {
    // Create a mock signaling client that fails the first 2 attempts
    let postSignalCalls = 0;
    const mockSignalingClient = {
      postSignal: async () => {
        postSignalCalls++;
        if (postSignalCalls <= 2) {
          throw new Error('Network error');
        }
        // Success on 3rd attempt
      },
      pollSignals: async () => [],
      pollEvents: async () => [],
      isHost: true,
      roomCode: 'TEST1234',
      localPeerId: 'host-1',
      token: 'token',
    };

    const { ConnectionFlow } = await import(
      '../../../src/multiplayer/networking/connection-flow.ts'
    );

    const flow = new ConnectionFlow();

    // Manually inject mock signaling client and mesh
    setPrivate(flow, 'signalingClient', mockSignalingClient);
    setPrivate(flow, 'mesh', {
      handleSignal: async () => {},
      connectedPeers: new Set(),
    });

    // Queue a signal using the signalQueue
    const signalQueue = getPrivate(flow, 'signalQueue');
    signalQueue.queue({
      toPeerId: 'guest-1',
      type: 'offer',
      data: 'test-sdp',
    });

    // Flush 3 times (simulating 3 poll cycles)
    await signalQueue.flush(mockSignalingClient); // Attempt 1, fails, retryCount=1
    let pendingSignals = signalQueue.getPending();
    assert.strictEqual(
      pendingSignals.length,
      1,
      'Signal should be requeued after 1st failure',
    );
    assert.strictEqual(pendingSignals[0].retryCount, 1);

    await signalQueue.flush(mockSignalingClient); // Attempt 2, fails, retryCount=2
    pendingSignals = signalQueue.getPending();
    assert.strictEqual(
      pendingSignals.length,
      1,
      'Signal should be requeued after 2nd failure',
    );
    assert.strictEqual(pendingSignals[0].retryCount, 2);

    await signalQueue.flush(mockSignalingClient); // Attempt 3, succeeds
    pendingSignals = signalQueue.getPending();
    assert.strictEqual(
      pendingSignals.length,
      0,
      'Signal should be cleared after success',
    );

    assert.strictEqual(
      postSignalCalls,
      3,
      'postSignal should have been called 3 times',
    );
  });

  it('drops signals after MAX_SIGNAL_RETRIES failures', async () => {
    let postSignalCalls = 0;
    const mockSignalingClient = {
      postSignal: async () => {
        postSignalCalls++;
        throw new Error('Persistent network error');
      },
      pollSignals: async () => [],
      pollEvents: async () => [],
      isHost: true,
    };

    const { ConnectionFlow } = await import(
      '../../../src/multiplayer/networking/connection-flow.ts'
    );

    const flow = new ConnectionFlow();
    setPrivate(flow, 'signalingClient', mockSignalingClient);
    setPrivate(flow, 'mesh', {
      handleSignal: async () => {},
      connectedPeers: new Set(),
    });

    const signalQueue = getPrivate(flow, 'signalQueue');
    signalQueue.queue({
      toPeerId: 'guest-1',
      type: 'offer',
      data: 'test-sdp',
    });

    // Flush 4 times (MAX_SIGNAL_RETRIES = 3, so 4th should drop)
    await signalQueue.flush(mockSignalingClient); // Attempt 1, fails, retryCount=1
    await signalQueue.flush(mockSignalingClient); // Attempt 2, fails, retryCount=2
    await signalQueue.flush(mockSignalingClient); // Attempt 3, fails, retryCount=3
    await signalQueue.flush(mockSignalingClient); // Attempt 4, exceeds max, dropped

    const pendingSignals = signalQueue.getPending();
    assert.strictEqual(
      pendingSignals.length,
      0,
      'Signal should be dropped after max retries',
    );
    assert.strictEqual(
      postSignalCalls,
      4,
      'postSignal should have been called 4 times',
    );
  });

  it('successfully sends signals without retry on first attempt', async () => {
    let postSignalCalls = 0;
    const sentSignals = [];
    const mockSignalingClient = {
      postSignal: async (targetPeerId, type, data) => {
        postSignalCalls++;
        sentSignals.push({ targetPeerId, type, data });
      },
      pollSignals: async () => [],
      pollEvents: async () => [],
      isHost: true,
    };

    const { ConnectionFlow } = await import(
      '../../../src/multiplayer/networking/connection-flow.ts'
    );

    const flow = new ConnectionFlow();
    setPrivate(flow, 'signalingClient', mockSignalingClient);
    setPrivate(flow, 'mesh', {
      handleSignal: async () => {},
      connectedPeers: new Set(),
    });

    const signalQueue = getPrivate(flow, 'signalQueue');
    signalQueue.queue({ toPeerId: 'guest-1', type: 'offer', data: 'sdp1' });
    signalQueue.queue({ toPeerId: 'guest-2', type: 'offer', data: 'sdp2' });

    await signalQueue.flush(mockSignalingClient);

    const pendingSignals = signalQueue.getPending();
    assert.strictEqual(postSignalCalls, 2, 'Both signals should be sent');
    assert.strictEqual(
      pendingSignals.length,
      0,
      'No signals should be pending',
    );
    assert.deepStrictEqual(sentSignals, [
      { targetPeerId: 'guest-1', type: 'offer', data: 'sdp1' },
      { targetPeerId: 'guest-2', type: 'offer', data: 'sdp2' },
    ]);
  });
});

console.log('Signal retry tests completed!');
