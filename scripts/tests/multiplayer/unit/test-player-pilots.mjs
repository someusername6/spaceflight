/**
 * Tests for multiplayer player pilot handling.
 *
 * Player pilots are temporary pilots created for guest players in multiplayer.
 * They have special rules:
 * - Can fly any ship while human-controlled (empty shipSkills)
 * - Don't earn XP
 * - Don't pay salary
 * - Always "safe" on ejection (no injury/KIA rolls)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  canFlyShip,
  getShipSkill,
} from '../../../../src/campaign/pilot-skills.ts';
import { calculateMissionSalaries } from '../../../../src/campaign/state-mission.ts';
import {
  convertPlayerPilotToAI,
  createPlayerPilot,
  isHumanControlled,
  isPlayerPilot,
} from '../../../../src/multiplayer/ship-assignment.ts';

const COMMANDER_ID = 'commander';

/** Create a minimal test pilot */
function createTestPilot(id, shipSkills = {}, xp = 0) {
  return {
    id,
    name: id.startsWith('mp-pilot-') ? 'Guest' : 'Test Pilot',
    shipSkills,
    xp,
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
  };
}

/** Create a minimal test state */
function createTestState(ships = [], pilots = []) {
  return {
    commanderId: COMMANDER_ID,
    ships,
    pilots,
    seed: 12345,
    missionCount: 1,
  };
}

describe('Player Pilot Creation', () => {
  it('creates player pilot with correct ID prefix', () => {
    const pilot = createPlayerPilot('player-123', 'TestPlayer');

    assert.strictEqual(pilot.id, 'mp-pilot-player-123');
    assert.strictEqual(pilot.name, 'TestPlayer');
  });

  it('creates player pilot with empty shipSkills', () => {
    const pilot = createPlayerPilot('player-456', 'Guest');

    assert.deepStrictEqual(pilot.shipSkills, {});
    assert.strictEqual(pilot.xp, 0);
  });

  it('creates player pilot with zero stats', () => {
    const pilot = createPlayerPilot('player-789', 'NewPlayer');

    assert.strictEqual(pilot.kills, 0);
    assert.strictEqual(pilot.assists, 0);
    assert.strictEqual(pilot.missionsFlown, 0);
    assert.strictEqual(pilot.ejectionCount, 0);
  });
});

describe('Player Pilot Identification', () => {
  it('identifies player pilots by ID prefix', () => {
    const playerPilot = createTestPilot('mp-pilot-123');
    const rosterPilot = createTestPilot('pilot-1', { fighter: 'veteran' });

    assert.strictEqual(isPlayerPilot(playerPilot), true);
    assert.strictEqual(isPlayerPilot(rosterPilot), false);
  });

  it('identifies human-controlled player pilots by empty shipSkills', () => {
    const humanControlled = createTestPilot('mp-pilot-123', {});
    const aiConverted = createTestPilot('mp-pilot-123', { fighter: 'regular' });
    const rosterPilot = createTestPilot('pilot-1', {});

    assert.strictEqual(isHumanControlled(humanControlled), true);
    assert.strictEqual(isHumanControlled(aiConverted), false);
    // Roster pilots with empty skills are NOT player pilots
    assert.strictEqual(isHumanControlled(rosterPilot), false);
  });

  it('distinguishes player pilot from commander', () => {
    const playerPilot = createTestPilot('mp-pilot-commander');
    const commander = createTestPilot(COMMANDER_ID);

    assert.strictEqual(isPlayerPilot(playerPilot), true);
    assert.strictEqual(isPlayerPilot(commander), false);
  });
});

describe('Player Pilot Ship Flying', () => {
  it('human-controlled player pilots can fly any ship', () => {
    const pilot = createTestPilot('mp-pilot-123', {});

    assert.strictEqual(canFlyShip(pilot, 'fighter'), true);
    assert.strictEqual(canFlyShip(pilot, 'bomber'), true);
    assert.strictEqual(canFlyShip(pilot, 'interceptor'), true);
    assert.strictEqual(canFlyShip(pilot, 'striker'), true);
    assert.strictEqual(canFlyShip(pilot, 'defender'), true);
  });

  it('AI-converted player pilots need training', () => {
    const pilot = createTestPilot('mp-pilot-123', { fighter: 'regular' });

    assert.strictEqual(canFlyShip(pilot, 'fighter'), true);
    assert.strictEqual(canFlyShip(pilot, 'bomber'), false);
    assert.strictEqual(canFlyShip(pilot, 'interceptor'), false);
  });

  it('regular roster pilots need training', () => {
    const pilot = createTestPilot('pilot-1', {
      fighter: 'veteran',
      bomber: 'rookie',
    });

    assert.strictEqual(canFlyShip(pilot, 'fighter'), true);
    assert.strictEqual(canFlyShip(pilot, 'bomber'), true);
    assert.strictEqual(canFlyShip(pilot, 'interceptor'), false);
  });
});

