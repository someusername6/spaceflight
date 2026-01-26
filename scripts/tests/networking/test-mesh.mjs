/**
 * Unit tests for WebRTCMesh channel selection.
 *
 * Run with: npx tsx scripts/tests/networking/test-mesh.mjs
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Import mocks - must be before any module that uses WebRTC
import { getPrivate, MockRTCDataChannel } from './webrtc-mocks.mjs';

// Import after mocks are installed
const { WebRTCMesh } = await import(
  '../../../src/multiplayer/networking/webrtc-mesh.ts'
);

// =============================================================================
// Tests: WebRTCMesh Channel Selection
// =============================================================================

describe('WebRTCMesh Channel Selection', () => {
  it('sends on reliable channel when reliable=true', async () => {
    const mesh = new WebRTCMesh(
      { iceServers: [], meshTimeoutMs: 10000 },
      { onSignalNeeded: () => {} },
    );

    mesh.initializeAsHost('host-1');

    // Simulate a peer connection being established
    const peerId = 'guest-1';
    mesh.addPeer(peerId);

    // Get the peer state and simulate channel opens
    const peers = getPrivate(mesh, 'peers');
    const peerState = peers.get(peerId);
    assert.ok(peerState, 'Peer state should exist');

    // Simulate incoming data channels (as if we received them)
    const reliableChannel = new MockRTCDataChannel('reliable', {
      ordered: true,
    });
    const unreliableChannel = new MockRTCDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });

    peerState.reliableChannel = reliableChannel;
    peerState.unreliableChannel = unreliableChannel;
    peerState.connected = true;
    getPrivate(mesh, '_connectedPeers').add(peerId);

    // Open both channels
    reliableChannel._simulateOpen();
    unreliableChannel._simulateOpen();

    // Send with reliable=true
    const testData = new Uint8Array([1, 2, 3]);
    mesh.send(peerId, testData, true);

    // Verify it went to reliable channel
    assert.strictEqual(
      reliableChannel._sentMessages.length,
      1,
      'Reliable channel should have 1 message',
    );
    assert.strictEqual(
      unreliableChannel._sentMessages.length,
      0,
      'Unreliable channel should have 0 messages',
    );

    mesh.dispose();
  });

  it('sends on unreliable channel when reliable=false', async () => {
    const mesh = new WebRTCMesh(
      { iceServers: [], meshTimeoutMs: 10000 },
      { onSignalNeeded: () => {} },
    );

    mesh.initializeAsHost('host-1');

    const peerId = 'guest-1';
    mesh.addPeer(peerId);

    const peers = getPrivate(mesh, 'peers');
    const peerState = peers.get(peerId);
    assert.ok(peerState, 'Peer state should exist');

    const reliableChannel = new MockRTCDataChannel('reliable', {
      ordered: true,
    });
    const unreliableChannel = new MockRTCDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });

    peerState.reliableChannel = reliableChannel;
    peerState.unreliableChannel = unreliableChannel;
    peerState.connected = true;
    getPrivate(mesh, '_connectedPeers').add(peerId);

    reliableChannel._simulateOpen();
    unreliableChannel._simulateOpen();

    // Send with reliable=false
    const testData = new Uint8Array([4, 5, 6]);
    mesh.send(peerId, testData, false);

    // Verify it went to unreliable channel
    assert.strictEqual(
      reliableChannel._sentMessages.length,
      0,
      'Reliable channel should have 0 messages',
    );
    assert.strictEqual(
      unreliableChannel._sentMessages.length,
      1,
      'Unreliable channel should have 1 message',
    );

    mesh.dispose();
  });

  it('broadcast respects reliable parameter', async () => {
    const mesh = new WebRTCMesh(
      { iceServers: [], meshTimeoutMs: 10000 },
      { onSignalNeeded: () => {} },
    );

    mesh.initializeAsHost('host-1');

    const peers = getPrivate(mesh, 'peers');
    const connectedPeers = getPrivate(mesh, '_connectedPeers');

    // Add two peers
    for (const peerId of ['guest-1', 'guest-2']) {
      mesh.addPeer(peerId);
      const peerState = peers.get(peerId);

      const reliableChannel = new MockRTCDataChannel('reliable');
      const unreliableChannel = new MockRTCDataChannel('unreliable');

      peerState.reliableChannel = reliableChannel;
      peerState.unreliableChannel = unreliableChannel;
      peerState.connected = true;
      connectedPeers.add(peerId);

      reliableChannel._simulateOpen();
      unreliableChannel._simulateOpen();
    }

    // Broadcast unreliably
    mesh.broadcast(new Uint8Array([7, 8, 9]), false);

    // Check both peers received on unreliable
    for (const peerId of ['guest-1', 'guest-2']) {
      const peerState = peers.get(peerId);
      assert.strictEqual(
        peerState.reliableChannel._sentMessages.length,
        0,
        `${peerId} reliable should be empty`,
      );
      assert.strictEqual(
        peerState.unreliableChannel._sentMessages.length,
        1,
        `${peerId} unreliable should have 1 message`,
      );
    }

    mesh.dispose();
  });
});

console.log('Mesh tests completed!');
