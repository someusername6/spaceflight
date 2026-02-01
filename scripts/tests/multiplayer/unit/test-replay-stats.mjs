/**
 * Tests for multiplayer replay stats capture.
 *
 * Verifies that:
 * 1. Stats are aggregated from all player-controlled pilots
 * 2. AI wingmen stats are NOT included in metadata.stats
 * 3. Individual pilot stats are preserved in debriefData
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildMultiplayerReplayData,
  MultiplayerInputRecorder,
} from '../../../../src/replay/multiplayer-replay.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create mock debrief data with configurable pilot stats.
 */
function createDebriefData(pilots) {
  return {
    missionDuration: 120,
    pilots: pilots.map((p) => ({
      callsign: p.callsign,
      archetype: p.archetype || 'fighter',
      isPlayer: p.isPlayer ?? true,
      isKIA: p.isKIA ?? false,
      kills: p.kills ?? 0,
      assists: p.assists ?? 0,
      damageDealt: p.damageDealt ?? 0,
      damageReceived: p.damageReceived ?? 0,
      hullRemaining: p.hullRemaining ?? 100,
      hullMax: p.hullMax ?? 100,
      timeOfDeath: p.timeOfDeath,
      campaignShipId: p.campaignShipId,
      weaponStats: p.weaponStats ?? [],
    })),
  };
}

/**
 * Create a basic recorder with players added.
 */
function createRecorderWithPlayers(playerIds) {
  const recorder = new MultiplayerInputRecorder(42, 'test-mission');
  for (const id of playerIds) {
    recorder.addPlayer(id);
  }
  // Simulate a few ticks
  for (let i = 0; i < 10; i++) {
    const inputs = new Map();
    for (const id of playerIds) {
      inputs.set(id, i);
    }
    recorder.recordInputs(inputs);
  }
  return recorder;
}

/**
 * Create basic metadata for testing.
 */
function createMetadata(stats = { kills: 0, damageDealt: 0, damageTaken: 0 }) {
  return {
    missionId: 'test',
    missionName: 'Test Mission',
    sector: 1,
    shipType: 'fighter',
    outcome: 'victory',
    durationTicks: 10,
    recordedAt: Date.now(),
    gameVersion: '1.0.0',
    stats,
  };
}

/**
 * Create player infos array from simple config.
 * @param {Array<{id: string, callsign: string, shipClass?: string}>} configs
 */
function createPlayerInfos(configs) {
  return configs.map((c, i) => ({
    playerId: c.id,
    callsign: c.callsign,
    shipEntityId: i + 1,
    campaignShipId: `ship-${i + 1}`,
    isHost: i === 0,
    loadout: {
      shipClass: c.shipClass || 'fighter',
      primaryWeapons: [],
      secondaryWeapons: [],
    },
  }));
}

// =============================================================================
// Stats Aggregation Tests
// =============================================================================

