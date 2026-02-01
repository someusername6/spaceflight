/**
 * Tests for pilot salary calculations.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getPilotSalary,
  PILOT_SALARIES,
} from '../../../src/campaign/pilot-skills.ts';
import { calculateMissionSalaries } from '../../../src/campaign/state-mission.ts';

describe('Pilot Salaries', () => {
  describe('PILOT_SALARIES constants', () => {
    it('has correct values for each skill level', () => {
      assert.strictEqual(PILOT_SALARIES.rookie, 50);
      assert.strictEqual(PILOT_SALARIES.regular, 100);
      assert.strictEqual(PILOT_SALARIES.veteran, 200);
      assert.strictEqual(PILOT_SALARIES.ace, 400);
      assert.strictEqual(PILOT_SALARIES.elite, 800);
    });

    it('salaries increase with skill level', () => {
      assert.ok(PILOT_SALARIES.rookie < PILOT_SALARIES.regular);
      assert.ok(PILOT_SALARIES.regular < PILOT_SALARIES.veteran);
      assert.ok(PILOT_SALARIES.veteran < PILOT_SALARIES.ace);
      assert.ok(PILOT_SALARIES.ace < PILOT_SALARIES.elite);
    });
  });

  describe('getPilotSalary', () => {
    it('returns correct salary based on ship skill', () => {
      const pilot = {
        id: 'pilot-1',
        name: 'Alpha',
        shipSkills: { fighter: 'veteran', bomber: 'rookie' },
      };

      // Should use fighter skill (veteran = 200)
      const fighterSalary = getPilotSalary(pilot, 'fighter', 'commander');
      assert.strictEqual(fighterSalary, PILOT_SALARIES.veteran);

      // Should use bomber skill (rookie = 50)
      const bomberSalary = getPilotSalary(pilot, 'bomber', 'commander');
      assert.strictEqual(bomberSalary, PILOT_SALARIES.rookie);
    });

    it('commander pays no salary', () => {
      const commander = {
        id: 'commander',
        name: 'Commander',
        shipSkills: { fighter: 'ace' },
      };

      const salary = getPilotSalary(commander, 'fighter', 'commander');
      assert.strictEqual(salary, 0);
    });

    it('returns 0 for unknown ship class', () => {
      const pilot = {
        id: 'pilot-1',
        name: 'Alpha',
        shipSkills: { fighter: 'regular' },
      };

      const salary = getPilotSalary(pilot, 'unknown-ship', 'commander');
      assert.strictEqual(salary, 0);
    });
  });

  describe('calculateMissionSalaries', () => {
    function createTestState() {
      return {
        commanderId: 'commander',
        ships: [
          {
            id: 'ship-commander',
            shipClass: 'fighter',
            pilot: {
              id: 'commander',
              name: 'Commander',
              shipSkills: {},
            },
          },
          {
            id: 'ship-1',
            shipClass: 'fighter',
            pilot: {
              id: 'pilot-1',
              name: 'Alpha',
              shipSkills: { fighter: 'veteran' },
            },
          },
          {
            id: 'ship-2',
            shipClass: 'bomber',
            pilot: {
              id: 'pilot-2',
              name: 'Beta',
              shipSkills: { bomber: 'regular' },
            },
          },
        ],
      };
    }

    it('excludes commander from salary calculation', () => {
      const state = createTestState();
      const result = calculateMissionSalaries(state, []);

      // Commander should not appear in breakdown
      const commanderEntry = result.breakdown.find(
        (s) => s.name === 'Commander',
      );
      assert.strictEqual(commanderEntry, undefined);
    });

    it('excludes ejected/dead pilots from salary', () => {
      const state = createTestState();

      // ship-2 was destroyed (pilot ejected)
      const result = calculateMissionSalaries(state, ['ship-2']);

      // Beta should not appear (ship destroyed)
      const betaEntry = result.breakdown.find((s) => s.name === 'Beta');
      assert.strictEqual(betaEntry, undefined);

      // Alpha should still appear
      const alphaEntry = result.breakdown.find((s) => s.name === 'Alpha');
      assert.ok(alphaEntry);
    });

    it('correctly calculates total salaries', () => {
      const state = createTestState();
      const result = calculateMissionSalaries(state, []);

      // Alpha: veteran = 200, Beta: regular = 100 = 300 total
      assert.strictEqual(result.total, 300);
    });

    it('returns correct breakdown entries', () => {
      const state = createTestState();
      const result = calculateMissionSalaries(state, []);

      assert.strictEqual(result.breakdown.length, 2);

      const alphaEntry = result.breakdown.find((s) => s.name === 'Alpha');
      assert.ok(alphaEntry);
      assert.strictEqual(alphaEntry.salary, PILOT_SALARIES.veteran);

      const betaEntry = result.breakdown.find((s) => s.name === 'Beta');
      assert.ok(betaEntry);
      assert.strictEqual(betaEntry.salary, PILOT_SALARIES.regular);
    });

    it('handles empty ships gracefully', () => {
      const state = {
        commanderId: 'commander',
        ships: [{ id: 'ship-1', shipClass: 'fighter', pilot: null }],
      };

      const result = calculateMissionSalaries(state, []);
      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.breakdown.length, 0);
    });

    it('handles all ships destroyed', () => {
      const state = createTestState();

      // All non-commander ships destroyed
      const result = calculateMissionSalaries(state, ['ship-1', 'ship-2']);

      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.breakdown.length, 0);
    });

    it('handles pilot without skill for current ship', () => {
      const state = {
        commanderId: 'commander',
        ships: [
          {
            id: 'ship-1',
            shipClass: 'fighter',
            pilot: {
              id: 'pilot-1',
              name: 'Alpha',
              shipSkills: { bomber: 'veteran' }, // No fighter skill
            },
          },
        ],
      };

      const result = calculateMissionSalaries(state, []);
      // No salary if pilot doesn't have skill for ship
      assert.strictEqual(result.total, 0);
    });
  });
});
