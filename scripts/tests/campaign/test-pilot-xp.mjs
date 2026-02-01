/**
 * Tests for the pilot XP system - XP earning (no auto-promotion).
 *
 * Note: The XP system has been updated. XP now accumulates without
 * auto-promotion. Pilots manually spend XP to upgrade skills.
 * See test-pilot-skills.mjs for skill upgrade tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  applyXP,
  calculateMissionXP,
  XP_EJECTION_SURVIVAL,
  XP_MISSION_COMPLETE,
  XP_PER_ASSIST,
  XP_PER_KILL,
} from '../../../src/campaign/pilot-xp.ts';

/** Create a test pilot with shipSkills and XP */
function createTestPilot(shipSkills, xp = 0) {
  return {
    id: 'test-pilot',
    name: 'Test',
    shipSkills,
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
    xp,
  };
}

describe('Pilot XP System', () => {
  describe('XP Constants', () => {
    it('has correct mission completion XP', () => {
      assert.strictEqual(XP_MISSION_COMPLETE, 10);
    });

    it('has correct kill XP', () => {
      assert.strictEqual(XP_PER_KILL, 5);
    });

    it('has correct assist XP', () => {
      assert.strictEqual(XP_PER_ASSIST, 2);
    });

    it('has correct ejection survival XP', () => {
      assert.strictEqual(XP_EJECTION_SURVIVAL, 10);
    });
  });

  describe('calculateMissionXP', () => {
    it('returns base XP for no kills/assists', () => {
      assert.strictEqual(calculateMissionXP(0, 0), XP_MISSION_COMPLETE);
    });

    it('adds kill XP', () => {
      assert.strictEqual(
        calculateMissionXP(2, 0),
        XP_MISSION_COMPLETE + 2 * XP_PER_KILL,
      );
    });

    it('adds assist XP', () => {
      assert.strictEqual(
        calculateMissionXP(0, 3),
        XP_MISSION_COMPLETE + 3 * XP_PER_ASSIST,
      );
    });

    it('combines kills and assists', () => {
      assert.strictEqual(
        calculateMissionXP(2, 1),
        XP_MISSION_COMPLETE + 2 * XP_PER_KILL + 1 * XP_PER_ASSIST,
      );
    });
  });

  describe('applyXP', () => {
    it('adds XP to pilot pool', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 0);
      const result = applyXP(pilot, 50);
      assert.strictEqual(result.xp, 50);
    });

    it('accumulates XP without auto-spending', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 0);
      const result = applyXP(pilot, 500);
      assert.strictEqual(result.xp, 500);
      // Skills unchanged - XP is spent manually now
      assert.strictEqual(result.shipSkills.fighter, 'rookie');
    });

    it('adds to existing XP', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 100);
      const result = applyXP(pilot, 50);
      assert.strictEqual(result.xp, 150);
    });

    it('returns same pilot for zero XP', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 50);
      const result = applyXP(pilot, 0);
      assert.strictEqual(result, pilot);
    });

    it('returns same pilot for negative XP', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 50);
      const result = applyXP(pilot, -10);
      assert.strictEqual(result, pilot);
    });
  });

  describe('XP earning math', () => {
    it('typical mission earns ~20 XP', () => {
      // Average mission: 10 (completion) + 10 (2 kills) + 2 (1 assist) = 22 XP
      const avgXPPerMission = calculateMissionXP(2, 1);
      assert.strictEqual(avgXPPerMission, 22);
    });

    it('unlock cost is ~1 mission of XP', () => {
      // Unlock new ship = 25 XP, typical mission = 22 XP
      const avgXPPerMission = calculateMissionXP(2, 1);
      assert.ok(avgXPPerMission >= 20 && avgXPPerMission <= 25);
    });
  });
});
