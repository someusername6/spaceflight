/**
 * Replay Storage Tests
 *
 * Verifies:
 * 1. Import validation works correctly
 * 2. Version migration upgrades v1 replays to v2
 * 3. Export produces valid JSON
 */

import {
  exportReplayToJSON,
  importReplayFromJSON,
} from '../../../src/replay/storage.ts';
import {
  assertEqual,
  assertThrows,
  assertTrue,
  runTests,
  test,
} from './test-helpers.mjs';

// ============================================================================
// Test Data
// ============================================================================

/** Valid v3 replay data */
function createValidV3Replay() {
  return {
    version: 3,
    seed: 12345,
    inputs: [64, 64, 64, 512, 512],
    inputsCompressed: false,
    tickCount: 5,
    metadata: {
      id: 'test-id',
      missionId: 's1-gnat-expectations',
      missionName: 'Gnat Expectations',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: 5,
      recordedAt: Date.now(),
      gameVersion: '0.1.8',
      stats: { kills: 3, damageDealt: 150, damageTaken: 50 },
    },
    playerLoadout: {
      shipClass: 'interceptor',
      primaryWeapons: [
        {
          weaponId: 'plasma',
          bankSize: 2,
          ammo: undefined,
          maxAmmo: undefined,
        },
        { weaponId: 'autocannon', bankSize: 1, ammo: 100, maxAmmo: 100 },
      ],
      secondaryWeapons: [
        { weaponId: 'seeker', bankSize: 2, ammo: 8, maxAmmo: 8 },
      ],
    },
    wingmen: [
      {
        loadout: {
          shipClass: 'striker',
          primaryWeapons: [{ weaponId: 'plasma', bankSize: 1 }],
          secondaryWeapons: [],
        },
        position: { x: 20, y: 0, z: -10 },
      },
    ],
  };
}

/** Valid v2 replay data (for migration testing) */
function createValidV2Replay() {
  return {
    version: 2,
    seed: 12345,
    inputs: [64, 64, 64, 512, 512],
    inputsCompressed: false,
    tickCount: 5,
    metadata: {
      id: 'test-id',
      missionId: 's1-gnat-expectations',
      missionName: 'Gnat Expectations',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: 5,
      recordedAt: Date.now(),
      gameVersion: '0.1.8',
      stats: { kills: 3, damageDealt: 150, damageTaken: 50 },
    },
  };
}

/** Valid v1 replay data (no inputsCompressed, no stats) */
function createValidV1Replay() {
  return {
    version: 1,
    seed: 12345,
    inputs: [64, 64, 64, 512, 512],
    tickCount: 5,
    metadata: {
      id: 'test-id',
      missionId: 's1-gnat-expectations',
      missionName: 'Gnat Expectations',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: 5,
      recordedAt: Date.now(),
      gameVersion: '0.1.0',
    },
  };
}

// ============================================================================
// Import Validation Tests
// ============================================================================

test('importReplayFromJSON: valid v3 replay', () => {
  const replay = createValidV3Replay();
  const json = JSON.stringify(replay);
  const imported = importReplayFromJSON(json);

  assertEqual(imported.version, 3, 'Version should be 3');
  assertEqual(imported.seed, 12345, 'Seed should match');
  assertEqual(imported.tickCount, 5, 'Tick count should match');
  assertEqual(
    imported.metadata.missionId,
    's1-gnat-expectations',
    'Mission ID should match',
  );
  assertTrue(imported.playerLoadout !== undefined, 'Should have playerLoadout');
  assertEqual(
    imported.playerLoadout.shipClass,
    'interceptor',
    'Player ship class should match',
  );
  assertTrue(imported.wingmen !== undefined, 'Should have wingmen');
  assertEqual(imported.wingmen.length, 1, 'Should have 1 wingman');
});

test('importReplayFromJSON: rejects invalid JSON', () => {
  assertThrows(
    () => importReplayFromJSON('not valid json'),
    'Invalid JSON format',
    'Invalid JSON',
  );
});

test('importReplayFromJSON: rejects non-object', () => {
  assertThrows(
    () => importReplayFromJSON('"just a string"'),
    'not an object',
    'Non-object',
  );
});

test('importReplayFromJSON: rejects missing version', () => {
  const replay = createValidV3Replay();
  delete replay.version;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing version',
    'Missing version',
  );
});

test('importReplayFromJSON: rejects future version', () => {
  const replay = createValidV3Replay();
  replay.version = 999;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'newer than supported',
    'Future version',
  );
});

test('importReplayFromJSON: rejects missing seed', () => {
  const replay = createValidV3Replay();
  delete replay.seed;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing seed',
    'Missing seed',
  );
});

