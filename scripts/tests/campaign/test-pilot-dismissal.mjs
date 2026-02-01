/**
 * Tests for pilot dismissal functionality.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { dismissPilot } from '../../../src/campaign/pilot-assignment.ts';
import { createSlotArray } from '../../../src/campaign/slot-array.ts';

/** Create a minimal test state for dismissal tests */
function createTestState() {
  return {
    commanderId: 'commander',
    pilots: [
      {
        id: 'commander',
        name: 'Commander',
        shipSkills: {},
        kills: 0,
        assists: 0,
        missionsFlown: 0,
        missionsWon: 0,
        damageDealt: 0,
        damageReceived: 0,
        ejectionCount: 0,
        injuredMissionsLeft: 0,
        xp: 0,
      },
      {
        id: 'pilot-1',
        name: 'Alpha',
        shipSkills: { fighter: 'regular' },
        kills: 5,
        assists: 3,
        missionsFlown: 10,
        missionsWon: 8,
        damageDealt: 1000,
        damageReceived: 500,
        ejectionCount: 1,
        injuredMissionsLeft: 0,
        xp: 100,
      },
      {
        id: 'pilot-2',
        name: 'Beta',
        shipSkills: { bomber: 'veteran' },
        kills: 3,
        assists: 2,
        missionsFlown: 5,
        missionsWon: 4,
        damageDealt: 500,
        damageReceived: 200,
        ejectionCount: 0,
        injuredMissionsLeft: 0,
        xp: 50,
      },
    ],
    ships: [
      {
        id: 'ship-1',
        shipClass: 'Interceptor',
        pilot: {
          id: 'pilot-1',
          name: 'Alpha',
          shipSkills: { fighter: 'regular' },
        },
        // Use proper SlotArrays for weapon slots (array of nulls)
        primaryWeapons: createSlotArray([null, null]),
        secondaryWeapons: createSlotArray([null, null]),
      },
      {
        id: 'ship-2',
        shipClass: 'Bomber',
        pilot: null,
        primaryWeapons: createSlotArray([null, null]),
        secondaryWeapons: createSlotArray([null, null]),
      },
    ],
    storedShips: [],
    storedWeapons: [],
    storedAmmo: {},
  };
}

describe('Pilot Dismissal', () => {
  describe('dismissPilot', () => {
    it('removes pilot from roster', () => {
      const state = createTestState();
      const updated = dismissPilot(state, 'pilot-2');

      assert.ok(!updated.pilots.find((p) => p.id === 'pilot-2'));
      assert.strictEqual(updated.pilots.length, 2);
    });

    it('auto-unassigns from ship before removing', () => {
      const state = createTestState();
      const updated = dismissPilot(state, 'pilot-1');

      // Pilot removed
      assert.ok(!updated.pilots.find((p) => p.id === 'pilot-1'));
      assert.strictEqual(updated.pilots.length, 2);

      // Ship should be moved to stored ships (unassigned)
      assert.strictEqual(
        updated.ships.length,
        1,
        'One ship should remain active',
      );
      assert.strictEqual(
        updated.storedShips.length,
        1,
        'One ship should be stored',
      );
      assert.strictEqual(updated.storedShips[0].shipClass, 'Interceptor');
    });

    it('cannot dismiss commander', () => {
      const state = createTestState();
      assert.throws(() => dismissPilot(state, 'commander'), {
        message: 'Cannot dismiss commander',
      });
    });

    it('returns unchanged state for non-existent pilot', () => {
      const state = createTestState();
      const updated = dismissPilot(state, 'non-existent');

      // No change to pilot count
      assert.strictEqual(updated.pilots.length, state.pilots.length);
      assert.strictEqual(updated, state); // Same reference = no change
    });

    it('preserves other pilots when dismissing one', () => {
      const state = createTestState();
      const updated = dismissPilot(state, 'pilot-2');

      // Commander and pilot-1 should remain
      assert.ok(updated.pilots.find((p) => p.id === 'commander'));
      assert.ok(updated.pilots.find((p) => p.id === 'pilot-1'));
    });

    it('preserves ship assignments for other pilots', () => {
      const state = createTestState();
      const updated = dismissPilot(state, 'pilot-2');

      // pilot-1's ship should still be assigned
      const ship1 = updated.ships.find((s) => s.id === 'ship-1');
      assert.ok(ship1);
      assert.strictEqual(ship1.pilot?.id, 'pilot-1');
    });
  });
});
