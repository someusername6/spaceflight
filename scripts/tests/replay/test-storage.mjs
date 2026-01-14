/**
 * Replay Storage Tests
 *
 * Verifies:
 * 1. Import validation works correctly
 * 2. Export produces valid JSON
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  exportReplayToJSON,
  importReplayFromJSON,
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
// Import Validation Tests
// ============================================================================

describe('importReplayFromJSON', () => {
  it('valid replay', () => {
    const replay = createValidReplay();
    const json = JSON.stringify(replay);
    const imported = importReplayFromJSON(json);

    assert.strictEqual(imported.version, 1, 'Version should be 1');
    assert.strictEqual(imported.seed, 12345, 'Seed should match');
    assert.strictEqual(imported.tickCount, 5, 'Tick count should match');
    assert.strictEqual(
      imported.metadata.missionId,
      's1-gnat-expectations',
      'Mission ID should match',
    );
    assert.strictEqual(
      imported.playerLoadout.shipClass,
      'interceptor',
      'Player ship class should match',
    );
    assert.strictEqual(imported.wingmen.length, 1, 'Should have 1 wingman');
    assert.strictEqual(
      imported.playerAutoaim,
      1,
      'Player autoaim should match',
    );
  });

  it('rejects invalid JSON', () => {
    assert.throws(
      () => importReplayFromJSON('not valid json'),
      /Invalid JSON format/,
      'Invalid JSON',
    );
  });

  it('rejects non-object', () => {
    assert.throws(
      () => importReplayFromJSON('"just a string"'),
      /not an object/,
      'Non-object',
    );
  });

  it('rejects missing version', () => {
    const replay = createValidReplay();
    delete replay.version;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /missing version/,
      'Missing version',
    );
  });

  it('rejects wrong version', () => {
    const replay = createValidReplay();
    replay.version = 999;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /not supported/,
      'Wrong version',
    );
  });

  it('rejects missing seed', () => {
    const replay = createValidReplay();
    delete replay.seed;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /missing seed/,
      'Missing seed',
    );
  });

  it('rejects non-number inputs', () => {
    const replay = createValidReplay();
    replay.inputs = [64, 'not a number', 512];
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /inputs\[1\] is not a number/,
      'Non-number input',
    );
  });

  it('rejects missing missionId', () => {
    const replay = createValidReplay();
    delete replay.metadata.missionId;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /missing missionId/,
      'Missing missionId',
    );
  });

  it('rejects invalid outcome', () => {
    const replay = createValidReplay();
    replay.metadata.outcome = 'invalid';
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /outcome must be/,
      'Invalid outcome',
    );
  });

  it('accepts timeout outcome', () => {
    const replay = createValidReplay();
    replay.metadata.outcome = 'timeout';
    const imported = importReplayFromJSON(JSON.stringify(replay));
    assert.strictEqual(
      imported.metadata.outcome,
      'timeout',
      'Should accept timeout outcome',
    );
  });

  it('rejects invalid sector', () => {
    const replay = createValidReplay();
    replay.metadata.sector = 0;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /invalid sector/,
      'Invalid sector',
    );
  });

  it('validates stats fields', () => {
    const replay = createValidReplay();
    replay.metadata.stats.kills = 'not a number';
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /stats\.kills must be a number/,
      'Invalid stats.kills',
    );
  });

  it('rejects missing playerLoadout', () => {
    const replay = createValidReplay();
    delete replay.playerLoadout;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /playerLoadout must be an object/,
      'Missing playerLoadout',
    );
  });

  it('rejects missing wingmen', () => {
    const replay = createValidReplay();
    delete replay.wingmen;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /wingmen must be an array/,
      'Missing wingmen',
    );
  });

  it('rejects missing playerAutoaim', () => {
    const replay = createValidReplay();
    delete replay.playerAutoaim;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /invalid playerAutoaim/,
      'Missing playerAutoaim',
    );
  });

  it('rejects invalid playerAutoaim value', () => {
    const replay = createValidReplay();
    replay.playerAutoaim = 5; // Not a valid value (valid: 0, 0.5, 1, 1.5, 2, 2.5, 3)
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /invalid playerAutoaim/,
      'Invalid playerAutoaim value',
    );
  });

  it('rejects invalid playerLoadout structure', () => {
    const replay = createValidReplay();
    replay.playerLoadout = { shipClass: 123 }; // shipClass should be string
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /shipClass must be a string/,
      'Invalid shipClass type',
    );
  });

  it('rejects missing primaryWeapons', () => {
    const replay = createValidReplay();
    delete replay.playerLoadout.primaryWeapons;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /primaryWeapons must be array/,
      'Missing primaryWeapons',
    );
  });

  it('rejects invalid primary weapon', () => {
    const replay = createValidReplay();
    replay.playerLoadout.primaryWeapons[0] = { weaponId: 'plasma' }; // Missing bankSize
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /bankSize must be a positive number/,
      'Invalid primary weapon bankSize',
    );
  });

  it('rejects invalid secondary weapon', () => {
    const replay = createValidReplay();
    replay.playerLoadout.secondaryWeapons[0] = {
      weaponId: 'seeker',
      bankSize: 2,
    }; // Missing ammo
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /ammo must be a number/,
      'Invalid secondary weapon ammo',
    );
  });

  it('rejects invalid wingman loadout', () => {
    const replay = createValidReplay();
    replay.wingmen[0].loadout = null;
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /loadout must be an object/,
      'Invalid wingman loadout',
    );
  });

  it('rejects invalid wingman position', () => {
    const replay = createValidReplay();
    replay.wingmen[0].position = { x: 'not a number', y: 0, z: 0 };
    assert.throws(
      () => importReplayFromJSON(JSON.stringify(replay)),
      /position\.x must be a number/,
      'Invalid wingman position',
    );
  });
});

// ============================================================================
// Export Tests
// ============================================================================

describe('exportReplayToJSON', () => {
  it('produces valid JSON', () => {
    const replay = createValidReplay();
    const json = exportReplayToJSON(replay);

    // Should be parseable
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.version, 1, 'Version should be in output');
    assert.strictEqual(parsed.seed, 12345, 'Seed should be in output');
    assert.ok(
      parsed.playerLoadout !== undefined,
      'playerLoadout should be in output',
    );
    assert.strictEqual(
      parsed.playerAutoaim,
      1,
      'playerAutoaim should be in output',
    );
  });

  it('roundtrip preserves data', () => {
    const replay = createValidReplay();
    const json = exportReplayToJSON(replay);
    const imported = importReplayFromJSON(json);

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
      imported.metadata.stats.kills,
      replay.metadata.stats.kills,
      'stats.kills should roundtrip',
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
});
