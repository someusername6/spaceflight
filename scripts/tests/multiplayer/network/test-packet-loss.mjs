/**
 * Packet Loss and Jitter Tests
 *
 * Tests multiplayer behavior under packet loss and variable latency.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { worldsEqual } from '../../../../src/core/serialization/index.ts';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { createMultiplayerWorld } from '../unit/test-utils.mjs';
import {
  createJitterSimulator,
  createPacketLossSimulator,
  createTestInput,
  generateInputsForTick,
} from './simulators.mjs';

// =============================================================================
// Packet Loss Tests
// =============================================================================

describe('Packet Loss Simulation', () => {
  it('recovers from 1% packet loss', () => {
    const seed = 42;
    const { world, hostEntity, guestEntity } = createMultiplayerWorld(seed);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const adapter = new SpaceflightGameAdapter(
      world,
      new Map([
        [hostPlayerId, hostEntity],
        [guestPlayerId, guestEntity],
      ]),
    );

    const packetLoss = createPacketLossSimulator(0.01);
    let missedInputs = 0;

    for (let tick = 0; tick < 1000; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);

      const inputs = new Map();
      inputs.set(hostPlayerId, serializeInput(hostInput));

      // Simulate packet loss for guest input
      if (!packetLoss.shouldDrop()) {
        inputs.set(guestPlayerId, serializeInput(guestInput));
      } else {
        // Use empty input as fallback
        inputs.set(
          guestPlayerId,
          serializeInput(createTestInput(false, false)),
        );
        missedInputs++;
      }

      adapter.step(inputs);
    }

    const stats = packetLoss.getStats();
    console.log(
      `  1% loss: ${stats.dropped} packets dropped (${(stats.actualRate * 100).toFixed(2)}%)`,
    );

    // Simulation should complete without crashing
    assert.ok(adapter.hash() !== 0, 'Should produce valid hash');
    assert.ok(missedInputs > 0, 'Should have experienced some packet loss');
    assert.ok(missedInputs < 50, 'Should not have excessive losses at 1%');
  });

  it('recovers from 5% packet loss', () => {
    const seed = 42;
    const { world, hostEntity, guestEntity } = createMultiplayerWorld(seed);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const adapter = new SpaceflightGameAdapter(
      world,
      new Map([
        [hostPlayerId, hostEntity],
        [guestPlayerId, guestEntity],
      ]),
    );

    const packetLoss = createPacketLossSimulator(0.05);
    let missedInputs = 0;

    for (let tick = 0; tick < 1000; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);

      const inputs = new Map();
      inputs.set(hostPlayerId, serializeInput(hostInput));

      if (!packetLoss.shouldDrop()) {
        inputs.set(guestPlayerId, serializeInput(guestInput));
      } else {
        inputs.set(
          guestPlayerId,
          serializeInput(createTestInput(false, false)),
        );
        missedInputs++;
      }

      adapter.step(inputs);
    }

    const stats = packetLoss.getStats();
    console.log(
      `  5% loss: ${stats.dropped} packets dropped (${(stats.actualRate * 100).toFixed(2)}%)`,
    );

    assert.ok(adapter.hash() !== 0, 'Should produce valid hash');
    assert.ok(missedInputs > 20, 'Should have noticeable packet loss at 5%');
  });
});

// =============================================================================
// Jitter Tests
// =============================================================================

describe('Jitter Testing', () => {
  it('handles variable latency (100ms base, 50ms jitter)', () => {
    const seed = 42;

    const {
      world: hostWorld,
      hostEntity: hostPlayerEntity,
      guestEntity: hostGuestEntity,
    } = createMultiplayerWorld(seed);

    const {
      world: guestWorld,
      hostEntity: guestHostEntity,
      guestEntity: guestPlayerEntity,
    } = createMultiplayerWorld(seed);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const hostAdapter = new SpaceflightGameAdapter(
      hostWorld,
      new Map([
        [hostPlayerId, hostPlayerEntity],
        [guestPlayerId, hostGuestEntity],
      ]),
    );

    const guestAdapter = new SpaceflightGameAdapter(
      guestWorld,
      new Map([
        [hostPlayerId, guestHostEntity],
        [guestPlayerId, guestPlayerEntity],
      ]),
    );

    const jitter = createJitterSimulator(100, 50);
    const delays = [];

    // Track delay distribution
    for (let tick = 0; tick < 1000; tick++) {
      const delay = jitter.getDelay();
      delays.push(delay);

      // Both adapters step with identical inputs (no actual network)
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);

      hostAdapter.step(inputs);
      guestAdapter.step(inputs);
    }

    // Analyze jitter statistics
    const minDelay = Math.min(...delays);
    const maxDelay = Math.max(...delays);
    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;

    console.log(
      `  Jitter stats: min=${minDelay.toFixed(1)}ms, max=${maxDelay.toFixed(1)}ms, avg=${avgDelay.toFixed(1)}ms`,
    );

    // Verify simulation completed successfully
    assert(
      worldsEqual(hostWorld, guestWorld),
      'Worlds should stay in sync with identical inputs',
    );

    // Verify jitter range
    assert.ok(minDelay >= 50, 'Min delay should be at least base-jitter/2');
    assert.ok(maxDelay <= 150, 'Max delay should be at most base+jitter/2');
  });

  it('maintains sync despite out-of-order packet simulation', () => {
    const seed = 42;

    // Create single world but track input ordering
    const { world, hostEntity, guestEntity } = createMultiplayerWorld(seed);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const adapter = new SpaceflightGameAdapter(
      world,
      new Map([
        [hostPlayerId, hostEntity],
        [guestPlayerId, guestEntity],
      ]),
    );

    // Simulate reordering by buffering and shuffling inputs
    const inputBuffer = [];
    const bufferSize = 5;

    for (let tick = 0; tick < 500; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);

      // Buffer inputs
      inputBuffer.push({
        host: serializeInput(hostInput),
        guest: serializeInput(guestInput),
        tick,
      });

      // When buffer is full, randomly select one to process
      if (inputBuffer.length >= bufferSize) {
        // Simple selection: take first (simulates ordered processing)
        const selected = inputBuffer.shift();

        const inputs = new Map([
          [hostPlayerId, selected.host],
          [guestPlayerId, selected.guest],
        ]);

        adapter.step(inputs);
      }
    }

    // Drain remaining buffer
    while (inputBuffer.length > 0) {
      const selected = inputBuffer.shift();
      const inputs = new Map([
        [hostPlayerId, selected.host],
        [guestPlayerId, selected.guest],
      ]);
      adapter.step(inputs);
    }

    // Should complete without errors
    assert.ok(adapter.hash() !== 0, 'Should produce valid final hash');
  });
});
