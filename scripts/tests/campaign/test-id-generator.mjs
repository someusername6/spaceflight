/**
 * Tests for campaign ID generator - pure ID generation functions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeMaxIdFromState,
  generateCampaignId,
} from '../../../src/campaign/id-generator.ts';

describe('ID Generator', () => {
  describe('generateCampaignId', () => {
    it('generates ID with prefix and increments counter', () => {
      const [id1, next1] = generateCampaignId(1, 'ship');
      assert.strictEqual(id1, 'ship_1', 'First ID is ship_1');
      assert.strictEqual(next1, 2, 'Next counter is 2');

      const [id2, next2] = generateCampaignId(next1, 'ship');
      assert.strictEqual(id2, 'ship_2', 'Second ID is ship_2');
      assert.strictEqual(next2, 3, 'Next counter is 3');
    });

    it('uses default prefix when not specified', () => {
      const [id, next] = generateCampaignId(42);
      assert.strictEqual(id, 'id_42', 'Default prefix is "id"');
      assert.strictEqual(next, 43, 'Counter increments');
    });

    it('works with different prefixes', () => {
      const [pilotId] = generateCampaignId(5, 'pilot');
      const [recruitId] = generateCampaignId(6, 'recruit');
      assert.strictEqual(pilotId, 'pilot_5', 'Pilot prefix works');
      assert.strictEqual(recruitId, 'recruit_6', 'Recruit prefix works');
    });

    it('handles large numbers', () => {
      const [id, next] = generateCampaignId(999999, 'ship');
      assert.strictEqual(id, 'ship_999999', 'Large numbers work');
      assert.strictEqual(next, 1000000, 'Large counter increments');
    });
  });

  describe('computeMaxIdFromState', () => {
    it('returns 0 for empty state', () => {
      const emptyState = {
        ships: [],
        pilots: [],
        storedShips: [],
        availableRecruits: [],
      };
      const maxEmpty = computeMaxIdFromState(emptyState);
      assert.strictEqual(maxEmpty, 0, 'Empty state returns 0');
    });

    it('finds max from ships', () => {
      const stateWithShips = {
        ships: [
          { id: 'ship_5', pilot: null },
          { id: 'ship_10', pilot: null },
          { id: 'ship_3', pilot: null },
        ],
        pilots: [],
        storedShips: [],
        availableRecruits: [],
      };
      const maxShips = computeMaxIdFromState(stateWithShips);
      assert.strictEqual(maxShips, 10, 'Finds max ship ID');
    });

    it('finds max from pilots', () => {
      const stateWithPilots = {
        ships: [{ id: 'ship_2', pilot: { id: 'pilot_15' } }],
        pilots: [{ id: 'pilot_15' }, { id: 'pilot_8' }, { id: 'pilot_20' }],
        storedShips: [],
        availableRecruits: [],
      };
      const maxPilots = computeMaxIdFromState(stateWithPilots);
      assert.strictEqual(maxPilots, 20, 'Finds max pilot ID');
    });

    it('finds max from stored ships', () => {
      const stateWithStored = {
        ships: [],
        pilots: [],
        storedShips: [{ id: 'ship_25' }, { id: 'ship_12' }],
        availableRecruits: [],
      };
      const maxStored = computeMaxIdFromState(stateWithStored);
      assert.strictEqual(maxStored, 25, 'Finds max stored ship ID');
    });

    it('finds max from recruits', () => {
      const stateWithRecruits = {
        ships: [],
        pilots: [],
        storedShips: [],
        availableRecruits: [{ id: 'recruit_30' }, { id: 'recruit_7' }],
      };
      const maxRecruits = computeMaxIdFromState(stateWithRecruits);
      assert.strictEqual(maxRecruits, 30, 'Finds max recruit ID');
    });

    it('finds overall max from mixed state', () => {
      const mixedState = {
        ships: [{ id: 'ship_5', pilot: { id: 'pilot_8' } }],
        pilots: [{ id: 'pilot_8' }],
        storedShips: [{ id: 'ship_12' }],
        availableRecruits: [{ id: 'recruit_50' }],
      };
      const maxMixed = computeMaxIdFromState(mixedState);
      assert.strictEqual(
        maxMixed,
        50,
        'Finds overall max across all entity types',
      );
    });

    it('ignores malformed IDs without underscore', () => {
      const malformedState = {
        ships: [
          { id: 'legacy-ship', pilot: null },
          { id: 'ship_5', pilot: null },
        ],
        pilots: [{ id: 'pilot_3' }],
        storedShips: [],
        availableRecruits: [],
      };
      const maxMalformed = computeMaxIdFromState(malformedState);
      assert.strictEqual(
        maxMalformed,
        5,
        'Ignores malformed IDs, finds valid max',
      );
    });

    it('ignores IDs with non-numeric suffix', () => {
      const nonNumericState = {
        ships: [
          { id: 'ship_abc', pilot: null },
          { id: 'ship_7', pilot: null },
        ],
        pilots: [],
        storedShips: [],
        availableRecruits: [],
      };
      const maxNonNumeric = computeMaxIdFromState(nonNumericState);
      assert.strictEqual(maxNonNumeric, 7, 'Ignores non-numeric suffixes');
    });

    it('handles very large ID numbers', () => {
      const largeIdState = {
        ships: [{ id: 'ship_1000000', pilot: null }],
        pilots: [],
        storedShips: [],
        availableRecruits: [],
      };
      const maxLarge = computeMaxIdFromState(largeIdState);
      assert.strictEqual(maxLarge, 1000000, 'Handles large ID numbers');
    });

    it('checks pilot ID within ship', () => {
      const shipWithPilotState = {
        ships: [{ id: 'ship_3', pilot: { id: 'pilot_100' } }],
        pilots: [],
        storedShips: [],
        availableRecruits: [],
      };
      const maxShipPilot = computeMaxIdFromState(shipWithPilotState);
      assert.strictEqual(maxShipPilot, 100, 'Checks pilot ID within ship');
    });
  });
});
