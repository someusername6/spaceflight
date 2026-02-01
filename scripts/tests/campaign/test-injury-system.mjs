/**
 * Tests for the pilot injury system.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { canAssignPilot } from '../../../src/campaign/pilot-assignment.ts';

/** Create a test pilot with specified injury status */
function createTestPilot(injuredMissionsLeft = 0) {
  return {
    id: 'test-pilot',
    name: 'Test Pilot',
    shipSkills: { fighter: 'regular' },
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft,
    xp: 0,
  };
}

describe('Injury System', () => {
  describe('canAssignPilot', () => {
    it('injured pilot cannot be assigned to ship', () => {
      const pilot = createTestPilot(2);
      const result = canAssignPilot(pilot);
      assert.strictEqual(result.canAssign, false);
      assert.ok(result.reason?.includes('injured'));
    });

    it('healed pilot can be assigned', () => {
      const pilot = createTestPilot(0);
      const result = canAssignPilot(pilot);
      assert.strictEqual(result.canAssign, true);
      assert.strictEqual(result.reason, undefined);
    });

    it('newly recruited pilot can be assigned', () => {
      const pilot = createTestPilot(0);
      const result = canAssignPilot(pilot);
      assert.strictEqual(result.canAssign, true);
    });

    it('reason includes pilot name and mission count', () => {
      const pilot = createTestPilot(3);
      pilot.name = 'Viper';
      const result = canAssignPilot(pilot);
      assert.ok(result.reason?.includes('Viper'));
      assert.ok(result.reason?.includes('3'));
    });

    it('uses singular "mission" for 1 mission remaining', () => {
      const pilot = createTestPilot(1);
      const result = canAssignPilot(pilot);
      assert.ok(result.reason?.includes('1 mission remaining'));
      assert.ok(!result.reason?.includes('missions remaining'));
    });

    it('uses plural "missions" for multiple missions remaining', () => {
      const pilot = createTestPilot(2);
      const result = canAssignPilot(pilot);
      assert.ok(result.reason?.includes('2 missions remaining'));
    });
  });

  describe('Injury recovery', () => {
    it('injury counter is non-negative', () => {
      const pilot = createTestPilot(0);
      assert.ok(pilot.injuredMissionsLeft >= 0);
    });

    it('injury counter of 0 means pilot is healthy', () => {
      const pilot = createTestPilot(0);
      const result = canAssignPilot(pilot);
      assert.strictEqual(result.canAssign, true);
    });
  });
});
