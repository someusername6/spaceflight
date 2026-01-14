/**
 * Replay Playback Tests
 *
 * Verifies that:
 * 1. ReplayPlayback correctly simulates from replay data
 * 2. Playback produces identical results to original recording
 * 3. Seeking works correctly
 * 4. Playback controls function properly
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getComponent, queryEntities } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { encodeRLE } from '../../../src/replay/compression.ts';
import { findMissionById } from '../../../src/replay/mission-setup.ts';
import { ReplayPlayback } from '../../../src/replay/playback.ts';
import {
  computeWorldChecksum,
  generateScriptedInputs,
} from '../shared/replay-test-utils.mjs';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal replay data object for testing.
 */
function createTestReplayData(
  seed,
  inputs,
  missionId = 's1-gnat-expectations',
) {
  const { data: compressedInputs, compressed } = encodeRLE(inputs);
  return {
    version: 1,
    seed,
    inputs: compressedInputs,
    inputsCompressed: compressed,
    tickCount: inputs.length,
    metadata: {
      id: 'test-replay',
      missionId,
      missionName: 'Test Mission',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: inputs.length,
      recordedAt: Date.now(),
      gameVersion: '0.2.0',
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
    },
    playerLoadout: {
      shipClass: 'interceptor',
      primaryWeapons: [{ weaponId: 'plasma', bankSize: 2 }],
      secondaryWeapons: [
        { weaponId: 'seeker', bankSize: 2, ammo: 8, maxAmmo: 12 },
      ],
    },
    wingmen: [],
    playerAutoaim: 1,
  };
}

// ============================================================================
// Mission Setup Tests
// ============================================================================

describe('Mission Setup', () => {
  it('findMissionById: finds existing mission', () => {
    const mission = findMissionById('s1-gnat-expectations');
    assert.ok(mission !== null, 'Should find s1-gnat-expectations mission');
    assert.strictEqual(
      mission.id,
      's1-gnat-expectations',
      'Mission ID should match',
    );
  });

  it('findMissionById: returns null for unknown mission', () => {
    const mission = findMissionById('nonexistent_mission_xyz');
    assert.strictEqual(mission, null, 'Should return null for unknown mission');
  });
});

// ============================================================================
// ReplayPlayback Tests
// ============================================================================

