/**
 * Ship Assignment Query Tests
 *
 * Tests for ship query and utility functions.
 * Split from test-ship-assignment.mjs to stay under 400 line limit.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assignPlayerToShip,
  getAvailableShipsForAssignment,
  getCommanderShipId,
  getPlayerShip,
  getShipDisplayName,
  isCommanderShip,
} from '../../../../src/multiplayer/ship-assignment.ts';
import {
  createTestCampaignState,
  createTestShip,
} from './test-ship-assignment-helpers.mjs';

// =============================================================================
// Tests
// =============================================================================

describe('Ship Assignment Queries', () => {
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

    it('excludes ships with player pilots (uses campaign state)', () => {
      let state = createTestCampaignState();

      // Assign player to ship3 (creates player pilot in campaign state)
      const assignResult = assignPlayerToShip(
        state,
        'player1',
        'Test',
        'ship3',
      );
      state = assignResult.newState;

      // Pass empty players array to prove we check campaign state, not lobby
      const players = [];
      const available = getAvailableShipsForAssignment(state, players, 'host');

      // Should NOT include ship3 (has player pilot in campaign state)
      assert.ok(!available.some((s) => s.id === 'ship3'));
      // Should include ship2 (has AI pilot, not player pilot)
      assert.ok(available.some((s) => s.id === 'ship2'));
    });

    it('excludes commander ship', () => {
      const state = createTestCampaignState();
      const available = getAvailableShipsForAssignment(state, [], 'host');

      // Should NOT include ship1 (commander ship)
      const commanderShipId = getCommanderShipId(state);
      assert.ok(!available.some((s) => s.id === commanderShipId));
    });

    it('includes ships with AI pilots', () => {
      const state = createTestCampaignState();
      const available = getAvailableShipsForAssignment(state, [], 'host');

      // ship2 has an AI pilot (wingman1), should be available for assignment
      assert.ok(available.some((s) => s.id === 'ship2'));
    });

    it('includes unassigned ships', () => {
      const state = createTestCampaignState();
      const available = getAvailableShipsForAssignment(state, [], 'host');

      // ship3 has no pilot, should be available
      assert.ok(available.some((s) => s.id === 'ship3'));
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
