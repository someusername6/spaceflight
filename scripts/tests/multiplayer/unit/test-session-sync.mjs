/**
 * Session Synchronization Tests
 *
 * Tests that two sessions stay in sync with identical inputs,
 * and that rollback/resimulation works correctly.
 */

// Import mocks first - sets up globalThis.__APP_VERSION__ before other imports
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import {
  asPlayerId,
  createLocalTransportGroup,
} from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import {
  computeWorldHash,
  worldsEqual,
} from '../../../../src/serialization/index.ts';
import { createTestInput, createTestWorld } from './test-utils.mjs';

describe('Two Session Synchronization', () => {
  it('should keep two sessions in sync with identical inputs', async () => {
    // Create two worlds with same seed
    const { world: world1, playerEntity: entity1 } = createTestWorld(42);
    const { world: world2, playerEntity: entity2 } = createTestWorld(42);

    // Create linked transports
    const transports = createLocalTransportGroup(['host', 'guest']);
    const hostTransport = transports.get('host');
    const guestTransport = transports.get('guest');

    // Create player maps
    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');
    const hostMap = new Map([[hostPlayerId, entity1]]);
    const guestMap = new Map([[guestPlayerId, entity2]]);

    // Create adapters
    const adapter1 = new SpaceflightGameAdapter(world1, hostMap);
    const adapter2 = new SpaceflightGameAdapter(world2, guestMap);

    // Verify initial states match
    assert.strictEqual(
      adapter1.hash(),
      adapter2.hash(),
      'Initial hashes should match',
    );

    // Run 100 ticks with identical inputs
    for (let tick = 0; tick < 100; tick++) {
      const input = serializeInput(createTestInput(tick < 60, tick % 10 === 0));

      // Both adapters process the same inputs
      const inputs1 = new Map([[hostPlayerId, input]]);
      const inputs2 = new Map([[guestPlayerId, input]]);

      adapter1.step(inputs1);
      adapter2.step(inputs2);

      // Verify hashes match after each tick
      const hash1 = adapter1.hash();
      const hash2 = adapter2.hash();

      assert.strictEqual(hash1, hash2, `Hashes should match at tick ${tick}`);
    }

    // Verify worlds are truly equal
    assert(worldsEqual(world1, world2), 'Worlds should be equal after sync');

    // Cleanup
    hostTransport.disconnectAll();
    guestTransport.disconnectAll();
  });

  it('should detect desync when states diverge', () => {
    const { world: world1 } = createTestWorld(42);
    const { world: world2 } = createTestWorld(42);

    // Verify initial match
    const hash1 = computeWorldHash(world1);
    const hash2 = computeWorldHash(world2);
    assert.strictEqual(hash1, hash2, 'Initial hashes should match');

    // Intentionally modify one world
    world2.systemState.gameTime = 999;

    // Verify desync detected
    const newHash2 = computeWorldHash(world2);
    assert.notStrictEqual(
      hash1,
      newHash2,
      'Hashes should differ after modification',
    );
  });

  it('should restore state from snapshot after divergence', () => {
    const { world, playerEntity } = createTestWorld(42);
    const playerId = asPlayerId('player-1');
    const playerMap = new Map([[playerId, playerEntity]]);

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Take snapshot of initial state
    const snapshot = adapter.serialize();
    const initialHash = adapter.hash();

    // Run some ticks to diverge
    for (let i = 0; i < 10; i++) {
      const input = serializeInput(createTestInput(true, true));
      adapter.step(new Map([[playerId, input]]));
    }

    // Verify state changed
    const divergedHash = adapter.hash();
    assert.notStrictEqual(
      divergedHash,
      initialHash,
      'State should have changed',
    );

    // Restore from snapshot
    adapter.deserialize(snapshot);

    // Verify state restored
    assert.strictEqual(adapter.hash(), initialHash, 'State should be restored');
  });
});

