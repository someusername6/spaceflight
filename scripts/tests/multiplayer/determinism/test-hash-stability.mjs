/**
 * Hash Stability and Host/Guest Identity Tests
 *
 * Tests hash stability and that host/guest reach identical state.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import {
  computeWorldHash,
  worldHashesMatch,
} from '../../../../src/serialization/index.ts';
import {
  createMultiplayerWorld,
  generateInputsForTick,
  runSyncedSimulation,
} from './helpers.mjs';

// =============================================================================
// Hash Stability Tests
// =============================================================================

describe('Hash Stability Across Sessions', () => {
  it('serialize/deserialize produces same hash', () => {
    const seed = 42;
    const { world, hostEntity, guestEntity } = createMultiplayerWorld(seed);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const playerMap = new Map([
      [hostPlayerId, hostEntity],
      [guestPlayerId, guestEntity],
    ]);

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run some ticks to build state
    for (let tick = 0; tick < 100; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      adapter.step(
        new Map([
          [hostPlayerId, serializeInput(hostInput)],
          [guestPlayerId, serializeInput(guestInput)],
        ]),
      );
    }

    const hashBefore = adapter.hash();
    const snapshot = adapter.serialize();

    // Restore from snapshot
    adapter.deserialize(snapshot);

    const hashAfter = adapter.hash();
    assert.strictEqual(
      hashAfter,
      hashBefore,
      'Hash should match after restore',
    );
  });

  it('hash is stable across multiple computations', () => {
    const seed = 42;
    const run = runSyncedSimulation(seed, 200);

    // Compute hash multiple times
    const hash1 = computeWorldHash(run.world);
    const hash2 = computeWorldHash(run.world);
    const hash3 = computeWorldHash(run.world);

    assert.strictEqual(hash1, hash2, 'Hash should be stable (1-2)');
    assert.strictEqual(hash2, hash3, 'Hash should be stable (2-3)');
  });

  it('different seeds produce different hashes', () => {
    const run1 = runSyncedSimulation(42, 100);
    const run2 = runSyncedSimulation(43, 100);

    // Final hashes should differ
    const finalHash1 = run1.hashes.get(99);
    const finalHash2 = run2.hashes.get(99);

    // With different seeds, PRNG state diverges, so hashes should differ
    assert.notStrictEqual(
      finalHash1,
      finalHash2,
      'Different seeds should produce different final hashes',
    );
  });
});

// =============================================================================
// Host/Guest State Identity Tests
// =============================================================================

describe('Host/Guest State Identity', () => {
  it('host and guest reach identical state with same inputs', async () => {
    // Create two separate worlds simulating host and guest
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

    // Both worlds have same entity mapping
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

    // Verify initial hashes match
    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'Initial hashes should match',
    );

    // Run 500 ticks with identical inputs on both
    for (let tick = 0; tick < 500; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);

      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);

      hostAdapter.step(inputs);
      guestAdapter.step(inputs);

      // Verify sync every 50 ticks
      if (tick % 50 === 0) {
        assert.strictEqual(
          hostAdapter.hash(),
          guestAdapter.hash(),
          `Hashes should match at tick ${tick}`,
        );
      }
    }

    // Final verification
    assert(
      worldHashesMatch(hostWorld, guestWorld),
      'Host and guest worlds should be identical',
    );
  });

  it('desync is detectable via hash comparison', () => {
    const seed = 42;
    const run1 = runSyncedSimulation(seed, 100);
    const run2 = runSyncedSimulation(seed, 100);

    // Intentionally modify one world
    run2.world.systemState.gameTime += 1;

    const hash1 = computeWorldHash(run1.world);
    const hash2 = computeWorldHash(run2.world);

    assert.notStrictEqual(
      hash1,
      hash2,
      'Modified world should have different hash',
    );
  });
});
