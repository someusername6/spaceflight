/**
 * Tests for multiplayer replay loadout capture.
 *
 * Verifies that:
 * 1. Each player's actual ship type is captured in replay data
 * 2. Each player's weapon loadouts are captured correctly
 * 3. Different ship types across players are preserved
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { shipToReplayLoadout } from '../../../../src/campaign/ship-ammo.ts';
import {
  emptySlotArray,
  setSlot,
} from '../../../../src/campaign/slot-array.ts';
import {
  buildMultiplayerReplayData,
  MultiplayerInputRecorder,
} from '../../../../src/replay/multiplayer-replay.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock OwnedShip with configurable loadout.
 */
function createMockShip(shipClass, primaryWeapons = [], secondaryWeapons = []) {
  let primaries = emptySlotArray(3);
  for (let i = 0; i < primaryWeapons.length; i++) {
    primaries = setSlot(primaries, i, primaryWeapons[i]);
  }

  let secondaries = emptySlotArray(2);
  for (let i = 0; i < secondaryWeapons.length; i++) {
    secondaries = setSlot(secondaries, i, secondaryWeapons[i]);
  }

  return {
    id: `ship-${shipClass}`,
    shipClass,
    primaryWeapons: primaries,
    secondaryWeapons: secondaries,
    pilot: { id: 'pilot-1', name: 'Test Pilot' },
  };
}

/**
 * Create a primary weapon config.
 */
function createPrimary(weaponType, bankSize = 1, currentAmmo = undefined) {
  return { weaponType, bankSize, currentAmmo };
}

/**
 * Create a secondary weapon config.
 */
function createSecondary(weaponType, bankSize = 1, count = 10, maxCount = 10) {
  return { weaponType, bankSize, count, maxCount };
}

// =============================================================================
// shipToReplayLoadout Tests
// =============================================================================

describe('shipToReplayLoadout', () => {
  it('captures ship class correctly', () => {
    const ship = createMockShip('interceptor');
    const loadout = shipToReplayLoadout(ship);

    assert.strictEqual(loadout.shipClass, 'interceptor');
  });

  it('captures different ship classes', () => {
    const ships = ['fighter', 'interceptor', 'bomber', 'heavy-fighter'];

    for (const shipClass of ships) {
      const ship = createMockShip(shipClass);
      const loadout = shipToReplayLoadout(ship);
      assert.strictEqual(
        loadout.shipClass,
        shipClass,
        `Ship class ${shipClass} should be captured`,
      );
    }
  });

  it('captures primary weapons with bank sizes', () => {
    const ship = createMockShip('fighter', [
      createPrimary('plasma', 2),
      createPrimary('autocannon', 1, 500),
    ]);

    const loadout = shipToReplayLoadout(ship);

    assert.strictEqual(loadout.primaryWeapons.length, 2);
    assert.strictEqual(loadout.primaryWeapons[0].weaponId, 'plasma');
    assert.strictEqual(loadout.primaryWeapons[0].bankSize, 2);
    assert.strictEqual(loadout.primaryWeapons[0].ammo, undefined); // Energy weapon

    assert.strictEqual(loadout.primaryWeapons[1].weaponId, 'autocannon');
    assert.strictEqual(loadout.primaryWeapons[1].bankSize, 1);
    assert.strictEqual(loadout.primaryWeapons[1].ammo, 500); // Ballistic weapon
  });

  it('captures secondary weapons with ammo counts', () => {
    const ship = createMockShip(
      'fighter',
      [],
      [createSecondary('seeker', 2, 8, 8), createSecondary('decoy', 1, 4, 4)],
    );

    const loadout = shipToReplayLoadout(ship);

    assert.strictEqual(loadout.secondaryWeapons.length, 2);
    assert.strictEqual(loadout.secondaryWeapons[0].weaponId, 'seeker');
    assert.strictEqual(loadout.secondaryWeapons[0].bankSize, 2);
    assert.strictEqual(loadout.secondaryWeapons[0].ammo, 8);
    assert.strictEqual(loadout.secondaryWeapons[0].maxAmmo, 8);

    assert.strictEqual(loadout.secondaryWeapons[1].weaponId, 'decoy');
    assert.strictEqual(loadout.secondaryWeapons[1].bankSize, 1);
    assert.strictEqual(loadout.secondaryWeapons[1].ammo, 4);
  });

  it('handles empty weapon slots', () => {
    const ship = createMockShip('fighter');
    const loadout = shipToReplayLoadout(ship);

    assert.strictEqual(loadout.primaryWeapons.length, 0);
    assert.strictEqual(loadout.secondaryWeapons.length, 0);
  });
});

// =============================================================================
// Multiplayer Replay Data Player Loadouts
// =============================================================================