test('importReplayFromJSON: rejects non-number inputs', () => {
  const replay = createValidV3Replay();
  replay.inputs = [64, 'not a number', 512];
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'inputs[1] is not a number',
    'Non-number input',
  );
});

test('importReplayFromJSON: rejects missing missionId', () => {
  const replay = createValidV3Replay();
  delete replay.metadata.missionId;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing missionId',
    'Missing missionId',
  );
});

test('importReplayFromJSON: rejects invalid outcome', () => {
  const replay = createValidV3Replay();
  replay.metadata.outcome = 'invalid';
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'outcome must be',
    'Invalid outcome',
  );
});

test('importReplayFromJSON: accepts timeout outcome', () => {
  const replay = createValidV3Replay();
  replay.metadata.outcome = 'timeout';
  const imported = importReplayFromJSON(JSON.stringify(replay));
  assertEqual(
    imported.metadata.outcome,
    'timeout',
    'Should accept timeout outcome',
  );
});

test('importReplayFromJSON: rejects invalid sector', () => {
  const replay = createValidV3Replay();
  replay.metadata.sector = 0;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'invalid sector',
    'Invalid sector',
  );
});

test('importReplayFromJSON: validates stats fields', () => {
  const replay = createValidV3Replay();
  replay.metadata.stats.kills = 'not a number';
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'stats.kills must be a number',
    'Invalid stats.kills',
  );
});

// ============================================================================
// Version Migration Tests
// ============================================================================

test('migration: v1 to v3 adds inputsCompressed and stats', () => {
  const v1 = createValidV1Replay();
  const json = JSON.stringify(v1);
  const imported = importReplayFromJSON(json);

  assertEqual(imported.version, 3, 'Version should be upgraded to 3');
  assertEqual(
    imported.inputsCompressed,
    false,
    'inputsCompressed should be added as false',
  );
  assertTrue(imported.metadata.stats !== undefined, 'stats should be added');
  assertEqual(imported.metadata.stats.kills, 0, 'kills should default to 0');
});

test('migration: v2 to v3 upgrades version', () => {
  const v2 = createValidV2Replay();
  const json = JSON.stringify(v2);
  const imported = importReplayFromJSON(json);

  assertEqual(imported.version, 3, 'Version should be upgraded to 3');
  // v2 replays don't have loadout data - they'll use fallback
  assertEqual(
    imported.playerLoadout,
    undefined,
    'playerLoadout should be undefined for v2',
  );
  assertEqual(
    imported.wingmen,
    undefined,
    'wingmen should be undefined for v2',
  );
});

test('migration: v1 replay preserves original data', () => {
  const v1 = createValidV1Replay();
  const json = JSON.stringify(v1);
  const imported = importReplayFromJSON(json);

  assertEqual(imported.seed, v1.seed, 'seed should be preserved');
  assertEqual(
    imported.tickCount,
    v1.tickCount,
    'tickCount should be preserved',
  );
  assertEqual(
    imported.metadata.missionId,
    v1.metadata.missionId,
    'missionId should be preserved',
  );
  assertEqual(
    imported.metadata.outcome,
    v1.metadata.outcome,
    'outcome should be preserved',
  );
});

// ============================================================================
// Export Tests
// ============================================================================

test('exportReplayToJSON: produces valid JSON', () => {
  const replay = createValidV3Replay();
  const json = exportReplayToJSON(replay);

  // Should be parseable
  const parsed = JSON.parse(json);
  assertEqual(parsed.version, 3, 'Version should be in output');
  assertEqual(parsed.seed, 12345, 'Seed should be in output');
  assertTrue(
    parsed.playerLoadout !== undefined,
    'playerLoadout should be in output',
  );
});

test('exportReplayToJSON: roundtrip preserves data', () => {
  const replay = createValidV3Replay();
  const json = exportReplayToJSON(replay);
  const imported = importReplayFromJSON(json);

  assertEqual(imported.version, replay.version, 'Version should roundtrip');
  assertEqual(imported.seed, replay.seed, 'Seed should roundtrip');
  assertEqual(
    imported.tickCount,
    replay.tickCount,
    'tickCount should roundtrip',
  );
  assertEqual(
    imported.metadata.missionId,
    replay.metadata.missionId,
    'missionId should roundtrip',
  );
  assertEqual(
    imported.metadata.stats.kills,
    replay.metadata.stats.kills,
    'stats.kills should roundtrip',
  );
  // v3 loadout data
  assertEqual(
    imported.playerLoadout.shipClass,
    replay.playerLoadout.shipClass,
    'playerLoadout.shipClass should roundtrip',
  );
  assertEqual(
    imported.wingmen.length,
    replay.wingmen.length,
    'wingmen.length should roundtrip',
  );
});

// ============================================================================
// Run Tests
// ============================================================================

runTests('Replay Storage Tests');
