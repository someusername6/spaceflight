/**
 * Tests for multiplayer replay playback.
 *
 * Verifies that:
 * 1. InputPlayer instances provide correct random access during seek
 * 2. Seeking resets world and tick but reuses InputPlayer correctly
 * 3. Input streams with different start ticks work correctly after seek
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { createWorld } from '../../../../src/core/ecs.ts';
import { createPlayerShip } from '../../../../src/factories/ship.ts';
import { InputPlayer } from '../../../../src/input/input-recorder.ts';
import { MultiplayerReplayPlayback } from '../../../../src/replay/multiplayer-replay-playback.ts';

// =============================================================================
// InputPlayer Random Access Tests
// =============================================================================

describe('InputPlayer Random Access', () => {
  it('provides correct input for any tick without internal state', () => {
    // Create an InputPlayer with known inputs
    const inputs = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
    const player = new InputPlayer(inputs);

    // Access ticks in random order - should work correctly
    assert.strictEqual(player.getRawInputForTick(5), 32);
    assert.strictEqual(player.getRawInputForTick(0), 1);
    assert.strictEqual(player.getRawInputForTick(9), 512);
    assert.strictEqual(player.getRawInputForTick(3), 8);

    // Access same tick multiple times
    assert.strictEqual(player.getRawInputForTick(5), 32);
    assert.strictEqual(player.getRawInputForTick(5), 32);

    // Access in reverse order
    for (let i = 9; i >= 0; i--) {
      assert.strictEqual(player.getRawInputForTick(i), 1 << i);
    }
  });

  it('returns 0 for out-of-range ticks', () => {
    const inputs = [1, 2, 3, 4, 5];
    const player = new InputPlayer(inputs);

    assert.strictEqual(player.getRawInputForTick(-1), 0);
    assert.strictEqual(player.getRawInputForTick(-100), 0);
    assert.strictEqual(player.getRawInputForTick(5), 0);
    assert.strictEqual(player.getRawInputForTick(100), 0);
  });

  it('handles empty input array', () => {
    const player = new InputPlayer([]);

    assert.strictEqual(player.getRawInputForTick(0), 0);
    assert.strictEqual(player.getTickCount(), 0);
  });
});

// =============================================================================
// Multiplayer Replay Seek Tests
// =============================================================================

describe('Multiplayer Replay Playback Seeking', () => {
  /**
   * Create a mock multiplayer replay data structure.
   */
  function createMockReplay(playerConfigs) {
    const players = playerConfigs.map((config, i) => ({
      playerId: config.playerId,
      callsign: config.callsign || `Player ${i + 1}`,
      shipEntityId: i + 1,
      campaignShipId: `ship-${i + 1}`,
      joinTick: config.startTick || 0,
      leaveTick: config.leaveTick ?? null,
    }));

    const playerInputs = playerConfigs.map((config) => ({
      playerId: config.playerId,
      inputs: config.inputs,
      inputsCompressed: false,
      startTick: config.startTick || 0,
    }));

    return {
      isMultiplayer: true,
      version: 4,
      seed: 42,
      tickCount: Math.max(...playerConfigs.map((c) => c.inputs.length)),
      players,
      playerInputs,
      hostPlayerId: playerConfigs[0].playerId,
      wingmen: [],
      playerAutoaim: 0,
      metadata: {
        missionId: 'test',
        missionName: 'Test Mission',
        sector: 1,
        shipType: 'fighter',
        outcome: 'victory',
        durationTicks: 100,
        recordedAt: Date.now(),
        gameVersion: '1.0.0',
        stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
      },
      playerLoadout: {
        shipClass: 'fighter',
        primaryWeapons: [],
        secondaryWeapons: [],
      },
    };
  }

  /**
   * Create a real world with player ships for testing.
   */
  function createTestWorld(playerIds) {
    const world = createWorld(42);
    const entityMap = new Map();

    for (let i = 0; i < playerIds.length; i++) {
      const pos = new Vector3(i * 100, 0, 0);
      const entity = createPlayerShip(world, 'fighter', pos, new Quaternion());
      entityMap.set(playerIds[i], entity);
    }

    return { world, entityMap };
  }

  it('correctly applies inputs after seeking backwards', () => {
    const replay = createMockReplay([
      {
        playerId: 'host',
        callsign: 'Host',
        inputs: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
      },
    ]);

    let worldCount = 0;
    let currentEntityMap = new Map();

    const setupWorld = () => {
      worldCount++;
      const { world, entityMap } = createTestWorld(['host']);
      currentEntityMap = entityMap;
      return world;
    };

    const getPlayerEntity = (_world, playerId) =>
      currentEntityMap.get(playerId) ?? null;

    const playback = new MultiplayerReplayPlayback(
      replay,
      setupWorld,
      getPlayerEntity,
    );

    assert.strictEqual(worldCount, 1);

    // Advance to tick 5
    for (let i = 0; i < 5; i++) {
      playback.tick();
    }
    assert.strictEqual(playback.getCurrentTick(), 5);

    // Seek back to tick 2
    playback.seekTo(2);

    // World should be recreated
    assert.strictEqual(worldCount, 2);
    assert.strictEqual(playback.getCurrentTick(), 0);

    // Process seek
    while (playback.processSeek(100)) {}

    assert.strictEqual(playback.getCurrentTick(), 2);
  });

  it('correctly handles players with different start ticks after seek', () => {
    const replay = createMockReplay([
      {
        playerId: 'host',
        callsign: 'Host',
        inputs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        startTick: 0,
      },
      {
        playerId: 'guest',
        callsign: 'Guest',
        inputs: [100, 200, 300, 400, 500],
        startTick: 5,
      },
    ]);

    let worldCount = 0;
    let currentEntityMap = new Map();

    const setupWorld = () => {
      worldCount++;
      const { world, entityMap } = createTestWorld(['host', 'guest']);
      currentEntityMap = entityMap;
      return world;
    };

    const getPlayerEntity = (_world, playerId) =>
      currentEntityMap.get(playerId) ?? null;

    const playback = new MultiplayerReplayPlayback(
      replay,
      setupWorld,
      getPlayerEntity,
    );

    // Advance to tick 8
    for (let i = 0; i < 8; i++) {
      playback.tick();
    }
    assert.strictEqual(playback.getCurrentTick(), 8);

    // Seek back to tick 3 (before guest joined)
    playback.seekTo(3);
    assert.strictEqual(worldCount, 2);

    while (playback.processSeek(100)) {}

    assert.strictEqual(playback.getCurrentTick(), 3);

    // Verify guest is not active at tick 3
    assert.strictEqual(playback.isPlayerActive('host'), true);
    assert.strictEqual(playback.isPlayerActive('guest'), false);

    // Continue to tick 6 and verify guest is now active
    for (let i = 0; i < 3; i++) {
      playback.tick();
    }
    assert.strictEqual(playback.getCurrentTick(), 6);
    assert.strictEqual(playback.isPlayerActive('guest'), true);
  });

  it('InputPlayer instances are reused but provide correct data after seek', () => {
    const replay = createMockReplay([
      {
        playerId: 'host',
        callsign: 'Host',
        inputs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      },
    ]);

    let currentEntityMap = new Map();

    const setupWorld = () => {
      const { world, entityMap } = createTestWorld(['host']);
      currentEntityMap = entityMap;
      return world;
    };

    const getPlayerEntity = (_world, playerId) =>
      currentEntityMap.get(playerId) ?? null;

    const playback = new MultiplayerReplayPlayback(
      replay,
      setupWorld,
      getPlayerEntity,
    );

    // Advance to tick 7
    for (let i = 0; i < 7; i++) {
      playback.tick();
    }

    // Seek to tick 2
    playback.seekTo(2);
    while (playback.processSeek(100)) {}

    // Advance one more tick (to tick 3)
    playback.tick();
    assert.strictEqual(playback.getCurrentTick(), 3);
  });

  it('multiple seeks work correctly', () => {
    const replay = createMockReplay([
      {
        playerId: 'host',
        callsign: 'Host',
        inputs: Array.from({ length: 100 }, (_, i) => i + 1),
      },
    ]);

    let worldCount = 0;
    let currentEntityMap = new Map();

    const setupWorld = () => {
      worldCount++;
      const { world, entityMap } = createTestWorld(['host']);
      currentEntityMap = entityMap;
      return world;
    };

    const getPlayerEntity = (_world, playerId) =>
      currentEntityMap.get(playerId) ?? null;

    const playback = new MultiplayerReplayPlayback(
      replay,
      setupWorld,
      getPlayerEntity,
    );

    // Seek to various points
    const seekPoints = [50, 25, 75, 10, 90, 0, 99];
    for (const target of seekPoints) {
      playback.seekTo(target);
      while (playback.processSeek(100)) {}
      assert.strictEqual(
        playback.getCurrentTick(),
        target,
        `Should be at tick ${target}`,
      );
    }

    // Each seek creates a new world
    assert.strictEqual(worldCount, seekPoints.length + 1);
  });
});