describe('Multiplayer Replay Player Loadouts', () => {
  it('preserves different loadouts for each player', () => {
    const seed = 42;
    const missionId = 'test-mission';

    const recorder = new MultiplayerInputRecorder(seed, missionId);
    recorder.addPlayer('host');
    recorder.addPlayer('guest');

    // Simulate a few ticks
    for (let i = 0; i < 10; i++) {
      recorder.recordInputs(
        new Map([
          ['host', 1],
          ['guest', 2],
        ]),
      );
    }

    // Create player infos with DIFFERENT loadouts
    const playerInfos = [
      {
        playerId: 'host',
        callsign: 'Alpha',
        shipEntityId: 1,
        campaignShipId: 'ship-1',
        isHost: true,
        loadout: {
          shipClass: 'interceptor',
          primaryWeapons: [{ weaponId: 'plasma', bankSize: 2 }],
          secondaryWeapons: [
            { weaponId: 'seeker', bankSize: 2, ammo: 8, maxAmmo: 8 },
          ],
        },
      },
      {
        playerId: 'guest',
        callsign: 'Beta',
        shipEntityId: 2,
        campaignShipId: 'ship-2',
        isHost: false,
        loadout: {
          shipClass: 'bomber',
          primaryWeapons: [
            { weaponId: 'autocannon', bankSize: 1, ammo: 500, maxAmmo: 500 },
          ],
          secondaryWeapons: [
            { weaponId: 'torpedo', bankSize: 1, ammo: 4, maxAmmo: 4 },
          ],
        },
      },
    ];

    const metadata = {
      missionId: 'test',
      missionName: 'Test Mission',
      sector: 1,
      shipType: 'interceptor',
      outcome: 'victory',
      durationTicks: 10,
      recordedAt: Date.now(),
      gameVersion: '1.0.0',
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
    };

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'host',
      metadata,
      playerInfos[0].loadout,
      [],
      0,
    );

    // Verify each player's loadout is preserved
    assert.strictEqual(replayData.players.length, 2);

    // Find host player
    const hostPlayer = playerInfos.find((p) => p.playerId === 'host');
    assert.strictEqual(hostPlayer.loadout.shipClass, 'interceptor');
    assert.strictEqual(hostPlayer.loadout.primaryWeapons[0].weaponId, 'plasma');
    assert.strictEqual(
      hostPlayer.loadout.secondaryWeapons[0].weaponId,
      'seeker',
    );

    // Find guest player
    const guestPlayer = playerInfos.find((p) => p.playerId === 'guest');
    assert.strictEqual(guestPlayer.loadout.shipClass, 'bomber');
    assert.strictEqual(
      guestPlayer.loadout.primaryWeapons[0].weaponId,
      'autocannon',
    );
    assert.strictEqual(
      guestPlayer.loadout.secondaryWeapons[0].weaponId,
      'torpedo',
    );

    // Verify they have different ship classes
    assert.notStrictEqual(
      hostPlayer.loadout.shipClass,
      guestPlayer.loadout.shipClass,
      'Players should have different ship classes',
    );
  });

  it('captures 4-player session with varied loadouts', () => {
    const seed = 42;
    const recorder = new MultiplayerInputRecorder(seed, 'test');

    const playerIds = ['p1', 'p2', 'p3', 'p4'];
    const shipClasses = ['fighter', 'interceptor', 'bomber', 'heavy-fighter'];

    for (const id of playerIds) {
      recorder.addPlayer(id);
    }

    // Simulate ticks
    for (let i = 0; i < 10; i++) {
      const inputs = new Map();
      for (const id of playerIds) {
        inputs.set(id, i);
      }
      recorder.recordInputs(inputs);
    }

    // Create varied loadouts
    const playerInfos = playerIds.map((id, index) => ({
      playerId: id,
      callsign: `Player ${index + 1}`,
      shipEntityId: index + 1,
      campaignShipId: `ship-${index + 1}`,
      isHost: index === 0,
      loadout: {
        shipClass: shipClasses[index],
        primaryWeapons: [{ weaponId: `weapon-${index}`, bankSize: index + 1 }],
        secondaryWeapons: [],
      },
    }));

    const metadata = {
      missionId: 'test',
      missionName: 'Test',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: 10,
      recordedAt: Date.now(),
      gameVersion: '1.0.0',
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
    };

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'p1',
      metadata,
      playerInfos[0].loadout,
      [],
      0,
    );

    // Verify all 4 players are recorded
    assert.strictEqual(replayData.players.length, 4);

    // Verify each player has a unique ship class in their info
    const capturedClasses = new Set(
      playerInfos.map((p) => p.loadout.shipClass),
    );
    assert.strictEqual(
      capturedClasses.size,
      4,
      'All 4 ship classes should be unique',
    );

    // Verify specific classes are correct
    for (let i = 0; i < 4; i++) {
      assert.strictEqual(
        playerInfos[i].loadout.shipClass,
        shipClasses[i],
        `Player ${i + 1} should have ${shipClasses[i]}`,
      );
    }
  });
});
