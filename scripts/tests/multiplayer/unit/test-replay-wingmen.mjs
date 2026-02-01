/**
 * Tests for multiplayer replay AI wingmen capture.
 *
 * Verifies that:
 * 1. AI wingmen are stored in the recorder
 * 2. AI wingmen are included in replay data
 * 3. Player-controlled ships are NOT included in wingmen array
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildMultiplayerReplayData,
  MultiplayerInputRecorder,
} from '../../../../src/replay/multiplayer-replay.ts';

// =============================================================================
// Multiplayer Replay AI Wingmen
// =============================================================================

describe('Multiplayer Replay AI Wingmen', () => {
  it('stores AI wingmen in recorder', () => {
    const recorder = new MultiplayerInputRecorder(42, 'test-mission');

    // Initially no wingmen
    assert.deepStrictEqual(recorder.getWingmen(), []);
    assert.strictEqual(recorder.getPlayerAutoaim(), 0);

    // Set AI wingmen
    const wingmen = [
      {
        loadout: {
          shipClass: 'fighter',
          primaryWeapons: [{ weaponId: 'laser', bankSize: 2 }],
          secondaryWeapons: [],
        },
        position: { x: 30, y: 0, z: -15 },
        pilotName: 'Alpha 2',
        pilotSkill: 'veteran',
      },
      {
        loadout: {
          shipClass: 'interceptor',
          primaryWeapons: [{ weaponId: 'plasma', bankSize: 1 }],
          secondaryWeapons: [
            { weaponId: 'seeker', bankSize: 2, ammo: 8, maxAmmo: 8 },
          ],
        },
        position: { x: -30, y: 0, z: -15 },
        pilotName: 'Alpha 3',
        pilotSkill: 'elite',
      },
    ];

    recorder.setWingmen(wingmen, 2);

    // Verify wingmen are stored
    assert.strictEqual(recorder.getWingmen().length, 2);
    assert.strictEqual(recorder.getPlayerAutoaim(), 2);

    // Verify wingmen data is correct
    const stored = recorder.getWingmen();
    assert.strictEqual(stored[0].loadout.shipClass, 'fighter');
    assert.strictEqual(stored[0].pilotName, 'Alpha 2');
    assert.strictEqual(stored[0].position.x, 30);

    assert.strictEqual(stored[1].loadout.shipClass, 'interceptor');
    assert.strictEqual(stored[1].pilotName, 'Alpha 3');
    assert.strictEqual(stored[1].pilotSkill, 'elite');
  });

  it('includes AI wingmen in replay data', () => {
    const recorder = new MultiplayerInputRecorder(42, 'test-mission');
    recorder.addPlayer('host');
    recorder.addPlayer('guest');

    // Set AI wingmen (ships that are NOT player-controlled)
    const aiWingmen = [
      {
        loadout: {
          shipClass: 'heavy-fighter',
          primaryWeapons: [
            { weaponId: 'autocannon', bankSize: 1, ammo: 500, maxAmmo: 500 },
          ],
          secondaryWeapons: [],
        },
        position: { x: 60, y: 0, z: -35 },
        pilotName: 'Alpha 4',
        pilotSkill: 'regular',
      },
    ];
    recorder.setWingmen(aiWingmen, 1);

    // Simulate some ticks
    for (let i = 0; i < 5; i++) {
      recorder.recordInputs(
        new Map([
          ['host', i],
          ['guest', i * 2],
        ]),
      );
    }

    // Build player infos (these are player-controlled ships)
    const playerInfos = [
      {
        playerId: 'host',
        callsign: 'Commander',
        shipEntityId: 1,
        campaignShipId: 'ship-1',
        isHost: true,
        loadout: {
          shipClass: 'fighter',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
      },
      {
        playerId: 'guest',
        callsign: 'Wingman',
        shipEntityId: 2,
        campaignShipId: 'ship-2',
        isHost: false,
        loadout: {
          shipClass: 'interceptor',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
      },
    ];

    const metadata = {
      missionId: 'test',
      missionName: 'Test Mission',
      sector: 1,
      shipType: 'fighter',
      outcome: 'victory',
      durationTicks: 5,
      recordedAt: Date.now(),
      gameVersion: '1.0.0',
      stats: { kills: 0, damageDealt: 0, damageTaken: 0 },
    };

    // Build replay with AI wingmen
    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'host',
      metadata,
      playerInfos[0].loadout,
      aiWingmen,
      1, // playerAutoaim
    );

    // Verify players array has player-controlled ships
    assert.strictEqual(replayData.players.length, 2);
    assert.strictEqual(replayData.players[0].callsign, 'Commander');
    assert.strictEqual(replayData.players[1].callsign, 'Wingman');

    // Verify wingmen array has AI wingmen
    assert.strictEqual(replayData.wingmen.length, 1);
    assert.strictEqual(
      replayData.wingmen[0].loadout.shipClass,
      'heavy-fighter',
    );
    assert.strictEqual(replayData.wingmen[0].pilotName, 'Alpha 4');
    assert.strictEqual(replayData.wingmen[0].position.x, 60);

    // Verify autoaim is captured
    assert.strictEqual(replayData.playerAutoaim, 1);
  });

  it('handles mixed player and AI ships correctly', () => {
    // Scenario: 4 deployed ships, 2 players, 2 AI wingmen
    const recorder = new MultiplayerInputRecorder(42, 'test-mission');
    recorder.addPlayer('host');
    recorder.addPlayer('guest');

    // 2 AI wingmen (the other 2 ships are player-controlled)
    const aiWingmen = [
      {
        loadout: {
          shipClass: 'bomber',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
        position: { x: 60, y: 0, z: -35 },
        pilotName: 'AI Pilot 1',
      },
      {
        loadout: {
          shipClass: 'heavy-fighter',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
        position: { x: -60, y: 0, z: -35 },
        pilotName: 'AI Pilot 2',
      },
    ];
    recorder.setWingmen(aiWingmen, 0);

    // Simulate ticks
    for (let i = 0; i < 10; i++) {
      recorder.recordInputs(
        new Map([
          ['host', 1],
          ['guest', 2],
        ]),
      );
    }

    const playerInfos = [
      {
        playerId: 'host',
        callsign: 'Player 1',
        shipEntityId: 1,
        campaignShipId: 'ship-1',
        isHost: true,
        loadout: {
          shipClass: 'fighter',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
      },
      {
        playerId: 'guest',
        callsign: 'Player 2',
        shipEntityId: 2,
        campaignShipId: 'ship-2',
        isHost: false,
        loadout: {
          shipClass: 'interceptor',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
      },
    ];

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
      'host',
      metadata,
      playerInfos[0].loadout,
      aiWingmen,
      0,
    );

    // Total ships in replay: 2 players + 2 AI = 4
    assert.strictEqual(
      replayData.players.length,
      2,
      'Should have 2 player entries',
    );
    assert.strictEqual(
      replayData.wingmen.length,
      2,
      'Should have 2 AI wingmen',
    );

    // Verify player ships are NOT in wingmen
    const wingmenClasses = replayData.wingmen.map((w) => w.loadout.shipClass);
    assert.ok(
      !wingmenClasses.includes('fighter'),
      'Player 1 ship (fighter) should not be in wingmen',
    );
    assert.ok(
      !wingmenClasses.includes('interceptor'),
      'Player 2 ship (interceptor) should not be in wingmen',
    );

    // Verify AI ships ARE in wingmen
    assert.ok(
      wingmenClasses.includes('bomber'),
      'AI wingman (bomber) should be in wingmen',
    );
    assert.ok(
      wingmenClasses.includes('heavy-fighter'),
      'AI wingman (heavy-fighter) should be in wingmen',
    );
  });
});
