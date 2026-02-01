/**
 * Tests for pilot assignment validation - ship training requirements.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  assignPilotToShip,
  assignPilotToStoredShip,
  swapPilotToShip,
  swapPilotToStoredShip,
} from '../../../src/campaign/pilot-assignment.ts';
import { createSlotArray } from '../../../src/campaign/slot-array.ts';

/** Create a minimal campaign state for testing */
function createTestState() {
  return {
    commanderId: 'commander',
    credits: 10000,
    pilots: [
      {
        id: 'commander',
        name: 'Commander',
        shipSkills: {}, // Commander can fly anything
        xp: 0,
        kills: 0,
        assists: 0,
        missionsFlown: 0,
        missionsWon: 0,
        damageDealt: 0,
        damageReceived: 0,
        ejectionCount: 0,
        injuredMissionsLeft: 0,
      },
      {
        id: 'pilot-1',
        name: 'Alpha',
        shipSkills: { fighter: 'veteran' }, // Only trained on fighter
        xp: 50,
        kills: 5,
        assists: 2,
        missionsFlown: 10,
        missionsWon: 8,
        damageDealt: 1000,
        damageReceived: 500,
        ejectionCount: 0,
        injuredMissionsLeft: 0,
      },
      {
        id: 'pilot-2',
        name: 'Beta',
        shipSkills: { bomber: 'regular', fighter: 'rookie' }, // Multi-ship trained
        xp: 100,
        kills: 3,
        assists: 5,
        missionsFlown: 8,
        missionsWon: 6,
        damageDealt: 800,
        damageReceived: 600,
        ejectionCount: 1,
        injuredMissionsLeft: 0,
      },
    ],
    ships: [
      {
        id: 'ship-commander',
        shipClass: 'fighter',
        primaryWeapons: createSlotArray([null, null]),
        secondaryWeapons: createSlotArray([null]),
        pilot: {
          id: 'commander',
          name: 'Commander',
          shipSkills: {},
          xp: 0,
          kills: 0,
          assists: 0,
          missionsFlown: 0,
          missionsWon: 0,
          damageDealt: 0,
          damageReceived: 0,
          ejectionCount: 0,
          injuredMissionsLeft: 0,
        },
      },
      {
        id: 'ship-empty-fighter',
        shipClass: 'fighter',
        primaryWeapons: createSlotArray([null, null]),
        secondaryWeapons: createSlotArray([null]),
        pilot: null,
      },
      {
        id: 'ship-empty-bomber',
        shipClass: 'bomber',
        primaryWeapons: createSlotArray([null, null]),
        secondaryWeapons: createSlotArray([null, null]),
        pilot: null,
      },
    ],
    storedShips: [
      { id: 'stored-interceptor', shipClass: 'interceptor' },
      { id: 'stored-fighter', shipClass: 'fighter' },
    ],
    storedWeapons: [],
    storedAmmo: {},
    nextId: 100,
  };
}

