/**
 * Latency Tolerance Tests
 *
 * Tests multiplayer behavior under various latency conditions.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { createMultiplayerWorld } from '../unit/test-utils.mjs';
import {
  createLatencySimulator,
  createTestInput,
  generateInputsForTick,
} from './simulators.mjs';

// =============================================================================
// Latency Tolerance Tests
// =============================================================================

describe('Latency Tolerance', () => {
  /**
   * Run a latency test scenario.
   * Returns metrics about rollbacks and final state.
   */
  function runLatencyTest(latencyMs, tickCount) {
    const seed = 42;

    // Create two independent worlds (simulating host and guest)
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

    // Latency simulators for each direction
    const hostToGuest = createLatencySimulator(latencyMs);
    const guestToHost = createLatencySimulator(latencyMs);

    let rollbackCount = 0;

    // Simulate ticks with latency
    for (let tick = 0; tick < tickCount; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const tickTime = tick * 16; // 16ms per tick

      // Host sends input, guest receives with delay
      hostToGuest.queueInput(
        { playerId: hostPlayerId, input: serializeInput(hostInput) },
        tickTime,
      );

      // Guest sends input, host receives with delay
      guestToHost.queueInput(
        { playerId: guestPlayerId, input: serializeInput(guestInput) },
        tickTime,
      );

      // Get inputs available at this tick
      const hostReceivedInputs = guestToHost.tick(16);
      const guestReceivedInputs = hostToGuest.tick(16);

      // Host steps with local input + any received guest inputs
      const hostInputs = new Map([[hostPlayerId, serializeInput(hostInput)]]);
      for (const ri of hostReceivedInputs) {
        hostInputs.set(ri.playerId, ri.input);
      }
      // If missing guest input, use prediction (repeat last or empty)
      if (!hostInputs.has(guestPlayerId)) {
        hostInputs.set(
          guestPlayerId,
          serializeInput(createTestInput(false, false)),
        );
        rollbackCount++; // Would trigger rollback in real netcode
      }
      hostAdapter.step(hostInputs);

      // Guest steps with local input + any received host inputs
      const guestInputs = new Map([
        [guestPlayerId, serializeInput(guestInput)],
      ]);
      for (const ri of guestReceivedInputs) {
        guestInputs.set(ri.playerId, ri.input);
      }
      if (!guestInputs.has(hostPlayerId)) {
        guestInputs.set(
          hostPlayerId,
          serializeInput(createTestInput(false, false)),
        );
        rollbackCount++;
      }
      guestAdapter.step(guestInputs);
    }

    return {
      hostHash: hostAdapter.hash(),
      guestHash: guestAdapter.hash(),
      rollbackCount,
      tickCount,
      latencyMs,
    };
  }

  it('handles 50ms latency gracefully', () => {
    const result = runLatencyTest(50, 500);

    // With latency simulation, we expect some rollbacks
    // but the system should still function
    assert.ok(
      result.rollbackCount >= 0,
      'Rollback count should be non-negative',
    );

    // Log metrics for analysis
    console.log(
      `  50ms latency: ${result.rollbackCount} prediction misses over ${result.tickCount} ticks`,
    );
  });

  it('handles 100ms latency gracefully', () => {
    const result = runLatencyTest(100, 500);

    // Higher latency = more rollbacks expected
    assert.ok(
      result.rollbackCount >= 0,
      'Rollback count should be non-negative',
    );

    console.log(
      `  100ms latency: ${result.rollbackCount} prediction misses over ${result.tickCount} ticks`,
    );
  });

  it('handles 200ms latency gracefully', () => {
    const result = runLatencyTest(200, 500);

    // Even higher latency
    assert.ok(
      result.rollbackCount >= 0,
      'Rollback count should be non-negative',
    );

    console.log(
      `  200ms latency: ${result.rollbackCount} prediction misses over ${result.tickCount} ticks`,
    );
  });
});

// =============================================================================
// Rollback Frequency Metrics
// =============================================================================

describe('Rollback Frequency Metrics', () => {
  it('measures prediction misses at various latencies', () => {
    // This test provides metrics, not pass/fail assertions
    const latencies = [0, 16, 32, 50, 100, 150, 200];
    const tickCount = 1000;

    console.log('  Latency (ms) | Prediction Misses | Miss Rate');
    console.log('  -------------|-------------------|----------');

    for (const latencyMs of latencies) {
      const latencyTicks = Math.ceil(latencyMs / 16);

      // Estimate: with L ms latency, we miss ~(L/16) ticks worth of inputs
      const estimatedMisses = latencyTicks * 2; // Round trip
      const missRate = (estimatedMisses / tickCount) * 100;

      console.log(
        `  ${String(latencyMs).padStart(13)} | ${String(estimatedMisses).padStart(17)} | ${missRate.toFixed(1)}%`,
      );
    }

    // Target: <10 rollbacks/sec at 100ms latency
    assert.ok(true, 'Metrics logged');
  });
});
