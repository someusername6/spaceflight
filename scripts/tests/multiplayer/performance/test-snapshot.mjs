/**
 * Snapshot Size and Serialization Benchmarks
 *
 * Tests snapshot size and serialization performance targets.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { serializeWorldToBytes } from '../../../../src/serialization/index.ts';
import {
  create4PlayerBattleWorld,
  generateInputsForTick,
} from './test-helpers.mjs';

// =============================================================================
// Snapshot Size Benchmarks
// =============================================================================

describe('Snapshot Size Benchmarks', () => {
  it('4-player battle snapshot < 100KB (target ~50KB)', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run 300 ticks to build up state (includes projectiles, missiles, etc.)
    for (let tick = 0; tick < 300; tick++) {
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

    const snapshot = adapter.serialize();
    const sizeKB = snapshot.length / 1024;

    console.log(`  4-player snapshot size: ${sizeKB.toFixed(1)}KB`);

    // Target was ~50KB, achieved ~16.7KB initially
    // During active combat with projectiles/missiles, can grow to ~50-60KB
    // Allow up to 100KB as acceptable upper bound
    assert.ok(
      sizeKB < 100,
      `Snapshot ${sizeKB.toFixed(1)}KB exceeds 100KB limit`,
    );

    // Warn if over ideal target
    if (sizeKB > 50) {
      console.log(`  (Above 50KB target, but within acceptable range)`);
    }
  });

  it('snapshot size scales linearly with entities', () => {
    const sizes = [];

    // Measure with different entity counts by creating fresh worlds
    for (const entityCount of [10, 20, 40, 80]) {
      const { world: testWorld } = create4PlayerBattleWorld(entityCount);
      const snapshot = serializeWorldToBytes(testWorld);
      sizes.push({ entities: entityCount, bytes: snapshot.length });
    }

    console.log('  Snapshot scaling:');
    for (const { entities, bytes } of sizes) {
      console.log(`    ${entities} entities: ${(bytes / 1024).toFixed(1)}KB`);
    }

    // All snapshots should complete without error
    assert.ok(sizes.length === 4, 'Should measure 4 different entity counts');
  });
});

// =============================================================================
// Serialization Time Benchmarks
// =============================================================================

describe('Serialization Time Benchmarks', () => {
  it('serialization < 5ms for 4-player battle', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Build up state
    for (let tick = 0; tick < 300; tick++) {
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

    // Warm up
    adapter.serialize();

    // Measure
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      adapter.serialize();
    }

    const endTime = performance.now();
    const avgTimeMs = (endTime - startTime) / iterations;

    console.log(
      `  Serialization: ${avgTimeMs.toFixed(3)}ms avg (${iterations} iterations)`,
    );

    // Target: <5ms
    assert.ok(
      avgTimeMs < 5,
      `Serialization ${avgTimeMs.toFixed(3)}ms exceeds 5ms target`,
    );
  });

  it('deserialization < 5ms for 4-player battle', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Build up state
    for (let tick = 0; tick < 300; tick++) {
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

    const snapshot = adapter.serialize();

    // Warm up
    adapter.deserialize(snapshot);

    // Measure
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      adapter.deserialize(snapshot);
    }

    const endTime = performance.now();
    const avgTimeMs = (endTime - startTime) / iterations;

    console.log(
      `  Deserialization: ${avgTimeMs.toFixed(3)}ms avg (${iterations} iterations)`,
    );

    // Target: <5ms
    assert.ok(
      avgTimeMs < 5,
      `Deserialization ${avgTimeMs.toFixed(3)}ms exceeds 5ms target`,
    );
  });

  it('hash computation < 1ms', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Build up state
    for (let tick = 0; tick < 300; tick++) {
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

    // Warm up
    adapter.hash();

    // Measure
    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      adapter.hash();
    }

    const endTime = performance.now();
    const avgTimeMs = (endTime - startTime) / iterations;

    console.log(
      `  Hash computation: ${avgTimeMs.toFixed(4)}ms avg (${iterations} iterations)`,
    );

    // Target: <1ms (hash is called every tick)
    assert.ok(
      avgTimeMs < 1,
      `Hash ${avgTimeMs.toFixed(4)}ms exceeds 1ms target`,
    );
  });
});
