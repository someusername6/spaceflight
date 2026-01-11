/**
 * Wingman Death Persistence Tests - verifies ships and pilots are removed on death.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  applyMissionResults,
  createNewCampaign,
  getCommanderShip,
  getPilotById,
  getWingmanShips,
  isGameOver,
} from '../../../src/campaign/state.ts';

describe('Wingman Death Persistence', () => {
  describe('Initial State', () => {
    it('new campaign has 4 ships (commander + 3 wingmen)', () => {
      const state = createNewCampaign();
      assert.strictEqual(
        state.ships.length,
        4,
        `Expected 4 ships, got ${state.ships.length}`,
      );
    });

    it('new campaign has 4 pilots', () => {
      const state = createNewCampaign();
      assert.strictEqual(
        state.pilots.length,
        4,
        `Expected 4 pilots, got ${state.pilots.length}`,
      );
    });

    it('commander ship exists', () => {
      const state = createNewCampaign();
      const commanderShip = getCommanderShip(state);
      assert.ok(commanderShip !== undefined, 'Commander ship should exist');
    });

    it('three wingmen exist', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      assert.strictEqual(
        wingmen.length,
        3,
        `Expected 3 wingmen, got ${wingmen.length}`,
      );
    });
  });

  describe('Wingman Death', () => {
    it('removes ship from fleet when wingman dies', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const deadWingmanId = wingmen[0].id;

      const newState = applyMissionResults(
        state,
        true, // victory
        100, // credits
        [deadWingmanId], // ships lost
        new Map(),
      );

      assert.strictEqual(
        newState.ships.length,
        3,
        `Expected 3 ships, got ${newState.ships.length}`,
      );
      assert.ok(
        !newState.ships.find((s) => s.id === deadWingmanId),
        'Dead wingman should be removed from ships',
      );
    });

    it('removes pilot from roster when wingman dies', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const deadWingman = wingmen[0];
      const deadPilotId = deadWingman.pilot?.id;

      const newState = applyMissionResults(
        state,
        true,
        100,
        [deadWingman.id],
        new Map(),
      );

      assert.strictEqual(
        newState.pilots.length,
        3,
        `Expected 3 pilots, got ${newState.pilots.length}`,
      );
      assert.ok(
        !newState.pilots.find((p) => p.id === deadPilotId),
        'Dead pilot should be removed from roster',
      );
    });

    it('removes all ships and pilots when multiple wingmen die', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const deadShipIds = [wingmen[0].id, wingmen[1].id];

      const newState = applyMissionResults(
        state,
        true,
        100,
        deadShipIds,
        new Map(),
      );

      assert.strictEqual(
        newState.ships.length,
        2,
        `Expected 2 ships, got ${newState.ships.length}`,
      );
      assert.strictEqual(
        newState.pilots.length,
        2,
        `Expected 2 pilots, got ${newState.pilots.length}`,
      );
    });

    it('leaves only commander when all wingmen die', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const allWingmenIds = wingmen.map((w) => w.id);

      const newState = applyMissionResults(
        state,
        true,
        100,
        allWingmenIds,
        new Map(),
      );

      assert.strictEqual(
        newState.ships.length,
        1,
        `Expected 1 ship, got ${newState.ships.length}`,
      );
      assert.strictEqual(
        newState.pilots.length,
        1,
        `Expected 1 pilot, got ${newState.pilots.length}`,
      );
      assert.ok(
        getCommanderShip(newState) !== undefined,
        'Commander should still exist',
      );
    });
  });

  describe('Game Over', () => {
    it('triggers game over when commander dies', () => {
      const state = createNewCampaign();
      const commanderShip = getCommanderShip(state);

      const newState = applyMissionResults(
        state,
        false, // defeat
        0,
        [commanderShip.id], // commander lost
        new Map(),
      );

      assert.ok(
        isGameOver(newState),
        'Game should be over when commander dies',
      );
    });

    it('does not trigger game over when wingmen die but commander lives', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);

      const newState = applyMissionResults(
        state,
        true,
        100,
        [wingmen[0].id],
        new Map(),
      );

      assert.ok(
        !isGameOver(newState),
        'Game should not be over when only wingmen die',
      );
    });
  });

  describe('Surviving Pilot Stats', () => {
    it('updates mission stats for surviving pilots', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const survivor = wingmen[1];
      const deadWingmanId = wingmen[0].id;

      const newState = applyMissionResults(
        state,
        true,
        100,
        [deadWingmanId],
        new Map(),
      );

      const survivorPilot = getPilotById(newState, survivor.pilot.id);
      assert.ok(survivorPilot !== undefined, 'Survivor should exist');
      assert.strictEqual(
        survivorPilot.missionsFlown,
        1,
        `Expected 1 mission flown, got ${survivorPilot.missionsFlown}`,
      );
      assert.strictEqual(
        survivorPilot.missionsWon,
        1,
        `Expected 1 mission won, got ${survivorPilot.missionsWon}`,
      );
    });

    it('does not update stats for dead pilot', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const deadWingman = wingmen[0];
      const deadPilotId = deadWingman.pilot?.id;

      const newState = applyMissionResults(
        state,
        true,
        100,
        [deadWingman.id],
        new Map(),
      );

      const deadPilot = getPilotById(newState, deadPilotId);
      assert.strictEqual(
        deadPilot,
        undefined,
        'Dead pilot should not exist in roster',
      );
    });
  });

  describe('Credits', () => {
    it('awards credits on victory even with deaths', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const initialCredits = state.credits;

      const newState = applyMissionResults(
        state,
        true,
        200,
        [wingmen[0].id],
        new Map(),
      );

      assert.strictEqual(
        newState.credits,
        initialCredits + 200,
        `Expected ${initialCredits + 200} credits, got ${newState.credits}`,
      );
    });

    it('does not award credits on defeat', () => {
      const state = createNewCampaign();
      const wingmen = getWingmanShips(state);
      const initialCredits = state.credits;

      const newState = applyMissionResults(
        state,
        false,
        200,
        [wingmen[0].id],
        new Map(),
      );

      assert.strictEqual(
        newState.credits,
        initialCredits,
        `Expected ${initialCredits} credits, got ${newState.credits}`,
      );
    });
  });
});
