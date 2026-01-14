/**
 * Replay Storage Tests
 *
 * Verifies:
 * 1. Import validation works correctly
 * 2. Export produces valid JSON
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

/** Valid v1 replay data */
function createValidReplay() {
  return {
    version: 1,
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
        { weaponId: 'plasma', bankSize: 2 },
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
    playerAutoaim: 1,
  };
}

// ============================================================================
// Import Validation Tests
// ============================================================================

test('importReplayFromJSON: valid replay', () => {
  const replay = createValidReplay();
  const json = JSON.stringify(replay);
  const imported = importReplayFromJSON(json);

  assertEqual(imported.version, 1, 'Version should be 1');
  assertEqual(imported.seed, 12345, 'Seed should match');
  assertEqual(imported.tickCount, 5, 'Tick count should match');
  assertEqual(
    imported.metadata.missionId,
    's1-gnat-expectations',
    'Mission ID should match',
  );
  assertEqual(
    imported.playerLoadout.shipClass,
    'interceptor',
    'Player ship class should match',
  );
  assertEqual(imported.wingmen.length, 1, 'Should have 1 wingman');
  assertEqual(imported.playerAutoaim, 1, 'Player autoaim should match');
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
  const replay = createValidReplay();
  delete replay.version;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing version',
    'Missing version',
  );
});

test('importReplayFromJSON: rejects wrong version', () => {
  const replay = createValidReplay();
  replay.version = 999;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'not supported',
    'Wrong version',
  );
});

test('importReplayFromJSON: rejects missing seed', () => {
  const replay = createValidReplay();
  delete replay.seed;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing seed',
    'Missing seed',
  );
});

test('importReplayFromJSON: rejects non-number inputs', () => {
  const replay = createValidReplay();
  replay.inputs = [64, 'not a number', 512];
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'inputs[1] is not a number',
    'Non-number input',
  );
});

test('importReplayFromJSON: rejects missing missionId', () => {
  const replay = createValidReplay();
  delete replay.metadata.missionId;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing missionId',
    'Missing missionId',
  );
});

test('importReplayFromJSON: rejects invalid outcome', () => {
  const replay = createValidReplay();
  replay.metadata.outcome = 'invalid';
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'outcome must be',
    'Invalid outcome',
  );
});

test('importReplayFromJSON: accepts timeout outcome', () => {
  const replay = createValidReplay();
  replay.metadata.outcome = 'timeout';
  const imported = importReplayFromJSON(JSON.stringify(replay));
  assertEqual(
    imported.metadata.outcome,
    'timeout',
    'Should accept timeout outcome',
  );
});

test('importReplayFromJSON: rejects invalid sector', () => {
  const replay = createValidReplay();
  replay.metadata.sector = 0;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'invalid sector',
    'Invalid sector',
  );
});

test('importReplayFromJSON: validates stats fields', () => {
  const replay = createValidReplay();
  replay.metadata.stats.kills = 'not a number';
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'stats.kills must be a number',
    'Invalid stats.kills',
  );
});

test('importReplayFromJSON: rejects missing playerLoadout', () => {
  const replay = createValidReplay();
  delete replay.playerLoadout;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing playerLoadout',
    'Missing playerLoadout',
  );
});

test('importReplayFromJSON: rejects missing wingmen', () => {
  const replay = createValidReplay();
  delete replay.wingmen;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'missing wingmen',
    'Missing wingmen',
  );
});

test('importReplayFromJSON: rejects missing playerAutoaim', () => {
  const replay = createValidReplay();
  delete replay.playerAutoaim;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'invalid playerAutoaim',
    'Missing playerAutoaim',
  );
});

test('importReplayFromJSON: rejects invalid playerAutoaim value', () => {
  const replay = createValidReplay();
  replay.playerAutoaim = 5; // Not a valid value (valid: 0, 0.5, 1, 1.5, 2, 2.5, 3)
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'invalid playerAutoaim',
    'Invalid playerAutoaim value',
  );
});

test('importReplayFromJSON: rejects invalid playerLoadout structure', () => {
  const replay = createValidReplay();
  replay.playerLoadout = { shipClass: 123 }; // shipClass should be string
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'shipClass must be a string',
    'Invalid shipClass type',
  );
});

test('importReplayFromJSON: rejects missing primaryWeapons', () => {
  const replay = createValidReplay();
  delete replay.playerLoadout.primaryWeapons;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'primaryWeapons must be array',
    'Missing primaryWeapons',
  );
});

test('importReplayFromJSON: rejects invalid primary weapon', () => {
  const replay = createValidReplay();
  replay.playerLoadout.primaryWeapons[0] = { weaponId: 'plasma' }; // Missing bankSize
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'bankSize must be a positive number',
    'Invalid primary weapon bankSize',
  );
});

test('importReplayFromJSON: rejects invalid secondary weapon', () => {
  const replay = createValidReplay();
  replay.playerLoadout.secondaryWeapons[0] = {
    weaponId: 'seeker',
    bankSize: 2,
  }; // Missing ammo
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'ammo must be a number',
    'Invalid secondary weapon ammo',
  );
});

test('importReplayFromJSON: rejects invalid wingman loadout', () => {
  const replay = createValidReplay();
  replay.wingmen[0].loadout = null;
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'loadout must be an object',
    'Invalid wingman loadout',
  );
});

test('importReplayFromJSON: rejects invalid wingman position', () => {
  const replay = createValidReplay();
  replay.wingmen[0].position = { x: 'not a number', y: 0, z: 0 };
  assertThrows(
    () => importReplayFromJSON(JSON.stringify(replay)),
    'position.x must be a number',
    'Invalid wingman position',
  );
});

// ============================================================================
// Export Tests
// ============================================================================

test('exportReplayToJSON: produces valid JSON', () => {
  const replay = createValidReplay();
  const json = exportReplayToJSON(replay);

  // Should be parseable
  const parsed = JSON.parse(json);
  assertEqual(parsed.version, 1, 'Version should be in output');
  assertEqual(parsed.seed, 12345, 'Seed should be in output');
  assertTrue(
    parsed.playerLoadout !== undefined,
    'playerLoadout should be in output',
  );
  assertEqual(parsed.playerAutoaim, 1, 'playerAutoaim should be in output');
});

test('exportReplayToJSON: roundtrip preserves data', () => {
  const replay = createValidReplay();
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
  assertEqual(
    imported.playerAutoaim,
    replay.playerAutoaim,
    'playerAutoaim should roundtrip',
  );
});

// ============================================================================
// Run Tests
// ============================================================================

await runTests('Replay Storage Tests');