describe('Rollback Simulation', () => {
  it('should resimulate correctly after rollback', () => {
    const { world, playerEntity } = createTestWorld(42);
    const playerId = asPlayerId('player-1');
    const playerMap = new Map([[playerId, playerEntity]]);

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run 10 ticks and save state at tick 5
    let snapshotAtTick5;
    let hashAtTick5;

    for (let tick = 0; tick < 10; tick++) {
      const input = serializeInput(createTestInput(tick < 5, false));
      adapter.step(new Map([[playerId, input]]));

      if (tick === 4) {
        snapshotAtTick5 = adapter.serialize();
        hashAtTick5 = adapter.hash();
      }
    }

    const finalHash = adapter.hash();
    assert.notStrictEqual(finalHash, hashAtTick5, 'State should have changed');

    // Rollback to tick 5
    adapter.deserialize(snapshotAtTick5);
    assert.strictEqual(adapter.hash(), hashAtTick5, 'Restored to tick 5');

    // Resimulate with same inputs (ticks 5-9 with no accelerate)
    for (let tick = 5; tick < 10; tick++) {
      const input = serializeInput(createTestInput(tick < 5, false));
      adapter.step(new Map([[playerId, input]]));
    }

    // Should reach same final state
    assert.strictEqual(
      adapter.hash(),
      finalHash,
      'Resimulated state should match',
    );
  });

  it('should reach different state with different inputs after rollback', () => {
    const { world, playerEntity } = createTestWorld(42);
    const playerId = asPlayerId('player-1');
    const playerMap = new Map([[playerId, playerEntity]]);

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run 10 ticks
    let snapshotAtTick5;

    for (let tick = 0; tick < 10; tick++) {
      const input = serializeInput(createTestInput(true, false));
      adapter.step(new Map([[playerId, input]]));

      if (tick === 4) {
        snapshotAtTick5 = adapter.serialize();
      }
    }

    const finalHashWithAccelerate = adapter.hash();

    // Rollback to tick 5
    adapter.deserialize(snapshotAtTick5);

    // Resimulate with DIFFERENT inputs (no accelerate)
    for (let tick = 5; tick < 10; tick++) {
      const input = serializeInput(createTestInput(false, false));
      adapter.step(new Map([[playerId, input]]));
    }

    const finalHashWithoutAccelerate = adapter.hash();

    // States should differ because inputs were different
    assert.notStrictEqual(
      finalHashWithAccelerate,
      finalHashWithoutAccelerate,
      'Different inputs should lead to different states',
    );
  });
});

describe('Extended Session', () => {
  it('should maintain determinism over 1000 ticks', () => {
    // Create two identical worlds
    const { world: world1, playerEntity: entity1 } = createTestWorld(12345);
    const { world: world2, playerEntity: entity2 } = createTestWorld(12345);

    const playerId = asPlayerId('player-1');
    const adapter1 = new SpaceflightGameAdapter(
      world1,
      new Map([[playerId, entity1]]),
    );
    const adapter2 = new SpaceflightGameAdapter(
      world2,
      new Map([[playerId, entity2]]),
    );

    // Run 1000 ticks with varying inputs
    for (let tick = 0; tick < 1000; tick++) {
      // Generate deterministic but varied input pattern
      const accelerate = tick < 600;
      const fire = tick % 15 === 0;
      const input = serializeInput(createTestInput(accelerate, fire));

      adapter1.step(new Map([[playerId, input]]));
      adapter2.step(new Map([[playerId, input]]));

      // Periodically verify sync
      if (tick % 100 === 0) {
        assert.strictEqual(
          adapter1.hash(),
          adapter2.hash(),
          `Hashes should match at tick ${tick}`,
        );
      }
    }

    // Final verification
    assert.strictEqual(
      adapter1.hash(),
      adapter2.hash(),
      'Final hashes should match',
    );

    assert(
      worldsEqual(world1, world2),
      'Worlds should be equal after 1000 ticks',
    );
  });
});
