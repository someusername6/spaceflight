/**
 * Ship Assignment Unit Tests
 *
 * Tests for multiplayer ship assignment logic.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assignPlayerToShip,
  convertPlayerPilotToAI,
  createPlayerPilot,
  getAvailableShipsForAssignment,
  getCommanderShipId,
  getPlayerIdFromPilot,
  getPlayerShip,
  getShipDisplayName,
  isCommanderShip,
  isPlayerPilot,
  removePlayerPilot,
  unassignPlayer,
} from '../../../src/multiplayer/ship-assignment.ts';
import {
  createTestCampaignState,
  createTestPilot,
  createTestShip,
} from './test-ship-assignment-helpers.mjs';

// =============================================================================
// Tests
// =============================================================================

describe('Ship Assignment', () => {
  describe('createPlayerPilot', () => {
    it('creates pilot with player skill', () => {
      const pilot = createPlayerPilot('peer123', 'TestPlayer');

      assert.strictEqual(pilot.id, 'mp-pilot-peer123');
      assert.strictEqual(pilot.name, 'TestPlayer');
      assert.strictEqual(pilot.skill, 'player');
      assert.strictEqual(pilot.kills, 0);
      assert.strictEqual(pilot.missionsFlown, 0);
    });

    it('uses callsign as pilot name', () => {
      const pilot = createPlayerPilot('abc', 'MyCallsign');
      assert.strictEqual(pilot.name, 'MyCallsign');
    });
  });

  describe('isPlayerPilot', () => {
    it('returns true for player pilots', () => {
      const pilot = createPlayerPilot('test', 'Test');
      assert.strictEqual(isPlayerPilot(pilot), true);
    });

    it('returns false for AI pilots', () => {
      const pilot = createTestPilot('ai1', 'AI Pilot', 'regular');
      assert.strictEqual(isPlayerPilot(pilot), false);
    });
  });

  describe('getPlayerIdFromPilot', () => {
    it('extracts player ID from player pilot', () => {
      const pilot = createPlayerPilot('peer-abc-123', 'Test');
      assert.strictEqual(getPlayerIdFromPilot(pilot), 'peer-abc-123');
    });

    it('returns null for non-player pilots', () => {
      const pilot = createTestPilot('regular-pilot', 'AI', 'regular');
      assert.strictEqual(getPlayerIdFromPilot(pilot), null);
    });
  });

  describe('assignPlayerToShip', () => {
    it('assigns player to unassigned ship', () => {
      const state = createTestCampaignState();
      const result = assignPlayerToShip(
        state,
        'player1',
        'Player One',
        'ship3',
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.newState);

      // Check ship has player pilot
      const ship = result.newState.ships.find((s) => s.id === 'ship3');
      assert.ok(ship.pilot);
      assert.strictEqual(ship.pilot.id, 'mp-pilot-player1');
      assert.strictEqual(ship.pilot.name, 'Player One');
      assert.strictEqual(ship.pilot.skill, 'player');

      // Check pilot added to roster
      const pilot = result.newState.pilots.find(
        (p) => p.id === 'mp-pilot-player1',
      );
      assert.ok(pilot);
    });

    it('creates player pilot if not exists', () => {
      const state = createTestCampaignState();
      const result = assignPlayerToShip(
        state,
        'newplayer',
        'New Player',
        'ship3',
      );

      assert.strictEqual(result.success, true);

      // Check pilot was created and added to roster
      const pilot = result.newState.pilots.find(
        (p) => p.id === 'mp-pilot-newplayer',
      );
      assert.ok(pilot);
      assert.strictEqual(pilot.name, 'New Player');
    });

    it('updates callsign if pilot already exists', () => {
      let state = createTestCampaignState();

      // First assignment
      let result = assignPlayerToShip(state, 'player1', 'OldName', 'ship3');
      assert.strictEqual(result.success, true);
      state = result.newState;

      // Unassign
      state = unassignPlayer(state, 'player1');

      // Re-assign with new callsign (to ship2 after removing wingman)
      state = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship2' ? { ...s, pilot: null } : s,
        ),
      };
      result = assignPlayerToShip(state, 'player1', 'NewName', 'ship2');

      assert.strictEqual(result.success, true);
      const pilot = result.newState.pilots.find(
        (p) => p.id === 'mp-pilot-player1',
      );
      assert.strictEqual(pilot.name, 'NewName');
    });

    it('returns error if ship not found', () => {
      const state = createTestCampaignState();
      const result = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'nonexistent',
      );

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('Ship not found'));
    });

    it('unassigns from previous ship when reassigning', () => {
      let state = createTestCampaignState();

      // Assign to ship3
      let result = assignPlayerToShip(state, 'player1', 'Test', 'ship3');
      state = result.newState;

      // Also clear ship2's pilot for this test
      state = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship2' ? { ...s, pilot: null } : s,
        ),
      };

      // Reassign to ship2
      result = assignPlayerToShip(state, 'player1', 'Test', 'ship2');

      assert.strictEqual(result.success, true);

      // Check old ship is unassigned
      const ship3 = result.newState.ships.find((s) => s.id === 'ship3');
      assert.strictEqual(ship3.pilot, null);

      // Check new ship has pilot
      const ship2 = result.newState.ships.find((s) => s.id === 'ship2');
      assert.ok(ship2.pilot);
      assert.strictEqual(ship2.pilot.id, 'mp-pilot-player1');
    });
  });

  describe('unassignPlayer', () => {
    it('removes player from their ship', () => {
      let state = createTestCampaignState();

      // Assign player first
      const assignResult = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'ship3',
      );
      state = assignResult.newState;

      // Unassign
      state = unassignPlayer(state, 'player1');

      // Check ship is unassigned
      const ship = state.ships.find((s) => s.id === 'ship3');
      assert.strictEqual(ship.pilot, null);

      // Check pilot still exists in roster
      const pilot = state.pilots.find((p) => p.id === 'mp-pilot-player1');
      assert.ok(pilot);
    });

    it('does nothing if player not assigned', () => {
      const state = createTestCampaignState();
      const newState = unassignPlayer(state, 'nonexistent');

      // State should be unchanged (ships still have their pilots)
      assert.strictEqual(newState.ships[0].pilot.id, 'commander');
      assert.strictEqual(newState.ships[1].pilot.id, 'wingman1');
    });
  });

  describe('removePlayerPilot', () => {
    it('removes pilot from roster and unassigns from ship', () => {
      let state = createTestCampaignState();

      // Assign player first
      const assignResult = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'ship3',
      );
      state = assignResult.newState;

      // Remove player pilot
      state = removePlayerPilot(state, 'player1');

      // Check pilot removed from roster
      const pilot = state.pilots.find((p) => p.id === 'mp-pilot-player1');
      assert.strictEqual(pilot, undefined);

      // Check ship unassigned
      const ship = state.ships.find((s) => s.id === 'ship3');
      assert.strictEqual(ship.pilot, null);
    });
  });

  describe('convertPlayerPilotToAI', () => {
    it('changes player pilot skill to AI skill', () => {
      let state = createTestCampaignState();

      // Assign player first
      const assignResult = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'ship3',
      );
      state = assignResult.newState;

      // Convert to AI
      state = convertPlayerPilotToAI(state, 'player1', 'regular');

      // Check pilot skill changed
      const pilot = state.pilots.find((p) => p.id === 'mp-pilot-player1');
      assert.strictEqual(pilot.skill, 'regular');

      // Check ship's pilot also updated
      const ship = state.ships.find((s) => s.id === 'ship3');
      assert.strictEqual(ship.pilot.skill, 'regular');
    });
  });

  describe('getAvailableShipsForAssignment', () => {
    it('returns ships not assigned to players', () => {
      const state = createTestCampaignState();
      const players = [{ playerId: 'host', shipId: null, callsign: 'Host' }];

      const available = getAvailableShipsForAssignment(state, players, 'host');

      // Should include ship3 (unassigned) and ship2 (has AI pilot, not player)
      // Should NOT include ship1 (commander ship)
      assert.ok(available.some((s) => s.id === 'ship3'));
      assert.ok(available.some((s) => s.id === 'ship2'));
      assert.ok(!available.some((s) => s.id === 'ship1'));
    });

    it('excludes ships already assigned to players', () => {
      let state = createTestCampaignState();

      // Assign player to ship3
      const assignResult = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'ship3',
      );
      state = assignResult.newState;

      const players = [
        { playerId: 'host', shipId: null, callsign: 'Host' },
        { playerId: 'player1', shipId: 'ship3', callsign: 'Test' },
      ];

      const available = getAvailableShipsForAssignment(state, players, 'host');

      // Should NOT include ship3 (assigned to player1)
      assert.ok(!available.some((s) => s.id === 'ship3'));
    });
  });

  describe('getPlayerShip', () => {
    it('returns ship assigned to player', () => {
      let state = createTestCampaignState();

      // Assign player
      const assignResult = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'ship3',
      );
      state = assignResult.newState;

      const ship = getPlayerShip(state, 'player1');
      assert.ok(ship);
      assert.strictEqual(ship.id, 'ship3');
    });

    it('returns null if player not assigned', () => {
      const state = createTestCampaignState();
      const ship = getPlayerShip(state, 'nonexistent');
      assert.strictEqual(ship, null);
    });
  });

  describe('getShipDisplayName', () => {
    it('capitalizes ship class', () => {
      const ship = createTestShip('test', 'interceptor');
      assert.strictEqual(getShipDisplayName(ship), 'Interceptor');
    });
  });

  describe('getCommanderShipId', () => {
    it('returns ID of commander ship', () => {
      const state = createTestCampaignState();
      const shipId = getCommanderShipId(state);
      assert.strictEqual(shipId, 'ship1');
    });

    it('returns null if no commander ship found', () => {
      const state = createTestCampaignState({
        ships: [createTestShip('ship1', 'fighter', null)],
      });
      const shipId = getCommanderShipId(state);
      assert.strictEqual(shipId, null);
    });
  });

  describe('isCommanderShip', () => {
    it('returns true for commander ship', () => {
      const state = createTestCampaignState();
      assert.strictEqual(isCommanderShip(state, 'ship1'), true);
    });

    it('returns false for non-commander ships', () => {
      const state = createTestCampaignState();
      assert.strictEqual(isCommanderShip(state, 'ship2'), false);
      assert.strictEqual(isCommanderShip(state, 'ship3'), false);
    });

    it('returns false for non-existent ship', () => {
      const state = createTestCampaignState();
      assert.strictEqual(isCommanderShip(state, 'nonexistent'), false);
    });
  });
});
