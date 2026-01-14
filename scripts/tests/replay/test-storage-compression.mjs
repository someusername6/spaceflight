/**
 * Replay Storage Compression Tests
 *
 * Verifies:
 * 1. Compressed export produces valid gzip
 * 2. Compressed import decompresses and validates
 * 3. Roundtrip preserves all data
 */

import { isGzipCompressed } from '../../../src/replay/gzip.ts';
import {
  exportReplayCompressed,
  importReplayCompressed,
} from '../../../src/replay/storage.ts';
import { assertEqual, assertTrue, runTests, test } from './test-helpers.mjs';

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
// Compressed Export/Import Tests
// ============================================================================

test('exportReplayCompressed: produces gzip data', async () => {
  const replay = createValidReplay();
  const compressed = await exportReplayCompressed(replay);

  assertTrue(compressed instanceof Uint8Array, 'Should return Uint8Array');
  assertTrue(compressed.length > 0, 'Should have content');
  assertTrue(isGzipCompressed(compressed), 'Should be valid gzip');
});

test('importReplayCompressed: decompresses and validates', async () => {
  const replay = createValidReplay();
  const compressed = await exportReplayCompressed(replay);
  const imported = await importReplayCompressed(compressed);

  assertEqual(imported.version, 1, 'Version should be 1');
  assertEqual(imported.seed, 12345, 'Seed should match');
  assertEqual(
    imported.metadata.missionId,
    's1-gnat-expectations',
    'Mission ID should match',
  );
});

test('compressed roundtrip: preserves all data', async () => {
  const replay = createValidReplay();
  const compressed = await exportReplayCompressed(replay);
  const imported = await importReplayCompressed(compressed);

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

test('compressed: compression ratio is reasonable', async () => {
  // Create a replay with lots of repeated data (common in real replays)
  const replay = createValidReplay();
  replay.inputs = new Array(10000).fill(64); // 10k repeated inputs
  replay.tickCount = 10000;

  const json = JSON.stringify(replay);
  const compressed = await exportReplayCompressed(replay);

  const ratio = json.length / compressed.length;
  assertTrue(
    ratio > 5,
    `Repetitive replay data should compress at least 5:1, got ${ratio.toFixed(2)}:1`,
  );
});

// ============================================================================
// Run Tests
// ============================================================================

await runTests('Replay Storage Compression Tests');