describe('ReplayPlayback', () => {
  it('initializes correctly', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    assert.strictEqual(playback.getCurrentTick(), 0, 'Should start at tick 0');
    assert.strictEqual(
      playback.getTotalTicks(),
      100,
      'Should have correct total ticks',
    );
    assert.strictEqual(playback.getState(), 'paused', 'Should start paused');
    assert.strictEqual(playback.getSpeed(), 1, 'Should start at 1x speed');
  });

  it('tick advances state', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    playback.play();
    assert.strictEqual(playback.getState(), 'playing', 'Should be playing');

    playback.tick();
    assert.strictEqual(
      playback.getCurrentTick(),
      1,
      'Should advance to tick 1',
    );

    playback.tick();
    assert.strictEqual(
      playback.getCurrentTick(),
      2,
      'Should advance to tick 2',
    );
  });

  it('pause/play toggle', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    assert.strictEqual(playback.getState(), 'paused', 'Should start paused');

    playback.togglePlayPause();
    assert.strictEqual(
      playback.getState(),
      'playing',
      'Should be playing after toggle',
    );

    playback.togglePlayPause();
    assert.strictEqual(
      playback.getState(),
      'paused',
      'Should be paused after second toggle',
    );
  });

  it('speed control', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    playback.setSpeed(2);
    assert.strictEqual(playback.getSpeed(), 2, 'Should set speed to 2x');

    playback.setSpeed(0.5);
    assert.strictEqual(playback.getSpeed(), 0.5, 'Should set speed to 0.5x');

    playback.setSpeed(99); // Invalid
    assert.strictEqual(playback.getSpeed(), 0.5, 'Should ignore invalid speed');
  });

  it('cycle speed', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    assert.strictEqual(playback.getSpeed(), 1, 'Should start at 1x');

    playback.cycleSpeed();
    assert.strictEqual(playback.getSpeed(), 2, 'Should cycle to 2x');

    playback.cycleSpeed();
    assert.strictEqual(playback.getSpeed(), 4, 'Should cycle to 4x');

    playback.cycleSpeed();
    assert.strictEqual(playback.getSpeed(), 0.25, 'Should wrap to 0.25x');
  });

  it('ends at tick count', () => {
    const inputs = generateScriptedInputs(10);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    playback.play();

    // Run to end
    for (let i = 0; i < 15; i++) {
      playback.tick();
    }

    assert.strictEqual(playback.getState(), 'ended', 'Should be ended');
    assert.strictEqual(
      playback.getCurrentTick(),
      10,
      'Should stop at tick count',
    );
  });

  it('seek to tick', () => {
    const inputs = generateScriptedInputs(1000);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    playback.seekTo(500);
    assert.strictEqual(
      playback.getState(),
      'loading',
      'Should be in loading state',
    );
    assert.ok(playback.isSeeking(), 'Should be seeking');

    // Process seeking
    while (playback.processSeek(500)) {
      // Continue seeking
    }

    assert.strictEqual(playback.getCurrentTick(), 500, 'Should be at tick 500');
    assert.strictEqual(
      playback.getState(),
      'paused',
      'Should be paused after seek',
    );
  });

  it('seek clamps to valid range', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    // Seek past end
    playback.seekTo(500);
    while (playback.processSeek()) {}
    assert.strictEqual(
      playback.getCurrentTick(),
      99,
      'Should clamp to max tick',
    );

    // Seek to negative
    playback.seekTo(-10);
    while (playback.processSeek()) {}
    assert.strictEqual(playback.getCurrentTick(), 0, 'Should clamp to 0');
  });

  it('progress calculation', () => {
    const inputs = generateScriptedInputs(100);
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    assert.strictEqual(playback.getProgressPercent(), 0, 'Should start at 0%');

    playback.seekTo(50);
    while (playback.processSeek()) {}
    assert.strictEqual(playback.getProgressPercent(), 50, 'Should be at 50%');

    playback.seekTo(99);
    while (playback.processSeek()) {}
    assert.strictEqual(playback.getProgressPercent(), 99, 'Should be at 99%');
  });

  it('time calculation', () => {
    const inputs = generateScriptedInputs(600); // 10 seconds at 60Hz
    const replay = createTestReplayData(12345, inputs);
    const playback = new ReplayPlayback(replay);

    assert.strictEqual(
      playback.getTotalTimeSeconds(),
      10,
      'Total time should be 10s',
    );
    assert.strictEqual(
      playback.getCurrentTimeSeconds(),
      0,
      'Current time should be 0s',
    );

    playback.seekTo(300);
    while (playback.processSeek()) {}
    assert.strictEqual(
      playback.getCurrentTimeSeconds(),
      5,
      'Current time should be 5s',
    );
  });
});

// ============================================================================
// Determinism Tests
// ============================================================================

describe('Playback Determinism', () => {
  it('same seed same result', () => {
    const seed = 42;
    const inputs = generateScriptedInputs(300);
    const replay = createTestReplayData(seed, inputs);

    // Run playback twice
    const playback1 = new ReplayPlayback(replay);
    playback1.seekTo(300);
    while (playback1.processSeek(1000)) {}
    const checksum1 = computeWorldChecksum(playback1.getWorld());

    const playback2 = new ReplayPlayback(replay);
    playback2.seekTo(300);
    while (playback2.processSeek(1000)) {}
    const checksum2 = computeWorldChecksum(playback2.getWorld());

    assert.strictEqual(
      checksum1,
      checksum2,
      'Two playbacks should produce same checksum',
    );
  });

  it('different seeds different results', () => {
    // Use longer simulation to ensure enemies spawn and divergence occurs
    const inputs = generateScriptedInputs(1200); // 20 seconds

    const replay1 = createTestReplayData(42, inputs);
    const playback1 = new ReplayPlayback(replay1);
    playback1.seekTo(1200);
    while (playback1.processSeek(2000)) {}
    const checksum1 = computeWorldChecksum(playback1.getWorld());
    const prng1 = playback1.getWorld().prng.state;

    const replay2 = createTestReplayData(43, inputs);
    const playback2 = new ReplayPlayback(replay2);
    playback2.seekTo(1200);
    while (playback2.processSeek(2000)) {}
    const checksum2 = computeWorldChecksum(playback2.getWorld());
    const prng2 = playback2.getWorld().prng.state;

    // PRNG states should definitely differ
    assert.ok(
      prng1 !== prng2 || checksum1 !== checksum2,
      'Different seeds should produce different PRNG states or checksums',
    );
  });
});

// ============================================================================
// Wingman Data Tests
// ============================================================================

