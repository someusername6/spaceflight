/**
 * Multiplayer Replay Determinism Tests
 *
 * Verifies that replays produce identical results.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { decodeRLE } from '../../../../src/replay/compression.ts';
import { MultiplayerInputRecorder } from '../../../../src/replay/multiplayer-replay.ts';
import { worldHashesMatch } from '../../../../src/serialization/index.ts';
import {
  createMultiplayerWorld,
  generateInputsForTick,
  runSyncedSimulation,
} from './helpers.mjs';

// =============================================================================
// Multiplayer Replay Determinism Tests
// =============================================================================

describe('Multiplayer Replay Determinism', () => {
  it('replaying recorded inputs produces identical hash sequence', () => {
    const seed = 42;
    const tickCount = 300;

    // First run: record inputs
    const {
      world: world1,
      hostEntity,
      guestEntity,
    } = createMultiplayerWorld(seed);
    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const playerMap = new Map([
      [hostPlayerId, hostEntity],
      [guestPlayerId, guestEntity],
    ]);

    const adapter1 = new SpaceflightGameAdapter(world1, playerMap);
    const recorder = new MultiplayerInputRecorder(seed, 'test-mission');
    recorder.addPlayer(hostPlayerId);
    recorder.addPlayer(guestPlayerId);
    adapter1.setInputRecorder(recorder);

    const originalHashes = [];

    for (let tick = 0; tick < tickCount; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);

      const inputs = new Map([
        [hostPlayerId, serializeInput(hostInput)],
        [guestPlayerId, serializeInput(guestInput)],
      ]);

      adapter1.step(inputs);
      originalHashes.push(adapter1.hash());
    }

    // Get recorded input data
    const playerInputs = recorder.buildPlayerInputs();
    assert.strictEqual(playerInputs.length, 2, 'Should have 2 player inputs');

    // Decompress inputs for replay
    const hostInputs = playerInputs.find((p) => p.playerId === hostPlayerId);
    const guestInputs = playerInputs.find((p) => p.playerId === guestPlayerId);

    const hostDecompressed = decodeRLE(
      hostInputs.inputs,
      hostInputs.inputsCompressed,
    );
    const guestDecompressed = decodeRLE(
      guestInputs.inputs,
      guestInputs.inputsCompressed,
    );

    // Second run: replay from recorded inputs
    const {
      world: world2,
      hostEntity: hostEntity2,
      guestEntity: guestEntity2,
    } = createMultiplayerWorld(seed);

    const playerMap2 = new Map([
      [hostPlayerId, hostEntity2],
      [guestPlayerId, guestEntity2],
    ]);

    const adapter2 = new SpaceflightGameAdapter(world2, playerMap2);
    const replayHashes = [];

    for (let tick = 0; tick < tickCount; tick++) {
      // Reconstruct inputs from recorded data
      const hostBits = hostDecompressed[tick] ?? 0;
      const guestBits = guestDecompressed[tick] ?? 0;

      // Convert bits back to serialized input format
      const hostBytes = new Uint8Array(4);
      new DataView(hostBytes.buffer).setUint32(0, hostBits, true);
      const guestBytes = new Uint8Array(4);
      new DataView(guestBytes.buffer).setUint32(0, guestBits, true);

      const inputs = new Map([
        [hostPlayerId, hostBytes],
        [guestPlayerId, guestBytes],
      ]);

      adapter2.step(inputs);
      replayHashes.push(adapter2.hash());
    }

    // Verify all hashes match
    for (let tick = 0; tick < tickCount; tick++) {
      assert.strictEqual(
        replayHashes[tick],
        originalHashes[tick],
        `Hash mismatch at tick ${tick}`,
      );
    }
  });

  it('same inputs produce same result across sessions', () => {
    const seed = 12345;
    const tickCount = 500;

    // Run simulation twice with same parameters
    const run1 = runSyncedSimulation(seed, tickCount);
    const run2 = runSyncedSimulation(seed, tickCount);

    // Compare hashes at all captured points
    for (const [tick, hash1] of run1.hashes) {
      const hash2 = run2.hashes.get(tick);
      assert.strictEqual(hash2, hash1, `Hashes should match at tick ${tick}`);
    }

    // Final worlds should be equal
    assert(
      worldHashesMatch(run1.world, run2.world),
      'Final worlds should be equal',
    );
  });
});
