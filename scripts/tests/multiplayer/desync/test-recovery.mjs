/**
 * Desync Recovery Tests
 *
 * Tests that desync recovery works by restoring host state.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { worldHashesMatch } from '../../../../src/serialization/index.ts';
import {
  createHostGuestAdapters,
  generateInputsForTick,
  stepBothAdapters,
} from './helpers.mjs';

// =============================================================================
// Desync Recovery Tests
// =============================================================================

describe('Desync Recovery', () => {
  it('recovers by restoring host state to guest', () => {
    const {
      hostWorld,
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    // Run 100 ticks in sync
    stepBothAdapters(
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
      100,
    );

    // Verify sync
    const hostHash = hostAdapter.hash();
    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Should be in sync',
    );

    // Introduce desync
    guestWorld.systemState.gameTime += 999;
    assert.notStrictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Should be desynced',
    );

    // Recovery: serialize host state and deserialize to guest
    const hostSnapshot = hostAdapter.serialize();
    guestAdapter.deserialize(hostSnapshot);

    // Should be back in sync
    assert.strictEqual(
      guestAdapter.hash(),
      hostHash,
      'Guest should match host after recovery',
    );
    assert(
      worldHashesMatch(hostWorld, guestWorld),
      'Worlds should be equal after recovery',
    );
  });

  it('can continue simulation after recovery', () => {
    const {
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    // Run 50 ticks
    stepBothAdapters(
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
      50,
    );

    // Introduce desync
    guestWorld.prng.seed = 999999;

    // Recover
    const hostSnapshot = hostAdapter.serialize();
    guestAdapter.deserialize(hostSnapshot);

    // Continue simulation for 50 more ticks
    for (let tick = 50; tick < 100; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);

      hostAdapter.step(inputs);
      guestAdapter.step(inputs);

      // Should stay in sync after recovery
      assert.strictEqual(
        hostAdapter.hash(),
        guestAdapter.hash(),
        `Should be in sync at tick ${tick}`,
      );
    }
  });

  it('handles multiple recoveries', () => {
    const {
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    for (let recovery = 0; recovery < 3; recovery++) {
      // Run 30 ticks
      for (let tick = 0; tick < 30; tick++) {
        const { hostInput, guestInput } = generateInputsForTick(tick);
        const inputs = new Map([
          [hostPlayerId, serializeInput(hostInput)],
          [guestPlayerId, serializeInput(guestInput)],
        ]);
        hostAdapter.step(inputs);
        guestAdapter.step(inputs);
      }

      // Introduce desync
      guestWorld.systemState.gameTime += 100;

      // Recover
      guestAdapter.deserialize(hostAdapter.serialize());

      // Verify recovery
      assert.strictEqual(
        hostAdapter.hash(),
        guestAdapter.hash(),
        `Recovery ${recovery + 1} should succeed`,
      );
    }
  });
});

// =============================================================================
// Recovery Time Measurement
// =============================================================================

describe('Recovery Time Measurement', () => {
  it('measures snapshot serialization time', () => {
    const { hostAdapter, hostPlayerId, guestPlayerId } =
      createHostGuestAdapters(42);

    // Build up some state
    for (let tick = 0; tick < 500; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);
      hostAdapter.step(inputs);
    }

    // Measure serialization time
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      hostAdapter.serialize();
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;

    console.log(
      `  Serialization time: ${avgTime.toFixed(3)}ms avg over ${iterations} iterations`,
    );

    // Target: <5ms
    assert.ok(
      avgTime < 5,
      `Serialization should be under 5ms (got ${avgTime.toFixed(3)}ms)`,
    );
  });

  it('measures snapshot deserialization time', () => {
    const { hostAdapter, guestAdapter, hostPlayerId, guestPlayerId } =
      createHostGuestAdapters(42);

    // Build up some state
    for (let tick = 0; tick < 500; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);
      hostAdapter.step(inputs);
      guestAdapter.step(inputs);
    }

    const snapshot = hostAdapter.serialize();

    // Measure deserialization time
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      guestAdapter.deserialize(snapshot);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;

    console.log(
      `  Deserialization time: ${avgTime.toFixed(3)}ms avg over ${iterations} iterations`,
    );

    // Target: <5ms
    assert.ok(
      avgTime < 5,
      `Deserialization should be under 5ms (got ${avgTime.toFixed(3)}ms)`,
    );
  });

  it('measures full recovery cycle time', () => {
    const {
      hostAdapter,
      guestAdapter,
      guestWorld,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    // Build up state
    for (let tick = 0; tick < 500; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);
      hostAdapter.step(inputs);
      guestAdapter.step(inputs);
    }

    // Introduce desync
    guestWorld.systemState.gameTime += 999;

    // Measure full recovery cycle
    const iterations = 50;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      // Re-desync
      guestWorld.systemState.gameTime += 1;

      const startTime = performance.now();

      // Detection (hash comparison)
      const hostHash = hostAdapter.hash();
      const guestHash = guestAdapter.hash();
      const isDesynced = hostHash !== guestHash;

      // Recovery
      if (isDesynced) {
        const snapshot = hostAdapter.serialize();
        guestAdapter.deserialize(snapshot);
      }

      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(
      `  Full recovery cycle: avg=${avgTime.toFixed(3)}ms, min=${minTime.toFixed(3)}ms, max=${maxTime.toFixed(3)}ms`,
    );

    // Target: full cycle under 10ms
    assert.ok(
      avgTime < 10,
      `Full recovery should be under 10ms (got ${avgTime.toFixed(3)}ms)`,
    );
  });
});
