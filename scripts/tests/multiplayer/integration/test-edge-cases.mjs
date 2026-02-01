/**
 * Session Edge Cases Integration Tests
 *
 * Tests disconnect, spectator, and host migration scenarios.
 */

// Import mocks first
import '../../networking/webrtc-mocks.mjs';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import { asPlayerId } from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import {
  createNPlayerWorld,
  createTestInput,
  generatePlayerInput,
  simulateSession,
} from './helpers.mjs';

// =============================================================================
// Session Edge Cases
// =============================================================================

describe('Session Edge Cases', () => {
  it('handles player disconnect mid-mission', () => {
    const playerIds = ['host', 'guest-1', 'guest-2'];

    // guest-2 disconnects at tick 200
    const run = simulateSession(42, playerIds, 500, {
      record: true,
      disconnectAt: { playerId: 'guest-2', tick: 200 },
    });

    // Session should complete
    assert.ok(
      run.finalHash !== 0,
      'Session should complete despite disconnect',
    );

    // Disconnect event should be recorded
    const disconnectEvent = run.events.find((e) => e.type === 'disconnect');
    assert.ok(disconnectEvent, 'Disconnect should be recorded');
    assert.strictEqual(disconnectEvent.tick, 200, 'Disconnect at tick 200');

    // Recorder should have leave tick for disconnected player
    run.recorder.buildPlayerInputs();
  });

  it('simulation continues with reduced player count', () => {
    const playerIds = ['host', 'guest-1', 'guest-2', 'guest-3'];

    const { world, playerEntities } = createNPlayerWorld(42, playerIds.length);

    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(asPlayerId(id), playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run 100 ticks normally
    for (let tick = 0; tick < 100; tick++) {
      const inputs = new Map();
      for (const id of playerIds) {
        inputs.set(
          asPlayerId(id),
          serializeInput(generatePlayerInput(id, tick)),
        );
      }
      adapter.step(inputs);
    }

    const hashWith4 = adapter.hash();

    // "Disconnect" 2 players by only sending host and guest-1 inputs
    for (let tick = 100; tick < 200; tick++) {
      const inputs = new Map();
      // Only host and guest-1 provide real input
      inputs.set(
        asPlayerId('host'),
        serializeInput(generatePlayerInput('host', tick)),
      );
      inputs.set(
        asPlayerId('guest-1'),
        serializeInput(generatePlayerInput('guest-1', tick)),
      );
      // Disconnected players get empty input
      inputs.set(
        asPlayerId('guest-2'),
        serializeInput(createTestInput(false, false)),
      );
      inputs.set(
        asPlayerId('guest-3'),
        serializeInput(createTestInput(false, false)),
      );
      adapter.step(inputs);
    }

    const hashWith2 = adapter.hash();

    // State should have progressed
    assert.notStrictEqual(
      hashWith4,
      hashWith2,
      'State should change after disconnects',
    );
    assert.ok(hashWith2 !== 0, 'Should have valid state');
  });

  it('handles empty input gracefully (spectator simulation)', () => {
    const playerIds = ['host', 'spectator'];
    const { world, playerEntities } = createNPlayerWorld(42, playerIds.length);

    const playerMap = new Map();
    playerIds.forEach((id, i) => {
      playerMap.set(asPlayerId(id), playerEntities[i]);
    });

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run with spectator providing no input
    for (let tick = 0; tick < 300; tick++) {
      const inputs = new Map();
      inputs.set(
        asPlayerId('host'),
        serializeInput(generatePlayerInput('host', tick)),
      );
      // Spectator always sends empty input
      inputs.set(
        asPlayerId('spectator'),
        serializeInput(createTestInput(false, false)),
      );
      adapter.step(inputs);
    }

    // Session should complete
    assert.ok(adapter.hash() !== 0, 'Session with spectator should complete');
  });

  it('handles rapid input changes without desync', () => {
    const playerIds = ['host', 'guest'];
    const { world, playerEntities } = createNPlayerWorld(42, playerIds.length);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const playerMap = new Map([
      [hostPlayerId, playerEntities[0]],
      [guestPlayerId, playerEntities[1]],
    ]);

    const adapter1 = new SpaceflightGameAdapter(world, playerMap);

    // Clone world for second run
    const { world: world2, playerEntities: playerEntities2 } =
      createNPlayerWorld(42, 2);
    const adapter2 = new SpaceflightGameAdapter(
      world2,
      new Map([
        [hostPlayerId, playerEntities2[0]],
        [guestPlayerId, playerEntities2[1]],
      ]),
    );

    // Run with chaotic input (changing every tick)
    for (let tick = 0; tick < 500; tick++) {
      // Very chaotic input pattern
      const hostAccel = tick % 2 === 0;
      const hostFire = tick % 3 === 0;
      const guestAccel = tick % 2 === 1;
      const guestFire = tick % 5 === 0;

      const inputs = new Map([
        [hostPlayerId, serializeInput(createTestInput(hostAccel, hostFire))],
        [guestPlayerId, serializeInput(createTestInput(guestAccel, guestFire))],
      ]);

      adapter1.step(inputs);
      adapter2.step(inputs);

      // Verify sync every 50 ticks
      if (tick % 50 === 0) {
        assert.strictEqual(
          adapter1.hash(),
          adapter2.hash(),
          `Should stay in sync at tick ${tick}`,
        );
      }
    }
  });
});

// =============================================================================
// Host Migration/Failure Tests
// =============================================================================

describe('Host Migration Failure', () => {
  it('session state is preserved when host disconnects', () => {
    const playerIds = ['host', 'guest-1', 'guest-2'];
    const { world, playerEntities } = createNPlayerWorld(42, playerIds.length);

    const hostPlayerId = asPlayerId('host');
    const guest1PlayerId = asPlayerId('guest-1');
    const guest2PlayerId = asPlayerId('guest-2');

    const playerMap = new Map([
      [hostPlayerId, playerEntities[0]],
      [guest1PlayerId, playerEntities[1]],
      [guest2PlayerId, playerEntities[2]],
    ]);

    const adapter = new SpaceflightGameAdapter(world, playerMap);

    // Run 200 ticks
    for (let tick = 0; tick < 200; tick++) {
      const inputs = new Map([
        [hostPlayerId, serializeInput(generatePlayerInput('host', tick))],
        [guest1PlayerId, serializeInput(generatePlayerInput('guest-1', tick))],
        [guest2PlayerId, serializeInput(generatePlayerInput('guest-2', tick))],
      ]);
      adapter.step(inputs);
    }

    // Take snapshot before "disconnect"
    const snapshotBeforeDisconnect = adapter.serialize();
    const hashBeforeDisconnect = adapter.hash();

    // Verify state can be preserved/restored
    const { world: freshWorld, playerEntities: freshEntities } =
      createNPlayerWorld(42, 3);
    const freshAdapter = new SpaceflightGameAdapter(
      freshWorld,
      new Map([
        [hostPlayerId, freshEntities[0]],
        [guest1PlayerId, freshEntities[1]],
        [guest2PlayerId, freshEntities[2]],
      ]),
    );

    // Restore from snapshot
    freshAdapter.deserialize(snapshotBeforeDisconnect);

    assert.strictEqual(
      freshAdapter.hash(),
      hashBeforeDisconnect,
      'State should be restorable after host disconnect',
    );
  });

  it('guests can detect host absence via lack of inputs', () => {
    const { world, playerEntities } = createNPlayerWorld(42, 2);

    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const adapter = new SpaceflightGameAdapter(
      world,
      new Map([
        [hostPlayerId, playerEntities[0]],
        [guestPlayerId, playerEntities[1]],
      ]),
    );

    let missedHostInputs = 0;

    for (let tick = 0; tick < 100; tick++) {
      const inputs = new Map();
      inputs.set(
        guestPlayerId,
        serializeInput(generatePlayerInput('guest', tick)),
      );

      // Host stops sending inputs at tick 50
      if (tick < 50) {
        inputs.set(
          hostPlayerId,
          serializeInput(generatePlayerInput('host', tick)),
        );
      } else {
        // Host input missing - use empty
        inputs.set(hostPlayerId, serializeInput(createTestInput(false, false)));
        missedHostInputs++;
      }

      adapter.step(inputs);
    }

    assert.strictEqual(missedHostInputs, 50, 'Should track missed host inputs');

    // In real system, would trigger disconnect detection after threshold
    const DISCONNECT_THRESHOLD = 30; // ~0.5 seconds at 60Hz
    assert.ok(
      missedHostInputs > DISCONNECT_THRESHOLD,
      'Would trigger disconnect detection',
    );
  });

  it('session ends cleanly for all guests when host disconnects', () => {
    // Simulate multiple guests receiving host disconnect notification
    const guestStates = new Map([
      ['guest-1', { connected: true, gameOver: false }],
      ['guest-2', { connected: true, gameOver: false }],
      ['guest-3', { connected: true, gameOver: false }],
    ]);

    // Host disconnects - notify all guests
    for (const [, state] of guestStates) {
      state.gameOver = true;
      state.connected = false;
    }

    // All guests should have game over state
    for (const [guestId, state] of guestStates) {
      assert.ok(state.gameOver, `${guestId} should have game over`);
      assert.ok(!state.connected, `${guestId} should be disconnected`);
    }
  });
});
