/**
 * Full Session Integration Tests
 *
 * Tests the complete rollback-netcode session integration including:
 * - Two sessions syncing over 1000 ticks via Session API
 * - Rollback triggered by late inputs
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createSession } from 'rollback-netcode';
import { SpaceflightGameAdapter } from '../../../../src/multiplayer/game-adapter.ts';
import {
  asPlayerId,
  createLocalTransportGroup,
  DESYNC_AUTHORITY,
  TOPOLOGY,
} from '../../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../../src/multiplayer/input-format.ts';
import { worldsEqual } from '../../../../src/serialization/index.ts';
import {
  createMultiplayerWorld,
  createTestInput,
  getTransport,
  tickAll,
} from './test-utils.mjs';

describe('Full Session Integration', () => {
  it('should sync two sessions over 1000 ticks via Session API', async () => {
    // Create two identical multiplayer worlds (same seed = same initial state)
    // world1 = host's simulation, world2 = guest's simulation
    const {
      world: world1,
      hostEntity: w1HostEntity,
      guestEntity: w1GuestEntity,
    } = createMultiplayerWorld(99999);
    const {
      world: world2,
      hostEntity: w2HostEntity,
      guestEntity: w2GuestEntity,
    } = createMultiplayerWorld(99999);

    // Create linked transports (no latency for this test)
    const transports = createLocalTransportGroup(['host', 'guest']);
    const hostTransport = getTransport(transports, 'host');
    const guestTransport = getTransport(transports, 'guest');

    // Create adapters - BOTH adapters map BOTH players
    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const hostAdapter = new SpaceflightGameAdapter(
      world1,
      new Map([
        [hostPlayerId, w1HostEntity],
        [guestPlayerId, w1GuestEntity],
      ]),
    );
    const guestAdapter = new SpaceflightGameAdapter(
      world2,
      new Map([
        [hostPlayerId, w2HostEntity],
        [guestPlayerId, w2GuestEntity],
      ]),
    );

    // Create sessions with Mesh topology for reliable sync
    // Use high maxSpeculationTicks to avoid blocking during fast test iteration
    const testConfig = {
      topology: TOPOLOGY.MESH,
      desyncAuthority: DESYNC_AUTHORITY.HOST,
      maxSpeculationTicks: 2000,
      snapshotHistorySize: 2000, // Must match maxSpeculationTicks
    };
    const hostSession = createSession({
      game: hostAdapter,
      transport: hostTransport,
      config: testConfig,
    });
    const guestSession = createSession({
      game: guestAdapter,
      transport: guestTransport,
      config: testConfig,
    });

    // Host creates room, guest joins
    await hostSession.createRoom();
    await guestSession.joinRoom(hostSession.roomId, 'host');
    tickAll(transports);

    // Start game
    hostSession.start();
    tickAll(transports);

    // Run 1000 ticks
    for (let tick = 0; tick < 1000; tick++) {
      // Generate deterministic inputs
      const hostInput = serializeInput(
        createTestInput(tick < 500, tick % 20 === 0),
      );
      const guestInput = serializeInput(
        createTestInput(tick >= 500, tick % 25 === 0),
      );

      hostSession.tick(hostInput);
      guestSession.tick(guestInput);

      // Exchange messages
      tickAll(transports);
    }

    // Allow final convergence - keep ticking until hashes match or timeout
    // Rollback netcode needs time for all inputs to propagate and rollbacks to complete
    const MAX_CONVERGENCE_TICKS = 200;
    const TICKS_PER_MESSAGE_ROUND = 5;

    let converged = false;
    const emptyInput = serializeInput(createTestInput());
    for (let i = 0; i < MAX_CONVERGENCE_TICKS && !converged; i++) {
      // Multiple message exchanges per tick to ensure full propagation
      for (let j = 0; j < TICKS_PER_MESSAGE_ROUND; j++) {
        tickAll(transports);
      }
      hostSession.tick(emptyInput);
      guestSession.tick(emptyInput);
      for (let j = 0; j < TICKS_PER_MESSAGE_ROUND; j++) {
        tickAll(transports);
      }

      if (hostAdapter.hash() === guestAdapter.hash()) {
        converged = true;
      }
    }

    // Verify convergence happened within timeout
    assert(
      converged,
      `Sessions should converge within ${MAX_CONVERGENCE_TICKS} extra ticks`,
    );

    // Verify worlds are in sync
    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'World hashes should match after 1000 ticks',
    );
    assert(
      worldsEqual(world1, world2),
      'Worlds should be equal after 1000 ticks',
    );

    // Cleanup
    hostSession.destroy();
    guestSession.destroy();
  });

  it('should trigger rollback when inputs arrive late (TickResult.rolledBack)', async () => {
    // Create two identical multiplayer worlds
    const {
      world: world1,
      hostEntity: w1HostEntity,
      guestEntity: w1GuestEntity,
    } = createMultiplayerWorld(77777);
    const {
      world: world2,
      hostEntity: w2HostEntity,
      guestEntity: w2GuestEntity,
    } = createMultiplayerWorld(77777);

    // Create transports WITH latency to trigger rollbacks
    const transports = createLocalTransportGroup(['host', 'guest'], {
      latency: 50, // 50ms latency
    });
    const hostTransport = getTransport(transports, 'host');
    const guestTransport = getTransport(transports, 'guest');

    // Create adapters with both players mapped
    const hostPlayerId = asPlayerId('host');
    const guestPlayerId = asPlayerId('guest');

    const hostAdapter = new SpaceflightGameAdapter(
      world1,
      new Map([
        [hostPlayerId, w1HostEntity],
        [guestPlayerId, w1GuestEntity],
      ]),
    );
    const guestAdapter = new SpaceflightGameAdapter(
      world2,
      new Map([
        [hostPlayerId, w2HostEntity],
        [guestPlayerId, w2GuestEntity],
      ]),
    );

    // Create sessions
    const hostSession = createSession({
      game: hostAdapter,
      transport: hostTransport,
    });
    const guestSession = createSession({
      game: guestAdapter,
      transport: guestTransport,
    });

    // Host creates room, guest joins
    await hostSession.createRoom();
    await guestSession.joinRoom(hostSession.roomId, 'host');

    // Use tick() with time to simulate latency
    guestTransport.tick(100);
    hostTransport.tick(100);

    // Start game
    hostSession.start();
    hostTransport.tick(100);

    // Run ticks with latency - should trigger rollbacks
    let rollbackOccurred = false;
    let rollbackCount = 0;

    for (let i = 0; i < 30; i++) {
      const hostInput = serializeInput(createTestInput(true, i % 5 === 0));
      const guestInput = serializeInput(createTestInput(false, i % 7 === 0));

      const hostResult = hostSession.tick(hostInput);
      const guestResult = guestSession.tick(guestInput);

      if (hostResult.rolledBack) {
        rollbackOccurred = true;
        rollbackCount++;
      }
      if (guestResult.rolledBack) {
        rollbackOccurred = true;
        rollbackCount++;
      }

      // Advance time to deliver messages with latency
      hostTransport.tick(20);
      guestTransport.tick(20);
    }

    assert.strictEqual(
      rollbackOccurred,
      true,
      'Rollback should have occurred due to latency',
    );
    assert(
      rollbackCount > 0,
      `Rollback count should be > 0, was ${rollbackCount}`,
    );

    // Eventually states should converge - deliver remaining messages
    hostTransport.tick(300);
    guestTransport.tick(300);

    // Run a few more ticks with no movement for final convergence
    for (let i = 0; i < 10; i++) {
      hostSession.tick(serializeInput(createTestInput()));
      guestSession.tick(serializeInput(createTestInput()));
      hostTransport.tick(100);
      guestTransport.tick(100);
    }

    assert.strictEqual(
      hostAdapter.hash(),
      guestAdapter.hash(),
      'States should eventually converge after rollbacks',
    );

    // Cleanup
    hostSession.destroy();
    guestSession.destroy();
  });
});