describe('Multiplayer Replay Stats', () => {
  it('aggregates stats from all player-controlled pilots', () => {
    const recorder = createRecorderWithPlayers(['host', 'guest']);
    const playerInfos = createPlayerInfos([
      { id: 'host', callsign: 'Commander' },
      { id: 'guest', callsign: 'Wingman', shipClass: 'interceptor' },
    ]);

    // Stats: host has 5 kills, 1000 damage dealt, 500 taken
    //        guest has 3 kills, 800 damage dealt, 300 taken
    // Total: 8 kills, 1800 damage dealt, 800 taken
    const metadata = createMetadata({
      kills: 8,
      damageDealt: 1800,
      damageTaken: 800,
    });

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'host',
      metadata,
      playerInfos[0].loadout,
      [],
      0,
    );

    // Verify aggregated stats are in metadata
    assert.strictEqual(replayData.metadata.stats.kills, 8);
    assert.strictEqual(replayData.metadata.stats.damageDealt, 1800);
    assert.strictEqual(replayData.metadata.stats.damageTaken, 800);
  });

  it('preserves individual pilot stats in debrief data', () => {
    const recorder = createRecorderWithPlayers(['host', 'guest']);
    const playerInfos = createPlayerInfos([
      { id: 'host', callsign: 'Commander' },
      { id: 'guest', callsign: 'Wingman', shipClass: 'interceptor' },
    ]);

    const debriefData = createDebriefData([
      {
        callsign: 'Commander',
        campaignShipId: 'ship-1',
        kills: 5,
        damageDealt: 1000,
        damageReceived: 500,
      },
      {
        callsign: 'Wingman',
        campaignShipId: 'ship-2',
        kills: 3,
        damageDealt: 800,
        damageReceived: 300,
      },
    ]);

    const metadata = createMetadata({
      kills: 8,
      damageDealt: 1800,
      damageTaken: 800,
    });

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'host',
      metadata,
      playerInfos[0].loadout,
      [],
      0,
      debriefData,
    );

    // Verify individual pilot stats are preserved
    assert.strictEqual(replayData.debriefData.pilots.length, 2);

    const hostPilot = replayData.debriefData.pilots.find(
      (p) => p.callsign === 'Commander',
    );
    assert.strictEqual(hostPilot.kills, 5);
    assert.strictEqual(hostPilot.damageDealt, 1000);
    assert.strictEqual(hostPilot.damageReceived, 500);

    const guestPilot = replayData.debriefData.pilots.find(
      (p) => p.callsign === 'Wingman',
    );
    assert.strictEqual(guestPilot.kills, 3);
    assert.strictEqual(guestPilot.damageDealt, 800);
    assert.strictEqual(guestPilot.damageReceived, 300);
  });

  it('includes AI wingmen stats in debrief but not in metadata aggregation', () => {
    const recorder = createRecorderWithPlayers(['host']);
    // Only host is a player, AI wingman stats should be in debrief
    const playerInfos = createPlayerInfos([
      { id: 'host', callsign: 'Commander' },
    ]);

    // Debrief has both player and AI wingman
    const debriefData = createDebriefData([
      {
        callsign: 'Commander',
        campaignShipId: 'ship-1',
        kills: 5,
        damageDealt: 1000,
        damageReceived: 500,
        isPlayer: true,
      },
      {
        callsign: 'Alpha 2',
        campaignShipId: 'ship-ai-1',
        kills: 2,
        damageDealt: 400,
        damageReceived: 200,
        isPlayer: false, // AI wingman
      },
    ]);

    // Metadata stats should only include player stats (5 kills, 1000 dealt, 500 taken)
    // NOT the AI wingman stats
    const metadata = createMetadata({
      kills: 5,
      damageDealt: 1000,
      damageTaken: 500,
    });

    const aiWingmen = [
      {
        loadout: {
          shipClass: 'fighter',
          primaryWeapons: [],
          secondaryWeapons: [],
        },
        position: { x: 30, y: 0, z: -15 },
        pilotName: 'Alpha 2',
      },
    ];

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'host',
      metadata,
      playerInfos[0].loadout,
      aiWingmen,
      0,
      debriefData,
    );

    // Metadata stats should only have player stats
    assert.strictEqual(
      replayData.metadata.stats.kills,
      5,
      'Metadata kills should only include player kills',
    );
    assert.strictEqual(
      replayData.metadata.stats.damageDealt,
      1000,
      'Metadata damage should only include player damage',
    );

    // But debrief should have both pilot entries
    assert.strictEqual(
      replayData.debriefData.pilots.length,
      2,
      'Debrief should include all pilots',
    );

    const aiPilot = replayData.debriefData.pilots.find(
      (p) => p.callsign === 'Alpha 2',
    );
    assert.ok(aiPilot, 'AI wingman should be in debrief');
    assert.strictEqual(aiPilot.kills, 2);
    assert.strictEqual(aiPilot.damageDealt, 400);
  });

  it('handles 4-player session stats correctly', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4'];
    const recorder = createRecorderWithPlayers(playerIds);
    const playerInfos = createPlayerInfos([
      { id: 'p1', callsign: 'Player 1' },
      { id: 'p2', callsign: 'Player 2' },
      { id: 'p3', callsign: 'Player 3' },
      { id: 'p4', callsign: 'Player 4' },
    ]);

    // Each player has different stats
    // P1: 4 kills, 800 damage, 200 taken
    // P2: 3 kills, 600 damage, 400 taken
    // P3: 2 kills, 400 damage, 300 taken
    // P4: 1 kill, 200 damage, 100 taken
    // Total: 10 kills, 2000 damage dealt, 1000 taken
    const debriefData = createDebriefData([
      {
        callsign: 'Player 1',
        campaignShipId: 'ship-1',
        kills: 4,
        damageDealt: 800,
        damageReceived: 200,
      },
      {
        callsign: 'Player 2',
        campaignShipId: 'ship-2',
        kills: 3,
        damageDealt: 600,
        damageReceived: 400,
      },
      {
        callsign: 'Player 3',
        campaignShipId: 'ship-3',
        kills: 2,
        damageDealt: 400,
        damageReceived: 300,
      },
      {
        callsign: 'Player 4',
        campaignShipId: 'ship-4',
        kills: 1,
        damageDealt: 200,
        damageReceived: 100,
      },
    ]);

    const metadata = createMetadata({
      kills: 10,
      damageDealt: 2000,
      damageTaken: 1000,
    });

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'p1',
      metadata,
      playerInfos[0].loadout,
      [],
      0,
      debriefData,
    );

    // Verify aggregated stats
    assert.strictEqual(replayData.metadata.stats.kills, 10);
    assert.strictEqual(replayData.metadata.stats.damageDealt, 2000);
    assert.strictEqual(replayData.metadata.stats.damageTaken, 1000);

    // Verify all 4 pilots are in debrief
    assert.strictEqual(replayData.debriefData.pilots.length, 4);
  });

  it('handles zero stats correctly', () => {
    const recorder = createRecorderWithPlayers(['host']);
    const playerInfos = createPlayerInfos([
      { id: 'host', callsign: 'Commander' },
    ]);

    // Player got no kills, dealt no damage
    const debriefData = createDebriefData([
      {
        callsign: 'Commander',
        campaignShipId: 'ship-1',
        kills: 0,
        damageDealt: 0,
        damageReceived: 150,
      },
    ]);

    const metadata = createMetadata({
      kills: 0,
      damageDealt: 0,
      damageTaken: 150,
    });

    const replayData = buildMultiplayerReplayData(
      recorder,
      playerInfos,
      'host',
      metadata,
      playerInfos[0].loadout,
      [],
      0,
      debriefData,
    );

    assert.strictEqual(replayData.metadata.stats.kills, 0);
    assert.strictEqual(replayData.metadata.stats.damageDealt, 0);
    assert.strictEqual(replayData.metadata.stats.damageTaken, 150);
  });
});
