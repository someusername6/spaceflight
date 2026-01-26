/**
 * Unit tests for WebRTCTransport RTT tracking.
 *
 * Run with: npx tsx scripts/tests/networking/test-rtt-tracking.mjs
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Import mocks - must be before any module that uses WebRTC
import './webrtc-mocks.mjs';

// =============================================================================
// Tests: WebRTCTransport RTT Tracking
// =============================================================================

describe('WebRTCTransport RTT Tracking', () => {
  // Mock performance.now for deterministic testing
  let originalPerformanceNow;
  let mockTime;

  function installMockPerformance() {
    originalPerformanceNow = performance.now;
    mockTime = 0;
    performance.now = () => mockTime;
  }

  function restorePerformance() {
    performance.now = originalPerformanceNow;
  }

  function advanceTime(ms) {
    mockTime += ms;
  }

  it('returns null metrics when no pings recorded', async () => {
    const { WebRTCTransport } = await import(
      '../../../src/multiplayer/networking/webrtc-transport.ts'
    );

    const mockMesh = {
      localPeerId: 'local-1',
      connectedPeers: new Set(['peer-1']),
      removePeer: () => {},
    };

    const transport = new WebRTCTransport(mockMesh);
    const metrics = transport.getConnectionMetrics('peer-1');
    assert.strictEqual(metrics, null, 'Should return null with no data');
  });

  it('calculates RTT from ping/pong', async () => {
    installMockPerformance();

    try {
      const { WebRTCTransport } = await import(
        '../../../src/multiplayer/networking/webrtc-transport.ts'
      );

      const mockMesh = {
        localPeerId: 'local-1',
        connectedPeers: new Set(['peer-1']),
        removePeer: () => {},
      };

      const transport = new WebRTCTransport(mockMesh);

      // Simulate ping at t=0
      transport.recordPingSent('peer-1', 1);

      // Simulate pong at t=50ms
      advanceTime(50);
      transport.recordPongReceived('peer-1', 1);

      const metrics = transport.getConnectionMetrics('peer-1');
      assert.ok(metrics, 'Should have metrics');
      assert.strictEqual(metrics.rtt, 50, 'RTT should be 50ms');
      assert.strictEqual(
        metrics.jitter,
        0,
        'Jitter should be 0 with single sample',
      );
      assert.strictEqual(metrics.packetLoss, 0, 'No packet loss expected');
    } finally {
      restorePerformance();
    }
  });

  it('calculates average RTT from multiple samples', async () => {
    installMockPerformance();

    try {
      const { WebRTCTransport } = await import(
        '../../../src/multiplayer/networking/webrtc-transport.ts'
      );

      const mockMesh = {
        localPeerId: 'local-1',
        connectedPeers: new Set(['peer-1']),
        removePeer: () => {},
      };

      const transport = new WebRTCTransport(mockMesh);

      // Three pings with different RTTs: 40ms, 50ms, 60ms
      transport.recordPingSent('peer-1', 1);
      advanceTime(40);
      transport.recordPongReceived('peer-1', 1);

      transport.recordPingSent('peer-1', 2);
      advanceTime(50);
      transport.recordPongReceived('peer-1', 2);

      transport.recordPingSent('peer-1', 3);
      advanceTime(60);
      transport.recordPongReceived('peer-1', 3);

      const metrics = transport.getConnectionMetrics('peer-1');
      assert.ok(metrics, 'Should have metrics');
      assert.strictEqual(metrics.rtt, 50, 'Average RTT should be 50ms');
      // Jitter = average deviation from mean = (10 + 0 + 10) / 3 ≈ 6.67
      assert.ok(
        Math.abs(metrics.jitter - 6.67) < 0.1,
        `Jitter should be ~6.67, got ${metrics.jitter}`,
      );
    } finally {
      restorePerformance();
    }
  });

  it('estimates packet loss from stale pings', async () => {
    installMockPerformance();

    try {
      const { WebRTCTransport } = await import(
        '../../../src/multiplayer/networking/webrtc-transport.ts'
      );

      const mockMesh = {
        localPeerId: 'local-1',
        connectedPeers: new Set(['peer-1']),
        removePeer: () => {},
      };

      const transport = new WebRTCTransport(mockMesh);

      // Send 4 pings, only 3 get responses
      transport.recordPingSent('peer-1', 1);
      advanceTime(50);
      transport.recordPongReceived('peer-1', 1);

      transport.recordPingSent('peer-1', 2);
      advanceTime(50);
      transport.recordPongReceived('peer-1', 2);

      transport.recordPingSent('peer-1', 3);
      advanceTime(50);
      transport.recordPongReceived('peer-1', 3);

      // Ping 4 never gets a response
      transport.recordPingSent('peer-1', 4);

      // Wait beyond stale threshold (2000ms)
      advanceTime(2500);

      const metrics = transport.getConnectionMetrics('peer-1');
      assert.ok(metrics, 'Should have metrics');
      // 3 successful + 1 stale = 4 total, 1/4 = 0.25 packet loss
      assert.strictEqual(
        metrics.packetLoss,
        0.25,
        'Should show 25% packet loss',
      );
    } finally {
      restorePerformance();
    }
  });

  it('clears metrics on disconnect', async () => {
    installMockPerformance();

    try {
      const { WebRTCTransport } = await import(
        '../../../src/multiplayer/networking/webrtc-transport.ts'
      );

      let removedPeer = null;
      const mockMesh = {
        localPeerId: 'local-1',
        connectedPeers: new Set(['peer-1']),
        removePeer: (peerId) => {
          removedPeer = peerId;
        },
      };

      const transport = new WebRTCTransport(mockMesh);

      // Record some metrics
      transport.recordPingSent('peer-1', 1);
      advanceTime(50);
      transport.recordPongReceived('peer-1', 1);

      assert.ok(
        transport.getConnectionMetrics('peer-1'),
        'Should have metrics',
      );

      // Disconnect clears metrics
      transport.disconnect('peer-1');

      assert.strictEqual(removedPeer, 'peer-1', 'Should call mesh.removePeer');
      assert.strictEqual(
        transport.getConnectionMetrics('peer-1'),
        null,
        'Metrics should be cleared',
      );
    } finally {
      restorePerformance();
    }
  });

  it('ignores pong for unknown ping', async () => {
    installMockPerformance();

    try {
      const { WebRTCTransport } = await import(
        '../../../src/multiplayer/networking/webrtc-transport.ts'
      );

      const mockMesh = {
        localPeerId: 'local-1',
        connectedPeers: new Set(['peer-1']),
        removePeer: () => {},
      };

      const transport = new WebRTCTransport(mockMesh);

      // Pong for a ping we never sent
      transport.recordPongReceived('peer-1', 999);

      const metrics = transport.getConnectionMetrics('peer-1');
      assert.strictEqual(metrics, null, 'Should have no metrics');
    } finally {
      restorePerformance();
    }
  });
});

console.log('RTT tracking tests completed!');