describe('Player Pilot Skill Display', () => {
  it('human-controlled player pilot returns ace skill level', () => {
    const pilot = createTestPilot('mp-pilot-123', {});

    // Human-controlled players are treated as ace for AI purposes
    const skill = getShipSkill(pilot, 'fighter', COMMANDER_ID);
    assert.strictEqual(skill, 'ace');
  });

  it('AI-converted player pilot uses shipSkills', () => {
    const pilot = createTestPilot('mp-pilot-123', { fighter: 'regular' });

    assert.strictEqual(getShipSkill(pilot, 'fighter', COMMANDER_ID), 'regular');
    assert.strictEqual(getShipSkill(pilot, 'bomber', COMMANDER_ID), null);
  });

  it('commander always returns ace', () => {
    const commander = createTestPilot(COMMANDER_ID, {});

    assert.strictEqual(getShipSkill(commander, 'fighter', COMMANDER_ID), 'ace');
    assert.strictEqual(getShipSkill(commander, 'bomber', COMMANDER_ID), 'ace');
  });
});

describe('Player Pilot AI Conversion', () => {
  it('converts player pilot to AI with correct skill', () => {
    const playerPilot = createTestPilot('mp-pilot-player-123', {});
    const state = createTestState(
      [{ id: 'ship-1', shipClass: 'bomber', pilot: playerPilot }],
      [playerPilot],
    );

    const updated = convertPlayerPilotToAI(state, 'player-123', 'veteran');
    const pilot = updated.pilots.find((p) => p.id === 'mp-pilot-player-123');

    assert.strictEqual(pilot.shipSkills.bomber, 'veteran');
    assert.strictEqual(isHumanControlled(pilot), false);
  });

  it('conversion also updates denormalized ship pilot', () => {
    const playerPilot = createTestPilot('mp-pilot-player-456', {});
    const state = createTestState(
      [{ id: 'ship-2', shipClass: 'interceptor', pilot: playerPilot }],
      [playerPilot],
    );

    const updated = convertPlayerPilotToAI(state, 'player-456', 'ace');
    const ship = updated.ships.find((s) => s.id === 'ship-2');

    assert.strictEqual(ship.pilot.shipSkills.interceptor, 'ace');
  });

  it('does nothing if player not found', () => {
    const state = createTestState([], []);
    const updated = convertPlayerPilotToAI(state, 'nonexistent', 'regular');

    assert.strictEqual(updated, state);
  });
});

describe('Player Pilot Salary Exclusion', () => {
  it('player pilots do not pay salary', () => {
    const playerPilot = createTestPilot('mp-pilot-guest', {});
    const rosterPilot = createTestPilot('pilot-1', { fighter: 'veteran' });
    const commander = createTestPilot(COMMANDER_ID, {});

    const state = createTestState(
      [
        { id: 'ship-1', shipClass: 'fighter', pilot: playerPilot },
        { id: 'ship-2', shipClass: 'fighter', pilot: rosterPilot },
        { id: 'ship-3', shipClass: 'fighter', pilot: commander },
      ],
      [playerPilot, rosterPilot, commander],
    );

    const salaries = calculateMissionSalaries(state, []);

    // Only roster pilot pays salary
    assert.strictEqual(salaries.breakdown.length, 1);
    assert.strictEqual(salaries.breakdown[0].name, 'Test Pilot');
    assert.strictEqual(salaries.total, 200); // veteran salary
  });

  it('AI-converted player pilots still do not pay salary', () => {
    // Even after conversion to AI, player pilots don't pay salary
    // (they're still identified by their ID prefix)
    const convertedPilot = createTestPilot('mp-pilot-guest', {
      fighter: 'veteran',
    });

    const state = createTestState(
      [{ id: 'ship-1', shipClass: 'fighter', pilot: convertedPilot }],
      [convertedPilot],
    );

    const salaries = calculateMissionSalaries(state, []);

    assert.strictEqual(salaries.breakdown.length, 0);
    assert.strictEqual(salaries.total, 0);
  });

  it('destroyed ships do not pay salary', () => {
    const rosterPilot = createTestPilot('pilot-1', { fighter: 'veteran' });

    const state = createTestState(
      [{ id: 'ship-1', shipClass: 'fighter', pilot: rosterPilot }],
      [rosterPilot],
    );

    const salaries = calculateMissionSalaries(state, ['ship-1']);

    assert.strictEqual(salaries.breakdown.length, 0);
    assert.strictEqual(salaries.total, 0);
  });
});
