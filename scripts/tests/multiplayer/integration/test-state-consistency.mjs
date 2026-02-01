/**
 * State Consistency Integration Tests
 *
 * Tests that state remains consistent across simulation copies.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getComponent } from '../../../../src/core/ecs.ts';
import { simulateSession } from './helpers.mjs';

// =============================================================================
// State Consistency Tests
// =============================================================================

describe('State Consistency', () => {
  it('entity state is consistent across all simulation copies', () => {
    const playerIds = ['host', 'guest'];

    // Create two identical simulations
    const run1 = simulateSession(42, playerIds, 500);
    const run2 = simulateSession(42, playerIds, 500);

    // Compare entity counts
    assert.strictEqual(
      run1.world.entities.size,
      run2.world.entities.size,
      'Entity counts should match',
    );

    // Compare specific entity states
    const entities1 = Array.from(run1.world.entities).sort((a, b) => a - b);
    const entities2 = Array.from(run2.world.entities).sort((a, b) => a - b);

    assert.deepStrictEqual(entities1, entities2, 'Entity IDs should match');

    // Compare component states for first few entities
    for (let i = 0; i < Math.min(5, entities1.length); i++) {
      const e1 = entities1[i];
      const e2 = entities2[i];

      const health1 = getComponent(run1.world, e1, 'health');
      const health2 = getComponent(run2.world, e2, 'health');

      if (health1 && health2) {
        assert.strictEqual(
          health1.current,
          health2.current,
          `Health should match for entity ${e1}`,
        );
      }

      const transform1 = getComponent(run1.world, e1, 'transform');
      const transform2 = getComponent(run2.world, e2, 'transform');

      if (transform1 && transform2) {
        assert.strictEqual(
          transform1.position.x,
          transform2.position.x,
          `Position X should match for entity ${e1}`,
        );
        assert.strictEqual(
          transform1.position.y,
          transform2.position.y,
          `Position Y should match for entity ${e1}`,
        );
        assert.strictEqual(
          transform1.position.z,
          transform2.position.z,
          `Position Z should match for entity ${e1}`,
        );
      }
    }
  });

  it('PRNG state is consistent after identical inputs', () => {
    const playerIds = ['host', 'guest'];

    const run1 = simulateSession(42, playerIds, 500);
    const run2 = simulateSession(42, playerIds, 500);

    assert.strictEqual(
      run1.world.prng.seed,
      run2.world.prng.seed,
      'PRNG state should match',
    );
  });

  it('game time advances consistently', () => {
    const playerIds = ['host', 'guest'];

    const run1 = simulateSession(42, playerIds, 600); // 10 seconds at 60Hz
    const run2 = simulateSession(42, playerIds, 600);

    assert.strictEqual(
      run1.world.systemState.gameTime,
      run2.world.systemState.gameTime,
      'Game time should match',
    );

    // Game time should be approximately 10 seconds
    const expectedTime = 600 / 60; // 10 seconds
    assert.ok(
      Math.abs(run1.world.systemState.gameTime - expectedTime) < 0.001,
      'Game time should be ~10 seconds',
    );
  });
});
