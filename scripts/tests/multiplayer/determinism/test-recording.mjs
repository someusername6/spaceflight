/**
 * Input Recording Integration Tests
 *
 * Tests input recording for multiplayer replays.
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
import {
  createMultiplayerWorld,
  createTestInput,
  generateInputsForTick,
} from './helpers.mjs';

// =============================================================================
// Input Recording Integration Tests
// =============================================================================

describe('Input Recording Integration', () => {
  it('recorder captures all player inputs', () => {
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

    const recorder = new MultiplayerInputRecorder(seed, 'test-mission');
    recorder.addPlayer(hostPlayerId);
    recorder.addPlayer(guestPlayerId);
    adapter.setInputRecorder(recorder);

    // Run 100 ticks
    for (let tick = 0; tick < 100; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      adapter.step(
        new Map([
          [hostPlayerId, serializeInput(hostInput)],
          [guestPlayerId, serializeInput(guestInput)],
        ]),
      );
    }

    assert.strictEqual(recorder.getTickCount(), 100, 'Should have 100 ticks');

    const playerInputs = recorder.buildPlayerInputs();
    assert.strictEqual(playerInputs.length, 2, 'Should have 2 player inputs');

    // Both players should have input data
    for (const pi of playerInputs) {
      assert.ok(pi.inputs.length > 0, `${pi.playerId} should have inputs`);
    }
  });

  it('recorder handles player join mid-mission', () => {
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

    const recorder = new MultiplayerInputRecorder(seed, 'test-mission');
    recorder.addPlayer(hostPlayerId); // Only host at start
    adapter.setInputRecorder(recorder);

    // Run 50 ticks with just host
    for (let tick = 0; tick < 50; tick++) {
      const hostInput = createTestInput(true, false);
      adapter.step(new Map([[hostPlayerId, serializeInput(hostInput)]]));
    }

    // Guest joins at tick 50
    recorder.addPlayer(guestPlayerId);

    // Run 50 more ticks with both players
    for (let tick = 50; tick < 100; tick++) {
      const { hostInput, guestInput } = generateInputsForTick(tick);
      adapter.step(
        new Map([
          [hostPlayerId, serializeInput(hostInput)],
          [guestPlayerId, serializeInput(guestInput)],
        ]),
      );
    }

    assert.strictEqual(recorder.getTickCount(), 100, 'Should have 100 ticks');

    const playerInputs = recorder.buildPlayerInputs();
    const hostPI = playerInputs.find((p) => p.playerId === hostPlayerId);
    const guestPI = playerInputs.find((p) => p.playerId === guestPlayerId);

    assert.strictEqual(hostPI.startTick, 0, 'Host should start at tick 0');
    assert.strictEqual(guestPI.startTick, 50, 'Guest should start at tick 50');
  });

  it('RLE compression is effective', () => {
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

    const recorder = new MultiplayerInputRecorder(seed, 'test-mission');
    recorder.addPlayer(hostPlayerId);
    recorder.addPlayer(guestPlayerId);
    adapter.setInputRecorder(recorder);

    // Run with repetitive input (good for compression)
    for (let tick = 0; tick < 1000; tick++) {
      // Mostly cruising (just accelerate)
      const hostInput = createTestInput(true, false);
      const guestInput = createTestInput(true, false);
      adapter.step(
        new Map([
          [hostPlayerId, serializeInput(hostInput)],
          [guestPlayerId, serializeInput(guestInput)],
        ]),
      );
    }

    const playerInputs = recorder.buildPlayerInputs();

    // With repetitive input, compression should be effective
    for (const pi of playerInputs) {
      if (pi.inputsCompressed) {
        // RLE should significantly reduce size for repetitive data
        const decompressed = decodeRLE(pi.inputs, true);
        assert.strictEqual(
          decompressed.length,
          1000,
          'Should decompress to 1000',
        );
        assert.ok(pi.inputs.length < 1000, 'Compressed size should be smaller');
      }
    }
  });
});
