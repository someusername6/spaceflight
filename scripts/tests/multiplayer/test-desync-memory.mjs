/**
 * Desync Detection and Memory Stability Tests
 *
 * Tests:
 * - Desync event emission when states diverge
 * - Memory stability over extended runs
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createSession } from 'rollback-netcode';
import { SpaceflightGameAdapter } from '../../../src/multiplayer/game-adapter.ts';
import {
  asPlayerId,
  createLocalTransportGroup,
  DESYNC_AUTHORITY,
  TOPOLOGY,
} from '../../../src/multiplayer/index.ts';
import { serializeInput } from '../../../src/multiplayer/input-format.ts';
import {
  createMultiplayerWorld,
  createTestInput,
  createTestWorld,
  getTransport,
  tickAll,
} from './multiplayer-test-utils.mjs';

describe('Desync Detection', () => {
  it('should emit desync event when states diverge', async () => {
    // Create two identical multiplayer worlds
    const {
      world: world1,
      hostEntity: w1HostEntity,
      guestEntity: w1GuestEntity,
    } = createMultiplayerWorld(11111);
    const {
      world: world2,
      hostEntity: w2HostEntity,
      guestEntity: w2GuestEntity,
    } = createMultiplayerWorld(11111);

    // Create transports
    const transports = createLocalTransportGroup(['host', 'guest']);
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

    // Create sessions with frequent hash checking
    // Use Mesh topology + Host desyncAuthority for reliable desync detection
    // (default is Star + Peer which has different timing behavior)
    const hostSession = createSession({
      game: hostAdapter,
      transport: hostTransport,
      config: {
        hashInterval: 5,
        topology: TOPOLOGY.MESH,
        desyncAuthority: DESYNC_AUTHORITY.HOST,
      },
    });
    const guestSession = createSession({
      game: guestAdapter,
      transport: guestTransport,
      config: {
        hashInterval: 5,
        topology: TOPOLOGY.MESH,
        desyncAuthority: DESYNC_AUTHORITY.HOST,
      },
    });

    // Track desync events
    let desyncDetected = false;
    let desyncTick = -1;

    hostSession.on('desync', (tick) => {
      desyncDetected = true;
      desyncTick = tick;
    });

    guestSession.on('desync', (tick) => {
      desyncDetected = true;
      desyncTick = tick;
    });

    // Host creates room, guest joins
    await hostSession.createRoom();
    await guestSession.joinRoom(hostSession.roomId, 'host');
    tickAll(transports);

    // Start game
    hostSession.start();
    tickAll(transports);

    // Run a few ticks normally
    for (let i = 0; i < 5; i++) {
      hostSession.tick(serializeInput(createTestInput(true, false)));
      guestSession.tick(serializeInput(createTestInput(false, true)));
      tickAll(transports);
    }

    // Intentionally corrupt guest's world state to cause desync
    // Corrupt transform component (contains position) for a persistent hash mismatch
    const hostComponents = world2.components.get(w2HostEntity);
    assert.ok(hostComponents, 'Host entity should have components');
    const transform = hostComponents.get('transform');
    assert.ok(transform, 'Host entity should have transform component');
    transform.position.x = 999999;
    transform.position.y = 888888;
    transform.position.z = 777777;

    // Continue ticking - desync should be detected
    for (let i = 0; i < 15; i++) {
      hostSession.tick(serializeInput(createTestInput(true, false)));
      guestSession.tick(serializeInput(createTestInput(false, true)));
      tickAll(transports);

      if (desyncDetected) break;
    }

    assert.strictEqual(
      desyncDetected,
      true,
      'Desync should have been detected after state corruption',
    );
    assert(desyncTick >= 0, `Desync tick should be valid, was ${desyncTick}`);

    // Cleanup
    hostSession.destroy();
    guestSession.destroy();
  });
});

describe('Memory Stability', () => {
  it('should not leak memory over 10000 ticks', async () => {
    // Skip if gc is not exposed
    if (typeof global.gc !== 'function') {
      console.log('  (skipping memory test - run with --expose-gc)');
      return;
    }

    const { world, playerEntity } = createTestWorld(54321);
    const playerId = asPlayerId('player-1');
    const adapter = new SpaceflightGameAdapter(
      world,
      new Map([[playerId, playerEntity]]),
    );

    // Force initial GC and measure baseline
    global.gc();
    const initialHeap = process.memoryUsage().heapUsed;

    // Run 10000 ticks
    for (let tick = 0; tick < 10000; tick++) {
      const input = serializeInput(
        createTestInput(tick % 2 === 0, tick % 10 === 0),
      );
      adapter.step(new Map([[playerId, input]]));

      // Periodically check for excessive growth
      if (tick % 2000 === 1999) {
        global.gc();
        const currentHeap = process.memoryUsage().heapUsed;
        const growth = currentHeap - initialHeap;
        const growthMB = growth / (1024 * 1024);

        // Allow up to 50MB growth (generous, mainly checking for leaks)
        assert(
          growthMB < 50,
          `Memory grew by ${growthMB.toFixed(2)}MB at tick ${tick}, potential leak`,
        );
      }
    }

    // Final memory check
    global.gc();
    const finalHeap = process.memoryUsage().heapUsed;
    const totalGrowth = (finalHeap - initialHeap) / (1024 * 1024);

    console.log(
      `  Memory growth over 10000 ticks: ${totalGrowth.toFixed(2)}MB`,
    );

    // Should not grow excessively
    assert(
      totalGrowth < 100,
      `Total memory growth ${totalGrowth.toFixed(2)}MB exceeds 100MB threshold`,
    );
  });
});