/**
 * Create replay data with wingmen for testing.
 */
function createReplayDataWithWingmen(seed, inputs, wingmen) {
  const { data: compressedInputs, compressed } = encodeRLE(inputs);
  return {
    version: 1,
    seed,
    inputs: compressedInputs,
    inputsCompressed: compressed,
    tickCount: inputs.length,
    metadata: {
      id: 'test-replay-wingmen',
      missionId: 's1-gnat-expectations',
      missionName: 'Test Mission',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: inputs.length,
      recordedAt: Date.now(),
      gameVersion: '0.2.0',
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
    },
    playerLoadout: {
      shipClass: 'interceptor',
      primaryWeapons: [{ weaponId: 'plasma', bankSize: 2 }],
      secondaryWeapons: [],
    },
    wingmen,
    playerAutoaim: 1,
  };
}

describe('Wingman Data Capture', () => {
  it('wingmen with pilot names are reconstructed with correct callsigns', () => {
    const inputs = generateScriptedInputs(10);
    const wingmen = [
      {
        loadout: {
          shipClass: 'interceptor',
          primaryWeapons: [{ weaponId: 'plasma', bankSize: 2 }],
          secondaryWeapons: [],
        },
        position: { x: 20, y: 0, z: -10 },
        pilotName: 'Viper',
        pilotSkill: 'veteran',
      },
      {
        loadout: {
          shipClass: 'fighter',
          primaryWeapons: [{ weaponId: 'pulse', bankSize: 2 }],
          secondaryWeapons: [],
        },
        position: { x: -20, y: 0, z: -10 },
        pilotName: 'Maverick',
        pilotSkill: 'ace',
      },
    ];

    const replay = createReplayDataWithWingmen(12345, inputs, wingmen);
    const playback = new ReplayPlayback(replay);
    const world = playback.getWorld();

    // Find all player faction ships with ship identity
    const playerShips = [];
    for (const entity of queryEntities(world, ['faction', 'shipIdentity'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction?.faction === Faction.Player) {
        const identity = getComponent(world, entity, 'shipIdentity');
        playerShips.push(identity);
      }
    }

    // Should have 3 player faction ships: commander + 2 wingmen
    assert.strictEqual(
      playerShips.length,
      3,
      'Should have 3 player faction ships',
    );

    // Find wingman callsigns (excluding Commander)
    const wingmanCallsigns = playerShips
      .filter((id) => id.callsign !== 'Commander')
      .map((id) => id.callsign)
      .sort();

    assert.deepStrictEqual(
      wingmanCallsigns,
      ['Maverick', 'Viper'],
      'Wingmen should have their pilot names as callsigns',
    );
  });

  it('wingmen without pilot names default to Wingman', () => {
    const inputs = generateScriptedInputs(10);
    const wingmen = [
      {
        loadout: {
          shipClass: 'interceptor',
          primaryWeapons: [{ weaponId: 'plasma', bankSize: 2 }],
          secondaryWeapons: [],
        },
        position: { x: 20, y: 0, z: -10 },
        // No pilotName
      },
    ];

    const replay = createReplayDataWithWingmen(12345, inputs, wingmen);
    const playback = new ReplayPlayback(replay);
    const world = playback.getWorld();

    // Find wingman (non-Commander player ship)
    let wingmanCallsign = null;
    for (const entity of queryEntities(world, ['faction', 'shipIdentity'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction?.faction === Faction.Player) {
        const identity = getComponent(world, entity, 'shipIdentity');
        if (identity.callsign !== 'Commander') {
          wingmanCallsign = identity.callsign;
        }
      }
    }

    assert.strictEqual(
      wingmanCallsign,
      'Wingman',
      'Wingman without pilotName should default to "Wingman"',
    );
  });

  it('replay data without wingmen works correctly', () => {
    const inputs = generateScriptedInputs(10);
    const replay = createTestReplayData(12345, inputs);

    // Verify wingmen array is empty
    assert.deepStrictEqual(
      replay.wingmen,
      [],
      'Default test replay should have no wingmen',
    );

    const playback = new ReplayPlayback(replay);
    const world = playback.getWorld();

    // Count player faction ships
    let playerCount = 0;
    for (const entity of queryEntities(world, ['faction', 'shipIdentity'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction?.faction === Faction.Player) {
        playerCount++;
      }
    }

    assert.strictEqual(
      playerCount,
      1,
      'Should have only 1 player ship (commander) when no wingmen',
    );
  });
});
