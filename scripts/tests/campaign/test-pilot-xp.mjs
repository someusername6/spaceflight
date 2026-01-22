/**
 * Tests for the pilot XP system - skill progression.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  applyXP,
  calculateMissionXP,
  getXPProgress,
  isMaxSkillLevel,
  XP_EJECTION_SURVIVAL,
  XP_MISSION_COMPLETE,
  XP_PER_ASSIST,
  XP_PER_KILL,
  XP_PER_LEVEL,
} from '../../../src/campaign/pilot-xp.ts';

/** Create a test pilot with specified skill and XP */
function createTestPilot(skill, xp = 0) {
  return {
    id: 'test-pilot',
    name: 'Test',
    skill,
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
    it('has correct XP per level', () => {
      assert.strictEqual(XP_PER_LEVEL, 100);
    });

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

  describe('isMaxSkillLevel', () => {
    it('returns false for rookie', () => {
      assert.strictEqual(isMaxSkillLevel(createTestPilot('rookie')), false);
    });

    it('returns false for ace', () => {
      assert.strictEqual(isMaxSkillLevel(createTestPilot('ace')), false);
    });

    it('returns true for elite', () => {
      assert.strictEqual(isMaxSkillLevel(createTestPilot('elite')), true);
    });
  });

  describe('applyXP', () => {
    it('adds XP without level up', () => {
      const pilot = createTestPilot('rookie', 0);
      const result = applyXP(pilot, 50);
      assert.strictEqual(result.xp, 50);
      assert.strictEqual(result.skill, 'rookie');
    });

    it('promotes skill level at 100 XP', () => {
      const pilot = createTestPilot('rookie', 0);
      const result = applyXP(pilot, 100);
      assert.strictEqual(result.xp, 0);
      assert.strictEqual(result.skill, 'regular');
    });

    it('carries over excess XP after promotion', () => {
      const pilot = createTestPilot('rookie', 50);
      const result = applyXP(pilot, 75); // 50 + 75 = 125 -> promote + 25 leftover
      assert.strictEqual(result.xp, 25);
      assert.strictEqual(result.skill, 'regular');
    });

    it('handles multiple promotions in one XP gain', () => {
      const pilot = createTestPilot('rookie', 0);
      const result = applyXP(pilot, 250); // Should go rookie -> regular -> veteran + 50
      assert.strictEqual(result.xp, 50);
      assert.strictEqual(result.skill, 'veteran');
    });

    it('follows correct skill progression', () => {
      let pilot = createTestPilot('rookie', 0);
      pilot = applyXP(pilot, 100);
      assert.strictEqual(pilot.skill, 'regular');
      pilot = applyXP(pilot, 100);
      assert.strictEqual(pilot.skill, 'veteran');
      pilot = applyXP(pilot, 100);
      assert.strictEqual(pilot.skill, 'ace');
      pilot = applyXP(pilot, 100);
      assert.strictEqual(pilot.skill, 'elite');
    });

    it('caps at elite with no more XP tracking', () => {
      const pilot = createTestPilot('ace', 50);
      const result = applyXP(pilot, 100); // 50 + 100 = 150 -> elite with 0 XP
      assert.strictEqual(result.skill, 'elite');
      assert.strictEqual(result.xp, 0);
    });

    it('does not modify elite pilots', () => {
      const pilot = createTestPilot('elite', 0);
      const result = applyXP(pilot, 100);
      assert.strictEqual(result.skill, 'elite');
      assert.strictEqual(result.xp, 0);
      assert.strictEqual(result, pilot); // Same object reference
    });

    it('returns same pilot for zero XP', () => {
      const pilot = createTestPilot('rookie', 50);
      const result = applyXP(pilot, 0);
      assert.strictEqual(result, pilot);
    });

    it('returns same pilot for negative XP', () => {
      const pilot = createTestPilot('rookie', 50);
      const result = applyXP(pilot, -10);
      assert.strictEqual(result, pilot);
    });
  });

  describe('getXPProgress', () => {
    it('returns 0 for no XP', () => {
      assert.strictEqual(getXPProgress(createTestPilot('rookie', 0)), 0);
    });

    it('returns correct percentage', () => {
      assert.strictEqual(getXPProgress(createTestPilot('rookie', 50)), 50);
      assert.strictEqual(getXPProgress(createTestPilot('rookie', 75)), 75);
    });

    it('returns 100 for elite pilots', () => {
      assert.strictEqual(getXPProgress(createTestPilot('elite', 0)), 100);
    });
  });

  describe('XP progression math', () => {
    it('levels up in ~5 missions with 2 kills average', () => {
      // Average mission: 10 (completion) + 10 (2 kills) + 2 (1 assist) = 22 XP
      // 100 XP / 22 XP per mission = ~4.5 missions
      const avgXPPerMission = calculateMissionXP(2, 1);
      const missionsToLevelUp = XP_PER_LEVEL / avgXPPerMission;
      assert.ok(
        missionsToLevelUp >= 4 && missionsToLevelUp <= 6,
        `Expected 4-6 missions to level up, got ${missionsToLevelUp.toFixed(1)}`,
      );
    });
  });
});
