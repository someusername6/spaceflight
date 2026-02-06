/**
 * Full Session Flow Integration Tests
 *
 * Tests complete 4-player session flows.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { worldHashesMatch } from '../../../../src/serialization/index.ts';
import { simulateSession } from './helpers.mjs';

// =============================================================================
// Full Session Flow Tests
// =============================================================================

describe('Full 4-Player Session Flow', () => {
  it('runs 1000 ticks with 4 players in sync', () => {
    const playerIds = ['player-1', 'player-2', 'player-3', 'player-4'];

    // Run simulation twice with same seed
    const run1 = simulateSession(42, playerIds, 1000);
    const run2 = simulateSession(42, playerIds, 1000);

    // Verify all hash checkpoints match
    assert.strictEqual(
      run1.hashes.length,
      run2.hashes.length,
      'Should have same checkpoints',
    );

    for (let i = 0; i < run1.hashes.length; i++) {
      assert.strictEqual(
        run1.hashes[i].hash,
        run2.hashes[i].hash,
        `Hash mismatch at tick ${run1.hashes[i].tick}`,
      );
    }

    // Final states should be equal
    assert(
      worldHashesMatch(run1.world, run2.world),
      'Final worlds should be equal',
    );
  });

  it('records inputs for all 4 players', () => {
    const playerIds = ['player-1', 'player-2', 'player-3', 'player-4'];
    const run = simulateSession(42, playerIds, 500, { record: true });

    assert.ok(run.recorder, 'Recorder should exist');
    assert.strictEqual(
      run.recorder.getTickCount(),
      500,
      'Should have 500 ticks',
    );

    const playerInputs = run.recorder.buildPlayerInputs();
    assert.strictEqual(
      playerInputs.length,
      4,
      'Should have inputs for 4 players',
    );

    for (const pi of playerInputs) {
      assert.ok(pi.inputs.length > 0, `${pi.playerId} should have inputs`);
    }
  });

  it('handles different player counts correctly', () => {
    // Test with 2, 3, and 4 players
    for (const playerCount of [2, 3, 4]) {
      const playerIds = Array.from(
        { length: playerCount },
        (_, i) => `player-${i + 1}`,
      );

      const run1 = simulateSession(42, playerIds, 300);
      const run2 = simulateSession(42, playerIds, 300);

      assert.strictEqual(
        run1.finalHash,
        run2.finalHash,
        `${playerCount}-player sessions should be deterministic`,
      );
    }
  });

  it('completes session flow: ready -> launch -> play -> end', () => {
    const playerIds = ['host', 'guest-1', 'guest-2', 'guest-3'];

    // Phase 1: Ready phase (simulated)
    const readyStates = new Map(playerIds.map((id) => [id, false]));

    // All players ready up
    for (const id of playerIds) {
      readyStates.set(id, true);
    }
    assert.ok(
      Array.from(readyStates.values()).every((r) => r),
      'All players should be ready',
    );

    // Phase 2: Launch mission
    const run = simulateSession(42, playerIds, 1000, { record: true });

    // Phase 3: Mission ends (1000 ticks complete)
    assert.ok(run.finalHash !== 0, 'Should have valid final state');

    // Phase 4: Results available
    const playerInputs = run.recorder.buildPlayerInputs();
    assert.strictEqual(playerInputs.length, 4, 'All player inputs recorded');

    // All players should have input data
    for (const pi of playerInputs) {
      assert.ok(pi.inputs.length > 0, 'Each player should have inputs');
    }
  });
});