describe('Pilot Assignment Validation', () => {
  describe('assignPilotToShip', () => {
    it('allows trained pilot to be assigned to matching ship class', () => {
      const state = createTestState();
      // Alpha is trained on fighter, assign to empty fighter
      const result = assignPilotToShip(state, 'pilot-1', 'ship-empty-fighter');
      const ship = result.ships.find((s) => s.id === 'ship-empty-fighter');
      assert.strictEqual(ship.pilot?.id, 'pilot-1');
    });

    it('prevents untrained pilot from being assigned to ship', () => {
      const state = createTestState();
      // Alpha is NOT trained on bomber, assign to empty bomber
      const result = assignPilotToShip(state, 'pilot-1', 'ship-empty-bomber');
      const ship = result.ships.find((s) => s.id === 'ship-empty-bomber');
      // Should remain null (assignment blocked)
      assert.strictEqual(ship.pilot, null);
    });

    it('allows multi-trained pilot to be assigned to either ship', () => {
      const state = createTestState();
      // Beta is trained on both bomber and fighter
      const result1 = assignPilotToShip(state, 'pilot-2', 'ship-empty-bomber');
      const bomberShip = result1.ships.find(
        (s) => s.id === 'ship-empty-bomber',
      );
      assert.strictEqual(bomberShip.pilot?.id, 'pilot-2');

      // Reset and try fighter
      const result2 = assignPilotToShip(state, 'pilot-2', 'ship-empty-fighter');
      const fighterShip = result2.ships.find(
        (s) => s.id === 'ship-empty-fighter',
      );
      assert.strictEqual(fighterShip.pilot?.id, 'pilot-2');
    });

    it('allows commander to be assigned to any ship class', () => {
      // First unassign commander from current ship
      const state = createTestState();
      // Manually set commander's current ship to have null pilot
      const stateWithUnassignedCommander = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship-commander' ? { ...s, pilot: null } : s,
        ),
      };

      // Commander has empty shipSkills but can fly any ship (bomber)
      const result = assignPilotToShip(
        stateWithUnassignedCommander,
        'commander',
        'ship-empty-bomber',
      );
      const ship = result.ships.find((s) => s.id === 'ship-empty-bomber');
      assert.strictEqual(ship.pilot?.id, 'commander');
    });
  });

  describe('assignPilotToStoredShip', () => {
    it('prevents untrained pilot from deploying with stored ship', () => {
      const state = createTestState();
      // Alpha is NOT trained on interceptor, try to deploy with stored interceptor
      const result = assignPilotToStoredShip(state, 'pilot-1', 0);
      // Should not create a new active ship (interceptor is at index 0)
      const hasInterceptor = result.ships.some(
        (s) => s.shipClass === 'interceptor',
      );
      assert.strictEqual(hasInterceptor, false);
    });

    it('allows trained pilot to deploy with stored ship', () => {
      const state = createTestState();
      // Alpha is trained on fighter, deploy with stored fighter (index 1)
      const result = assignPilotToStoredShip(state, 'pilot-1', 1);
      // Should create new active fighter ship
      const fighterShips = result.ships.filter(
        (s) => s.shipClass === 'fighter' && s.pilot?.id === 'pilot-1',
      );
      assert.strictEqual(fighterShips.length, 1);
    });

    it('allows commander to deploy with any stored ship', () => {
      const state = createTestState();
      // Manually unassign commander
      const stateWithUnassignedCommander = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship-commander' ? { ...s, pilot: null } : s,
        ),
        pilots: state.pilots.map((p) => (p.id === 'commander' ? { ...p } : p)),
      };

      // Commander can deploy with interceptor (index 0)
      const result = assignPilotToStoredShip(
        stateWithUnassignedCommander,
        'commander',
        0,
      );
      const hasCommanderInterceptor = result.ships.some(
        (s) => s.shipClass === 'interceptor' && s.pilot?.id === 'commander',
      );
      assert.strictEqual(hasCommanderInterceptor, true);
    });
  });

  describe('swapPilotToShip', () => {
    it('prevents untrained pilot from swapping to different ship class', () => {
      const state = createTestState();
      // First assign Alpha to fighter
      const stateWithAlpha = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship-empty-fighter'
            ? { ...s, pilot: state.pilots.find((p) => p.id === 'pilot-1') }
            : s,
        ),
      };

      // Try to swap Alpha to bomber (not trained)
      const result = swapPilotToShip(
        stateWithAlpha,
        'pilot-1',
        'ship-empty-bomber',
      );

      // Alpha should still be on fighter (swap blocked)
      const alphaShip = result.ships.find((s) => s.pilot?.id === 'pilot-1');
      assert.strictEqual(alphaShip?.shipClass, 'fighter');
    });

    it('allows trained pilot to swap to matching ship class', () => {
      const state = createTestState();
      // Assign Beta to bomber first
      const stateWithBeta = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship-empty-bomber'
            ? { ...s, pilot: state.pilots.find((p) => p.id === 'pilot-2') }
            : s,
        ),
      };

      // Beta is also trained on fighter, swap to fighter
      const result = swapPilotToShip(
        stateWithBeta,
        'pilot-2',
        'ship-empty-fighter',
      );

      // Beta should now be on fighter
      const betaShip = result.ships.find((s) => s.pilot?.id === 'pilot-2');
      assert.strictEqual(betaShip?.shipClass, 'fighter');
    });
  });

  describe('swapPilotToStoredShip', () => {
    it('prevents untrained pilot from swapping to stored ship', () => {
      const state = createTestState();
      // Assign Alpha to commander's fighter slot
      const stateWithAlpha = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship-commander'
            ? { ...s, pilot: state.pilots.find((p) => p.id === 'pilot-1') }
            : s,
        ),
      };

      // Try to swap Alpha to stored interceptor (not trained)
      const result = swapPilotToStoredShip(stateWithAlpha, 'ship-commander', 0);

      // Alpha should still be on fighter (swap blocked)
      const alphaShip = result.ships.find((s) => s.pilot?.id === 'pilot-1');
      assert.strictEqual(alphaShip?.shipClass, 'fighter');
    });

    it('allows trained pilot to swap to stored ship of matching class', () => {
      const state = createTestState();
      // Assign Alpha to commander's fighter slot
      const stateWithAlpha = {
        ...state,
        ships: state.ships.map((s) =>
          s.id === 'ship-commander'
            ? { ...s, pilot: state.pilots.find((p) => p.id === 'pilot-1') }
            : s,
        ),
      };

      // Swap Alpha to stored fighter (index 1)
      const result = swapPilotToStoredShip(stateWithAlpha, 'ship-commander', 1);

      // Alpha should now be on the stored fighter (now active)
      const alphaShip = result.ships.find((s) => s.pilot?.id === 'pilot-1');
      assert.strictEqual(alphaShip?.id, 'stored-fighter');
    });
  });
});
