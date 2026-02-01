/**
 * Tick Processing Performance Benchmarks
 *
 * Tests per-tick processing time and recording overhead.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { MultiplayerInputRecorder } from '../../../../src/replay/multiplayer-replay.ts';
import {
  create4PlayerBattleWorld,
  generateInputsForTick,
} from './test-helpers.mjs';

// =============================================================================
// Tick Processing Performance
// =============================================================================

describe('Tick Processing Performance', () => {
  it('single tick < 5ms for 4-player battle', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Warm up
    for (let tick = 0; tick < 100; tick++) {
      const inputs = generateInputsForTick(tick);
      adapter.step(
        new Map([
          [playerIds[0], serializeInput(inputs.p1)],
          [playerIds[1], serializeInput(inputs.p2)],
          [playerIds[2], serializeInput(inputs.p3)],
          [playerIds[3], serializeInput(inputs.p4)],
        ]),
      );
    }

    // Measure
    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const inputs = generateInputsForTick(100 + i);
      adapter.step(
        new Map([
          [playerIds[0], serializeInput(inputs.p1)],
          [playerIds[1], serializeInput(inputs.p2)],
          [playerIds[2], serializeInput(inputs.p3)],
          [playerIds[3], serializeInput(inputs.p4)],
        ]),
      );
    }

    const endTime = performance.now();
    const avgTimeMs = (endTime - startTime) / iterations;

    console.log(
      `  Single tick: ${avgTimeMs.toFixed(3)}ms avg (${iterations} iterations)`,
    );

    // Target: <5ms per tick (60fps budget is 16.67ms, leaves room for rendering)
    assert.ok(
      avgTimeMs < 5,
      `Tick ${avgTimeMs.toFixed(3)}ms exceeds 5ms target`,
    );
  });

  it('input recording overhead is minimal', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    // Without recording
    const adapterNoRecord = new SpaceflightGameAdapter(world, playerMap);

    const iterations = 1000;

    const startNoRecord = performance.now();
    for (let i = 0; i < iterations; i++) {
      const inputs = generateInputsForTick(i);
      adapterNoRecord.step(
        new Map([
          [playerIds[0], serializeInput(inputs.p1)],
          [playerIds[1], serializeInput(inputs.p2)],
          [playerIds[2], serializeInput(inputs.p3)],
          [playerIds[3], serializeInput(inputs.p4)],
        ]),
      );
    }
    const noRecordTime = performance.now() - startNoRecord;

    // With recording
    const { world: world2, playerEntities: playerEntities2 } =
      create4PlayerBattleWorld();
    const playerMap2 = new Map();
    playerIds.forEach((id, i) => {
      playerMap2.set(id, playerEntities2[i]);
    });

    const adapterWithRecord = new SpaceflightGameAdapter(world2, playerMap2);
    const recorder = new MultiplayerInputRecorder(42, 'test');
    for (const id of playerIds) {
      recorder.addPlayer(id);
    }
    adapterWithRecord.setInputRecorder(recorder);

    const startWithRecord = performance.now();
    for (let i = 0; i < iterations; i++) {
      const inputs = generateInputsForTick(i);
      adapterWithRecord.step(
        new Map([
          [playerIds[0], serializeInput(inputs.p1)],
          [playerIds[1], serializeInput(inputs.p2)],
          [playerIds[2], serializeInput(inputs.p3)],
          [playerIds[3], serializeInput(inputs.p4)],
        ]),
      );
    }
    const withRecordTime = performance.now() - startWithRecord;

    const overhead = ((withRecordTime - noRecordTime) / noRecordTime) * 100;

    console.log(`  Recording overhead:`);
    console.log(
      `    Without: ${(noRecordTime / iterations).toFixed(3)}ms/tick`,
    );
    console.log(`    With: ${(withRecordTime / iterations).toFixed(3)}ms/tick`);
    console.log(`    Overhead: ${overhead.toFixed(1)}%`);

    // Recording overhead should be minimal (<10%)
    assert.ok(
      overhead < 10,
      `Recording overhead ${overhead.toFixed(1)}% exceeds 10% target`,
    );
  });
});
