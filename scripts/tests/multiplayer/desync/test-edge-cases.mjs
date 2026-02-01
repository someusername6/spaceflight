/**
 * Desync Edge Case Tests
 *
 * Tests edge cases in desync handling.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import {
  createHostGuestAdapters,
  generateInputsForTick,
  stepBothAdapters,
} from './helpers.mjs';

// =============================================================================
// Resimulation Time Measurement
// =============================================================================

describe('Resimulation Time', () => {
  it('measures ticks between desync detection and recovery', () => {
    // In a real system, recovery involves:
    // 1. Detection (hash mismatch at confirmed tick)
    // 2. Request sync from host
    // 3. Receive snapshot (network latency)
    // 4. Apply snapshot
    // 5. Resimulate from snapshot tick to current tick

    // For this test, we simulate the resimulation cost
    const { hostAdapter, guestAdapter, hostPlayerId, guestPlayerId } =
      createHostGuestAdapters(42);

    // Run to tick 500
    for (let tick = 0; tick < 500; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);
      hostAdapter.step(inputs);
      guestAdapter.step(inputs);
    }

    // Simulate desync detected at tick 450, but we're now at tick 500
    // Need to resimulate 50 ticks after loading snapshot from tick 450
    const snapshotTick = 450;
    const currentTick = 500;
    const ticksToResimulate = currentTick - snapshotTick;

    // Time the resimulation
    const startTime = performance.now();

    // Load snapshot (we don't have one from tick 450, so just deserialize current)
    const snapshot = hostAdapter.serialize();
    guestAdapter.deserialize(snapshot);

    // Resimulate ticks (normally would replay recorded inputs)
    for (let tick = snapshotTick; tick < currentTick; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);
      guestAdapter.step(inputs);
    }

    const endTime = performance.now();
    const resimTime = endTime - startTime;

    console.log(
      `  Resimulating ${ticksToResimulate} ticks: ${resimTime.toFixed(3)}ms`,
    );

    // Should be fast enough to not cause noticeable stutter
    assert.ok(
      resimTime < 100,
      `Resimulation should be under 100ms (got ${resimTime.toFixed(3)}ms)`,
    );
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Desync Edge Cases', () => {
  it('handles desync at tick 0', () => {
    const { guestWorld, hostAdapter, guestAdapter } =
      createHostGuestAdapters(42);

    // Immediately modify guest
    guestWorld.systemState.gameTime = 999;

    // Should detect desync immediately
    assert.notStrictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Should detect desync at tick 0',
    );

    // Recovery
    guestAdapter.deserialize(hostAdapter.serialize());
    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Should recover at tick 0',
    );
  });

  it('handles rapid successive desyncs', () => {
    const {
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    for (let i = 0; i < 10; i++) {
      // Run 10 ticks
      for (let tick = 0; tick < 10; tick++) {
        const { hostInput, guestInput } = generateInputsForTick(tick);
        const inputs = new Map([
          [hostPlayerId, serializeInput(hostInput)],
          [guestPlayerId, serializeInput(guestInput)],
        ]);
        hostAdapter.step(inputs);
        guestAdapter.step(inputs);
      }

      // Desync
      guestWorld.systemState.gameTime += 0.001;

      // Recover
      guestAdapter.deserialize(hostAdapter.serialize());

      // Verify
      assert.strictEqual(
        hostAdapter.hash(),
        guestAdapter.hash(),
        `Recovery ${i + 1} should succeed`,
      );
    }
  });

  it('recovers from corrupted PRNG state', () => {
    const {
      hostWorld,
      guestWorld,
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
    } = createHostGuestAdapters(42);

    stepBothAdapters(
      hostAdapter,
      guestAdapter,
      hostPlayerId,
      guestPlayerId,
      100,
    );

    // Corrupt PRNG on guest
    guestWorld.prng.seed = 0xdeadbeef;

    // Verify desync
    assert.notStrictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'PRNG corruption should cause desync',
    );

    // Recover
    guestAdapter.deserialize(hostAdapter.serialize());

    // PRNG should be restored
    assert.strictEqual(
      hostWorld.prng.seed,
      guestWorld.prng.seed,
      'PRNG seed should be restored',
    );
    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Hashes should match after PRNG recovery',
    );
  });
});
