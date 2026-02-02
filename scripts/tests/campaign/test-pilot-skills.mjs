/**
 * Tests for the pilot ship-specific skill system.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  canFlyShip,
  getPilotSalary,
  getShipSkill,
  getUpgradeCost,
  PILOT_SALARIES,
  RECRUIT_BONUS_XP,
  spendXPOnShip,
  XP_COSTS,
  XP_INVESTED,
} from '../../../src/campaign/pilot-skills.ts';

/** Create a test pilot with ship skills */
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

describe('Pilot Ship Skills', () => {
  describe('XP Constants', () => {
    it('has correct unlock cost', () => {
      assert.strictEqual(XP_COSTS.unlock, 25);
    });

    it('has correct rookie to regular cost', () => {
      assert.strictEqual(XP_COSTS.rookieToRegular, 50);
    });

    it('has correct regular to veteran cost', () => {
      assert.strictEqual(XP_COSTS.regularToVeteran, 100);
    });

    it('has correct veteran to ace cost', () => {
      assert.strictEqual(XP_COSTS.veteranToAce, 200);
    });

    it('has correct ace to elite cost', () => {
      assert.strictEqual(XP_COSTS.aceToElite, 400);
    });

    it('has cumulative XP invested values', () => {
      // unlock + rookie→regular = 25 + 50 = 75
      assert.strictEqual(
        XP_INVESTED.regular,
        XP_COSTS.unlock + XP_COSTS.rookieToRegular,
      );
      // regular + regular→veteran = 75 + 100 = 175
      assert.strictEqual(
        XP_INVESTED.veteran,
        XP_INVESTED.regular + XP_COSTS.regularToVeteran,
      );
      // veteran + veteran→ace = 175 + 200 = 375
      assert.strictEqual(
        XP_INVESTED.ace,
        XP_INVESTED.veteran + XP_COSTS.veteranToAce,
      );
      // ace + ace→elite = 375 + 400 = 775
      assert.strictEqual(
        XP_INVESTED.elite,
        XP_INVESTED.ace + XP_COSTS.aceToElite,
      );
    });
  });

  describe('Recruit Bonus XP', () => {
    it('increases with skill tier', () => {
      assert.ok(RECRUIT_BONUS_XP.regular > RECRUIT_BONUS_XP.rookie);
      assert.ok(RECRUIT_BONUS_XP.veteran > RECRUIT_BONUS_XP.regular);
      assert.ok(RECRUIT_BONUS_XP.ace > RECRUIT_BONUS_XP.veteran);
      assert.ok(RECRUIT_BONUS_XP.elite > RECRUIT_BONUS_XP.ace);
    });
  });

  describe('Pilot Salaries', () => {
    it('has correct salary values', () => {
      assert.strictEqual(PILOT_SALARIES.rookie, 50);
      assert.strictEqual(PILOT_SALARIES.regular, 100);
      assert.strictEqual(PILOT_SALARIES.veteran, 200);
      assert.strictEqual(PILOT_SALARIES.ace, 400);
      assert.strictEqual(PILOT_SALARIES.elite, 800);
    });

    it('doubles with each skill tier', () => {
      assert.strictEqual(PILOT_SALARIES.regular, PILOT_SALARIES.rookie * 2);
      assert.strictEqual(PILOT_SALARIES.veteran, PILOT_SALARIES.regular * 2);
      assert.strictEqual(PILOT_SALARIES.ace, PILOT_SALARIES.veteran * 2);
      assert.strictEqual(PILOT_SALARIES.elite, PILOT_SALARIES.ace * 2);
    });
  });

  describe('canFlyShip', () => {
    it('returns true for trained ships', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(canFlyShip(pilot, 'fighter'), true);
    });

    it('returns false for untrained ships', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(canFlyShip(pilot, 'bomber'), false);
    });

    it('returns true for multiple trained ships', () => {
      const pilot = createTestPilot({ fighter: 'veteran', bomber: 'rookie' });
      assert.strictEqual(canFlyShip(pilot, 'fighter'), true);
      assert.strictEqual(canFlyShip(pilot, 'bomber'), true);
    });

    it('returns false for empty skills', () => {
      const pilot = createTestPilot({});
      assert.strictEqual(canFlyShip(pilot, 'fighter'), false);
    });
  });

  describe('getShipSkill', () => {
    it('returns skill for trained ship', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(
        getShipSkill(pilot, 'fighter', 'commander'),
        'veteran',
      );
    });

    it('returns null for untrained ship', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(getShipSkill(pilot, 'bomber', 'commander'), null);
    });

    it('returns ace for commander on any ship', () => {
      const pilot = { ...createTestPilot({}), id: 'commander' };
      assert.strictEqual(getShipSkill(pilot, 'fighter', 'commander'), 'ace');
      assert.strictEqual(getShipSkill(pilot, 'bomber', 'commander'), 'ace');
      assert.strictEqual(getShipSkill(pilot, 'anyship', 'commander'), 'ace');
    });

    it('does not return ace for non-commander pilots', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(
        getShipSkill(pilot, 'fighter', 'commander'),
        'veteran',
      );
    });
  });

  describe('getUpgradeCost', () => {
    it('returns unlock cost for null (fighter baseline)', () => {
      assert.strictEqual(getUpgradeCost(null, 'fighter'), XP_COSTS.unlock);
    });

    it('returns correct cost for rookie (fighter baseline)', () => {
      assert.strictEqual(
        getUpgradeCost('rookie', 'fighter'),
        XP_COSTS.rookieToRegular,
      );
    });

    it('returns correct cost for regular (fighter baseline)', () => {
      assert.strictEqual(
        getUpgradeCost('regular', 'fighter'),
        XP_COSTS.regularToVeteran,
      );
    });

    it('returns correct cost for veteran (fighter baseline)', () => {
      assert.strictEqual(
        getUpgradeCost('veteran', 'fighter'),
        XP_COSTS.veteranToAce,
      );
    });

    it('returns correct cost for ace (fighter baseline)', () => {
      assert.strictEqual(getUpgradeCost('ace', 'fighter'), XP_COSTS.aceToElite);
    });

    it('returns Infinity for elite', () => {
      assert.strictEqual(getUpgradeCost('elite', 'fighter'), Infinity);
    });

    it('scales cost based on ship price', () => {
      // Defender costs 900, fighter costs 400, ratio = 2.25
      const defenderUnlock = getUpgradeCost(null, 'defender');
      assert.strictEqual(defenderUnlock, Math.round(XP_COSTS.unlock * 2.25));

      // Patrol costs 200, fighter costs 400, ratio = 0.5
      const patrolUnlock = getUpgradeCost(null, 'patrol');
      assert.strictEqual(patrolUnlock, Math.round(XP_COSTS.unlock * 0.5));
    });
  });

  describe('getPilotSalary', () => {
    it('returns correct salary for skill level', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(
        getPilotSalary(pilot, 'fighter', 'commander'),
        PILOT_SALARIES.veteran,
      );
    });

    it('returns 0 for untrained ship', () => {
      const pilot = createTestPilot({ fighter: 'veteran' });
      assert.strictEqual(getPilotSalary(pilot, 'bomber', 'commander'), 0);
    });

    it('returns 0 for commander', () => {
      const pilot = {
        ...createTestPilot({ fighter: 'veteran' }),
        id: 'commander',
      };
      assert.strictEqual(getPilotSalary(pilot, 'fighter', 'commander'), 0);
    });

    it('returns correct salary for each skill level', () => {
      assert.strictEqual(
        getPilotSalary(
          createTestPilot({ fighter: 'rookie' }),
          'fighter',
          'commander',
        ),
        50,
      );
      assert.strictEqual(
        getPilotSalary(
          createTestPilot({ fighter: 'regular' }),
          'fighter',
          'commander',
        ),
        100,
      );
      assert.strictEqual(
        getPilotSalary(
          createTestPilot({ fighter: 'veteran' }),
          'fighter',
          'commander',
        ),
        200,
      );
      assert.strictEqual(
        getPilotSalary(
          createTestPilot({ fighter: 'ace' }),
          'fighter',
          'commander',
        ),
        400,
      );
      assert.strictEqual(
        getPilotSalary(
          createTestPilot({ fighter: 'elite' }),
          'fighter',
          'commander',
        ),
        800,
      );
    });
  });

  describe('spendXPOnShip', () => {
    it('unlocks new ship at rookie (fighter baseline)', () => {
      // Using fighter as baseline - unlock cost is 25 XP
      const pilot = createTestPilot({ bomber: 'veteran' }, 50);
      const updated = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(updated.xp, 25); // 50 - 25 = 25
      assert.strictEqual(updated.shipSkills.fighter, 'rookie');
      assert.strictEqual(updated.shipSkills.bomber, 'veteran'); // unchanged
    });

    it('unlocks expensive ship with scaled cost', () => {
      // Bomber costs 700, fighter costs 400, ratio = 1.75
      // Unlock cost = 25 * 1.75 = 44 XP (rounded)
      const pilot = createTestPilot({ fighter: 'veteran' }, 50);
      const updated = spendXPOnShip(pilot, 'bomber');
      assert.strictEqual(updated.xp, 6); // 50 - 44 = 6
      assert.strictEqual(updated.shipSkills.bomber, 'rookie');
      assert.strictEqual(updated.shipSkills.fighter, 'veteran'); // unchanged
    });

    it('upgrades existing skill', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 100);
      const updated = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(updated.xp, 50);
      assert.strictEqual(updated.shipSkills.fighter, 'regular');
    });

    it('upgrades through all skill levels', () => {
      let pilot = createTestPilot({ fighter: 'rookie' }, 1000);

      pilot = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(pilot.shipSkills.fighter, 'regular');

      pilot = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(pilot.shipSkills.fighter, 'veteran');

      pilot = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(pilot.shipSkills.fighter, 'ace');

      pilot = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(pilot.shipSkills.fighter, 'elite');
    });

    it('throws when insufficient XP', () => {
      const pilot = createTestPilot({ fighter: 'ace' }, 100);
      assert.throws(() => spendXPOnShip(pilot, 'fighter'), /Insufficient XP/);
    });

    it('throws when already elite', () => {
      const pilot = createTestPilot({ fighter: 'elite' }, 500);
      assert.throws(() => spendXPOnShip(pilot, 'fighter'), /Already at elite/);
    });

    it('deducts correct XP for each upgrade', () => {
      const pilot1 = createTestPilot({}, 25);
      const result1 = spendXPOnShip(pilot1, 'fighter');
      assert.strictEqual(result1.xp, 0); // 25 - 25 = 0

      const pilot2 = createTestPilot({ fighter: 'rookie' }, 50);
      const result2 = spendXPOnShip(pilot2, 'fighter');
      assert.strictEqual(result2.xp, 0); // 50 - 50 = 0

      const pilot3 = createTestPilot({ fighter: 'regular' }, 100);
      const result3 = spendXPOnShip(pilot3, 'fighter');
      assert.strictEqual(result3.xp, 0); // 100 - 100 = 0

      const pilot4 = createTestPilot({ fighter: 'veteran' }, 200);
      const result4 = spendXPOnShip(pilot4, 'fighter');
      assert.strictEqual(result4.xp, 0); // 200 - 200 = 0

      const pilot5 = createTestPilot({ fighter: 'ace' }, 400);
      const result5 = spendXPOnShip(pilot5, 'fighter');
      assert.strictEqual(result5.xp, 0); // 400 - 400 = 0
    });

    it('preserves other pilot properties', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 100);
      pilot.kills = 5;
      pilot.missionsFlown = 10;

      const updated = spendXPOnShip(pilot, 'fighter');
      assert.strictEqual(updated.kills, 5);
      assert.strictEqual(updated.missionsFlown, 10);
      assert.strictEqual(updated.id, 'test-pilot');
      assert.strictEqual(updated.name, 'Test');
    });

    it('does not mutate original pilot', () => {
      const pilot = createTestPilot({ fighter: 'rookie' }, 100);
      const originalXP = pilot.xp;
      const originalSkill = pilot.shipSkills.fighter;

      spendXPOnShip(pilot, 'fighter');

      assert.strictEqual(pilot.xp, originalXP);
      assert.strictEqual(pilot.shipSkills.fighter, originalSkill);
    });
  });

  describe('Full skill progression cost', () => {
    it('costs 775 XP total to reach elite from unlock', () => {
      // unlock: 25 + rookie→regular: 50 + regular→veteran: 100 + veteran→ace: 200 + ace→elite: 400 = 775
      const totalCost =
        XP_COSTS.unlock +
        XP_COSTS.rookieToRegular +
        XP_COSTS.regularToVeteran +
        XP_COSTS.veteranToAce +
        XP_COSTS.aceToElite;
      assert.strictEqual(totalCost, 775);
      assert.strictEqual(totalCost, XP_INVESTED.elite);
    });
  });
});
