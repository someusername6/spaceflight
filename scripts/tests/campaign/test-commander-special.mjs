/**
 * Tests for commander special handling.
 *
 * The commander is a special pilot who:
 * - Can fly any ship at ace level
 * - Doesn't earn XP
 * - Cannot be dismissed
 * - Cannot have skills upgraded
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  canFlyShip,
  getShipSkill,
  spendXPOnShip,
} from '../../../src/campaign/pilot-skills.ts';
import { applyXP } from '../../../src/campaign/pilot-xp.ts';

const COMMANDER_ID = 'commander';

/** Create a test pilot */
function createTestPilot(id, shipSkills = {}, xp = 0) {
  return {
    id,
    name: id === COMMANDER_ID ? 'Commander' : 'Test Pilot',
    shipSkills,
    xp,
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
  };
}

describe('Commander Special Handling', () => {
  describe('getShipSkill', () => {
    it('commander is always ace on any ship', () => {
      const commander = createTestPilot(COMMANDER_ID);

      assert.strictEqual(
        getShipSkill(commander, 'fighter', COMMANDER_ID),
        'ace',
      );
      assert.strictEqual(
        getShipSkill(commander, 'bomber', COMMANDER_ID),
        'ace',
      );
      assert.strictEqual(
        getShipSkill(commander, 'interceptor', COMMANDER_ID),
        'ace',
      );
      assert.strictEqual(
        getShipSkill(commander, 'anyship', COMMANDER_ID),
        'ace',
      );
    });

    it('commander is ace even with empty shipSkills', () => {
      const commander = createTestPilot(COMMANDER_ID, {});
      assert.strictEqual(
        getShipSkill(commander, 'fighter', COMMANDER_ID),
        'ace',
      );
    });

    it('regular pilot uses actual shipSkills', () => {
      const pilot = createTestPilot('pilot-1', { fighter: 'veteran' });

      assert.strictEqual(
        getShipSkill(pilot, 'fighter', COMMANDER_ID),
        'veteran',
      );
      assert.strictEqual(getShipSkill(pilot, 'bomber', COMMANDER_ID), null);
    });
  });

  describe('canFlyShip (via caller checking commanderId)', () => {
    // Note: canFlyShip doesn't take commanderId - callers check first
    it('regular pilot needs training to fly ship', () => {
      const pilot = createTestPilot('pilot-1', { fighter: 'veteran' });

      assert.strictEqual(canFlyShip(pilot, 'fighter'), true);
      assert.strictEqual(canFlyShip(pilot, 'bomber'), false);
    });

    it('commander handling is done by caller (checking commanderId before canFlyShip)', () => {
      // This is how it's used in pilot-assignment.ts:
      // if (pilotId !== state.commanderId && !canFlyShip(pilot, ship.shipClass))
      const commander = createTestPilot(COMMANDER_ID, {});

      // Commander's empty shipSkills would return false
      assert.strictEqual(canFlyShip(commander, 'fighter'), false);
      // But caller should check commanderId first and skip this check
    });
  });

  describe('XP handling', () => {
    it('applyXP adds XP to regular pilots', () => {
      const pilot = createTestPilot('pilot-1', {}, 50);
      const updated = applyXP(pilot, 100);

      assert.strictEqual(updated.xp, 150);
    });

    it('applyXP does not modify XP when xpGained is 0 or negative', () => {
      const pilot = createTestPilot('pilot-1', {}, 50);

      const same = applyXP(pilot, 0);
      assert.strictEqual(same, pilot); // Same reference

      const sameNeg = applyXP(pilot, -10);
      assert.strictEqual(sameNeg, pilot); // Same reference
    });

    it('commander XP check is done at caller level (applyPilotStats)', () => {
      // applyXP doesn't check commanderId - the caller does
      // This is tested in state-mission.ts tests
      const commander = createTestPilot(COMMANDER_ID, {}, 0);

      // applyXP would add XP if called directly
      const updated = applyXP(commander, 100);
      assert.strictEqual(updated.xp, 100);

      // But applyPilotStats in state-mission.ts checks:
      // if (pilot.id !== state.commanderId && !isPlayerPilot(pilot))
      // before calling applyXP
    });
  });

  describe('XP spending', () => {
    it('regular pilot can spend XP', () => {
      const pilot = createTestPilot('pilot-1', { fighter: 'rookie' }, 100);
      const updated = spendXPOnShip(pilot, 'fighter');

      assert.strictEqual(updated.xp, 50); // 100 - 50
      assert.strictEqual(updated.shipSkills.fighter, 'regular');
    });

    it('spendXPOnShip does not have special commander handling', () => {
      // Commander check is done in action-processing.ts:
      // if (pilot.id === state.commanderId) {
      //   return { success: false, error: 'Commander cannot spend XP' };
      // }
      const commander = createTestPilot(COMMANDER_ID, {}, 100);

      // spendXPOnShip would work if called directly
      const updated = spendXPOnShip(commander, 'fighter');
      assert.strictEqual(updated.shipSkills.fighter, 'rookie');

      // But the action processor blocks it
    });
  });

  describe('Commander initialization', () => {
    it('commander should be created with empty shipSkills', () => {
      // This is how commander is created in state.ts:
      // Commander has null shipClass - they can fly any ship at ace level (via commanderId)
      const commander = createTestPilot(COMMANDER_ID, {});

      assert.deepStrictEqual(commander.shipSkills, {});
      assert.strictEqual(commander.xp, 0);
    });
  });
});
