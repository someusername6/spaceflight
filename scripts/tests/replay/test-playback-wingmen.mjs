/**
 * Replay Playback Wingmen Tests
 *
 * Verifies that:
 * 1. Wingmen with pilot names are reconstructed correctly
 * 2. Wingmen without pilot names default to "Wingman"
 * 3. Replays without wingmen work correctly
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getComponent, queryEntities } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { encodeRLE } from '../../../src/replay/compression.ts';
import { ReplayPlayback } from '../../../src/replay/playback.ts';
import { generateScriptedInputs } from '../shared/replay-test-utils.mjs';

// ============================================================================
// Test Helpers
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

/**
 * Create a minimal replay data object for testing (no wingmen).
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
// Wingman Data Tests
// ============================================================================

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
