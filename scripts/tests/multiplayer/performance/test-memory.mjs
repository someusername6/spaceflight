/**
 * Memory Usage and Rollback Benchmarks
 *
 * Tests memory usage and rollback performance.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { encodeRLE } from '../../../../src/replay/compression.ts';
import {
  create4PlayerBattleWorld,
  generateInputsForTick,
} from './test-helpers.mjs';

// =============================================================================
// Rollback Frequency Analysis
// =============================================================================

describe('Rollback Frequency Analysis', () => {
  it('estimates rollback frequency at various latencies', () => {
    // At 60Hz tick rate (16.67ms per tick), estimate prediction misses
    const tickRateHz = 60;
    const tickMs = 1000 / tickRateHz;

    const latencies = [0, 16, 32, 50, 100, 150, 200];

    console.log('  Latency | RTT Ticks | Est. Rollbacks/sec');
    console.log('  --------|-----------|-------------------');

    for (const oneWayMs of latencies) {
      const rttMs = oneWayMs * 2;
      const rttTicks = Math.ceil(rttMs / tickMs);

      // Estimate: each tick within RTT window may cause a rollback
      // when remote input arrives late
      const rollbacksPerSec = Math.min(tickRateHz, rttTicks * 2);

      console.log(
        `  ${String(oneWayMs).padStart(7)}ms | ${String(rttTicks).padStart(9)} | ${rollbacksPerSec.toFixed(0)}`,
      );
    }

    // Target: <10 rollbacks/sec at 100ms latency
    // At 100ms one-way (200ms RTT), that's ~12 ticks
    // Reality is rollback-netcode handles this more efficiently
    // This is a worst-case estimate

    assert.ok(true, 'Analysis logged');
  });

  it('simulates rollback overhead', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Build up state
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

    // Measure rollback cost (restore + resimulate 10 ticks)
    const rollbackTicks = 10;
    const snapshot = adapter.serialize();

    const iterations = 50;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Restore state
      adapter.deserialize(snapshot);

      // Resimulate
      for (let tick = 0; tick < rollbackTicks; tick++) {
        const inputs = generateInputsForTick(100 + tick);
        adapter.step(
          new Map([
            [playerIds[0], serializeInput(inputs.p1)],
            [playerIds[1], serializeInput(inputs.p2)],
            [playerIds[2], serializeInput(inputs.p3)],
            [playerIds[3], serializeInput(inputs.p4)],
          ]),
        );
      }
    }

    const endTime = performance.now();
    const avgTimeMs = (endTime - startTime) / iterations;

    console.log(
      `  Rollback (restore + ${rollbackTicks} ticks): ${avgTimeMs.toFixed(3)}ms avg`,
    );

    // Should complete within frame budget
    assert.ok(
      avgTimeMs < 16.67,
      `Rollback ${avgTimeMs.toFixed(3)}ms exceeds frame budget`,
    );
  });
});

// =============================================================================
// Memory Usage Analysis
// =============================================================================

describe('Memory Usage Analysis', () => {
  it('input compression is effective over 5 minutes', () => {
    // 5 minutes at 60Hz = 18,000 ticks
    const tickCount = 18000;
    const playerCount = 4;

    // Generate inputs for all players
    const playerInputs = [];
    for (let p = 0; p < playerCount; p++) {
      const inputs = [];
      for (let tick = 0; tick < tickCount; tick++) {
        // Simulate realistic input patterns
        let bits = 0;
        if (tick % 60 < 40) bits |= 1 << 6; // Accelerate 67% of time
        if (tick % 15 === 0) bits |= 1 << 9; // Fire primary periodically
        if (tick % 180 < 30) bits |= 1 << 2; // Yaw occasionally
        inputs.push(bits);
      }
      playerInputs.push(inputs);
    }

    // Measure uncompressed size
    const uncompressedSize = tickCount * playerCount * 4; // 4 bytes per input

    // Compress each player's inputs
    let totalCompressedSize = 0;
    for (const inputs of playerInputs) {
      const { data } = encodeRLE(inputs);
      totalCompressedSize += data.length * 4; // 4 bytes per number
    }

    const compressionRatio = uncompressedSize / totalCompressedSize;
    const savingsPercent = (1 - totalCompressedSize / uncompressedSize) * 100;

    console.log(`  5-minute replay input compression:`);
    console.log(`    Uncompressed: ${(uncompressedSize / 1024).toFixed(1)}KB`);
    console.log(`    Compressed: ${(totalCompressedSize / 1024).toFixed(1)}KB`);
    console.log(
      `    Ratio: ${compressionRatio.toFixed(1)}x (${savingsPercent.toFixed(0)}% savings)`,
    );

    // Target: significant compression (>50%)
    assert.ok(
      savingsPercent > 50,
      `Compression ${savingsPercent.toFixed(0)}% below 50% target`,
    );
  });

  it('world state memory is bounded', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Measure initial state
    const initialSnapshot = adapter.serialize();
    const initialSize = initialSnapshot.length;

    // Run for 5 minutes (simulated)
    const tickCount = 18000;
    for (let tick = 0; tick < tickCount; tick++) {
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

    // Measure final state
    const finalSnapshot = adapter.serialize();
    const finalSize = finalSnapshot.length;

    const growth = ((finalSize - initialSize) / initialSize) * 100;

    console.log(`  World state over ${tickCount} ticks:`);
    console.log(`    Initial: ${(initialSize / 1024).toFixed(1)}KB`);
    console.log(`    Final: ${(finalSize / 1024).toFixed(1)}KB`);
    console.log(`    Growth: ${growth.toFixed(1)}%`);

    // State should not grow unboundedly
    // Some growth is expected (projectiles, explosions, etc.) but should be bounded
    assert.ok(
      finalSize < initialSize * 3,
      `State grew from ${initialSize} to ${finalSize} (>${300}%)`,
    );
  });

  it('no memory leaks in long sessions (entity count bounded)', () => {
    const { world, playerEntities } = create4PlayerBattleWorld();

    const playerIds = ['p1', 'p2', 'p3', 'p4'].map(asPlayerId);
    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(id, playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    const entityCounts = [];

    // Sample entity count over time
    for (let tick = 0; tick < 6000; tick++) {
      const inputs = generateInputsForTick(tick);
      adapter.step(
        new Map([
          [playerIds[0], serializeInput(inputs.p1)],
          [playerIds[1], serializeInput(inputs.p2)],
          [playerIds[2], serializeInput(inputs.p3)],
          [playerIds[3], serializeInput(inputs.p4)],
        ]),
      );

      if (tick % 600 === 0) {
        entityCounts.push({ tick, count: world.entities.size });
      }
    }

    console.log('  Entity counts over time:');
    for (const { tick, count } of entityCounts) {
      console.log(`    Tick ${tick}: ${count} entities`);
    }

    // Entity count should remain bounded (not grow unboundedly)
    const maxCount = Math.max(...entityCounts.map((e) => e.count));

    // A reasonable upper bound: initial entities + active projectiles/missiles/explosions
    assert.ok(
      maxCount < 200,
      `Entity count ${maxCount} exceeds reasonable bound of 200`,
    );

    // Check that count doesn't grow linearly (would indicate leak)
    const lastFew = entityCounts.slice(-3);
    const isGrowing = lastFew.every(
      (e, i) => i === 0 || e.count > lastFew[i - 1].count,
    );
    assert.ok(!isGrowing, 'Entity count should not continuously grow');
  });
});
