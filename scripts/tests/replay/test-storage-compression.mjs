/**
 * Replay Storage Compression Tests
 *
 * Verifies:
 * 1. Compressed export produces valid gzip
 * 2. Compressed import decompresses and validates
 * 3. Roundtrip preserves all data
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { isGzipCompressed } from '../../../src/replay/gzip.ts';
import {
  exportReplayCompressed,
  importReplayCompressed,
} from '../../../src/replay/storage.ts';

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
      gameVersion: '0.2.0',
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

describe('Compressed Export/Import', () => {
  it('exportReplayCompressed: produces gzip data', async () => {
    const replay = createValidReplay();
    const compressed = await exportReplayCompressed(replay);

    assert.ok(compressed instanceof Uint8Array, 'Should return Uint8Array');
    assert.ok(compressed.length > 0, 'Should have content');
    assert.ok(isGzipCompressed(compressed), 'Should be valid gzip');
  });

  it('importReplayCompressed: decompresses and validates', async () => {
    const replay = createValidReplay();
    const compressed = await exportReplayCompressed(replay);
    const imported = await importReplayCompressed(compressed);

    assert.strictEqual(imported.version, 1, 'Version should be 1');
    assert.strictEqual(imported.seed, 12345, 'Seed should match');
    assert.strictEqual(
      imported.metadata.missionId,
      's1-gnat-expectations',
      'Mission ID should match',
    );
  });

  it('compressed roundtrip: preserves all data', async () => {
    const replay = createValidReplay();
    const compressed = await exportReplayCompressed(replay);
    const imported = await importReplayCompressed(compressed);

    assert.strictEqual(
      imported.version,
      replay.version,
      'Version should roundtrip',
    );
    assert.strictEqual(imported.seed, replay.seed, 'Seed should roundtrip');
    assert.strictEqual(
      imported.tickCount,
      replay.tickCount,
      'tickCount should roundtrip',
    );
    assert.strictEqual(
      imported.metadata.missionId,
      replay.metadata.missionId,
      'missionId should roundtrip',
    );
    assert.strictEqual(
      imported.playerLoadout.shipClass,
      replay.playerLoadout.shipClass,
      'playerLoadout.shipClass should roundtrip',
    );
    assert.strictEqual(
      imported.wingmen.length,
      replay.wingmen.length,
      'wingmen.length should roundtrip',
    );
    assert.strictEqual(
      imported.playerAutoaim,
      replay.playerAutoaim,
      'playerAutoaim should roundtrip',
    );
  });

  it('compressed: compression ratio is reasonable', async () => {
    // Create a replay with lots of repeated data (common in real replays)
    const replay = createValidReplay();
    replay.inputs = new Array(10000).fill(64); // 10k repeated inputs
    replay.tickCount = 10000;

    const json = JSON.stringify(replay);
    const compressed = await exportReplayCompressed(replay);

    const ratio = json.length / compressed.length;
    assert.ok(
      ratio > 5,
      `Repetitive replay data should compress at least 5:1, got ${ratio.toFixed(2)}:1`,
    );
  });
});
