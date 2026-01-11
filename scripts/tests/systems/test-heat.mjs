/**
 * Heat System Tests - validates heat locking, hysteresis, and ship heat stats.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  AFTERBURNER_LOCK_THRESHOLD,
  AFTERBURNER_UNLOCK_THRESHOLD,
  addHeat,
  coolDown,
  createHeat,
  getHeatPercent,
  HEAT_WARNING_THRESHOLD,
  isHeatWarning,
  isOverheated,
  WEAPON_LOCK_THRESHOLD,
  WEAPON_UNLOCK_THRESHOLD,
} from '../../../src/components/heat.ts';
import { SHIP_ARCHETYPES } from '../../../src/factories/ship.ts';

describe('Heat System', () => {
  // ============================================================
  // Heat Threshold Constants
  // ============================================================

  describe('Heat Threshold Constants', () => {
    it('Heat warning threshold is 90%', () => {
      assert.strictEqual(HEAT_WARNING_THRESHOLD, 0.9, 'Warning should be 90%');
    });

    it('Afterburner lock threshold is 95%', () => {
      assert.strictEqual(
        AFTERBURNER_LOCK_THRESHOLD,
        0.95,
        'AB lock should be 95%',
      );
    });

    it('Afterburner unlock threshold is 50%', () => {
      assert.strictEqual(
        AFTERBURNER_UNLOCK_THRESHOLD,
        0.5,
        'AB unlock should be 50%',
      );
    });

    it('Weapon lock threshold is 100%', () => {
      assert.strictEqual(
        WEAPON_LOCK_THRESHOLD,
        1.0,
        'Weapon lock should be 100%',
      );
    });

    it('Weapon unlock threshold is 95%', () => {
      assert.strictEqual(
        WEAPON_UNLOCK_THRESHOLD,
        0.95,
        'Weapon unlock should be 95%',
      );
    });
  });

  // ============================================================
  // Heat Component Creation
  // ============================================================

  describe('Heat Component Creation', () => {
    it('Heat component initializes correctly', () => {
      const heat = createHeat(100, 20);
      assert.strictEqual(heat.current, 0, 'Current heat should start at 0');
      assert.strictEqual(heat.max, 100, 'Max heat should be 100');
      assert.strictEqual(heat.coolingRate, 20, 'Cooling rate should be 20');
      assert.strictEqual(
        heat.weaponsLocked,
        false,
        'Weapons should start unlocked',
      );
    });

    it('getHeatPercent returns correct percentage', () => {
      const heat = createHeat(100, 20);
      heat.current = 50;
      assert.strictEqual(getHeatPercent(heat), 0.5, 'Should be 50%');
      heat.current = 90;
      assert.strictEqual(getHeatPercent(heat), 0.9, 'Should be 90%');
    });
  });

  // ============================================================
  // Heat Warning
  // ============================================================

  describe('Heat Warning', () => {
    it('isHeatWarning returns false below 90%', () => {
      const heat = createHeat(100, 20);
      heat.current = 89;
      assert.ok(!isHeatWarning(heat), 'Should not warn at 89%');
    });

    it('isHeatWarning returns true at 90%', () => {
      const heat = createHeat(100, 20);
      heat.current = 90;
      assert.ok(isHeatWarning(heat), 'Should warn at 90%');
    });

    it('isHeatWarning returns true above 90%', () => {
      const heat = createHeat(100, 20);
      heat.current = 95;
      assert.ok(isHeatWarning(heat), 'Should warn at 95%');
    });
  });

  // ============================================================
  // Weapon Locking Hysteresis
  // ============================================================

  describe('Weapon Locking Hysteresis', () => {
    it('Weapons lock at 100% heat', () => {
      const heat = createHeat(100, 20);
      heat.current = 95;
      assert.ok(addHeat(heat, 5), 'Should allow adding heat to reach 100%');
      assert.strictEqual(heat.current, 100, 'Heat should be at 100%');
      assert.strictEqual(
        heat.weaponsLocked,
        true,
        'Weapons should be locked at 100%',
      );
    });

    it('Weapons stay locked above 95%', () => {
      const heat = createHeat(100, 20);
      heat.current = 100;
      heat.weaponsLocked = true;
      coolDown(heat, 0.2); // Cool down 4 heat (20 * 0.2) = 96%
      assert.strictEqual(heat.current, 96, 'Heat should be at 96%');
      assert.strictEqual(
        heat.weaponsLocked,
        true,
        'Weapons should still be locked at 96%',
      );
    });

    it('Weapons unlock at 95% or below', () => {
      const heat = createHeat(100, 20);
      heat.current = 100;
      heat.weaponsLocked = true;
      coolDown(heat, 0.3); // Cool down 6 heat (20 * 0.3) = 94%
      assert.strictEqual(heat.current, 94, 'Heat should be at 94%');
      assert.strictEqual(
        heat.weaponsLocked,
        false,
        'Weapons should unlock at 94%',
      );
    });

    it('addHeat returns false when weapons locked', () => {
      const heat = createHeat(100, 20);
      heat.weaponsLocked = true;
      assert.ok(!addHeat(heat, 10), 'Should not allow adding heat when locked');
    });

    it('isOverheated returns weaponsLocked state', () => {
      const heat = createHeat(100, 20);
      assert.ok(!isOverheated(heat), 'Should not be overheated initially');
      heat.weaponsLocked = true;
      assert.ok(isOverheated(heat), 'Should be overheated when locked');
    });

    it('Weapon lock hysteresis prevents oscillation', () => {
      const heat = createHeat(100, 20);

      // Heat up to 100% - locks
      heat.current = 100;
      addHeat(heat, 0); // Trigger lock check
      heat.weaponsLocked = true;

      // Cool to 96% - still locked (above 95%)
      coolDown(heat, 0.2); // 4 heat removed
      assert.strictEqual(heat.weaponsLocked, true, 'Should stay locked at 96%');

      // Cool to 94% - unlocks
      coolDown(heat, 0.1); // 2 more heat removed
      assert.strictEqual(heat.weaponsLocked, false, 'Should unlock at 94%');

      // Heat back up to 99% - should NOT lock (below 100%)
      addHeat(heat, 5);
      assert.strictEqual(
        heat.weaponsLocked,
        false,
        'Should stay unlocked at 99%',
      );

      // Heat to 100% - locks again
      addHeat(heat, 1);
      assert.strictEqual(heat.weaponsLocked, true, 'Should lock at 100%');
    });
  });

  // ============================================================
  // Ship Archetype Heat Stats
  // ============================================================

  describe('Ship Archetype Heat Stats', () => {
    it('Base ship archetypes exist', () => {
      const archetypes = Object.keys(SHIP_ARCHETYPES);
      assert.ok(
        archetypes.length >= 7,
        'Should have at least 7 ship archetypes',
      );
      assert.ok(archetypes.includes('scout'), 'Should have scout');
      assert.ok(archetypes.includes('interceptor'), 'Should have interceptor');
      assert.ok(archetypes.includes('striker'), 'Should have striker');
      assert.ok(archetypes.includes('bomber'), 'Should have bomber');
      assert.ok(archetypes.includes('defender'), 'Should have defender');
      assert.ok(archetypes.includes('raider'), 'Should have raider');
      assert.ok(archetypes.includes('sentinel'), 'Should have sentinel');
    });

    it('Scout has low afterburner heat rate (mobility focused)', () => {
      const scout = SHIP_ARCHETYPES.scout;
      assert.strictEqual(
        scout.afterburnerHeatRate,
        25,
        'Scout AB heat should be 25',
      );
      assert.strictEqual(scout.maxHeat, 80, 'Scout max heat should be 80');
      assert.strictEqual(scout.coolingRate, 15, 'Scout cooling should be 15');
    });

    it('Interceptor has heat stats between scout and fighter', () => {
      const interceptor = SHIP_ARCHETYPES.interceptor;
      assert.strictEqual(
        interceptor.afterburnerHeatRate,
        32,
        'Interceptor AB heat should be 32',
      );
      assert.strictEqual(
        interceptor.maxHeat,
        90,
        'Interceptor max heat should be 90',
      );
      assert.strictEqual(
        interceptor.coolingRate,
        16,
        'Interceptor cooling should be 16',
      );
    });

    it('Striker has high capacity but expensive afterburner', () => {
      const striker = SHIP_ARCHETYPES.striker;
      assert.strictEqual(
        striker.afterburnerHeatRate,
        60,
        'Striker AB heat should be 60',
      );
      assert.strictEqual(
        striker.maxHeat,
        150,
        'Striker max heat should be 150',
      );
      assert.strictEqual(
        striker.coolingRate,
        25,
        'Striker cooling should be 25',
      );
    });

    it('Bomber has expensive afterburner (slow by design)', () => {
      const bomber = SHIP_ARCHETYPES.bomber;
      assert.strictEqual(
        bomber.afterburnerHeatRate,
        55,
        'Bomber AB heat should be 55',
      );
      assert.strictEqual(bomber.maxHeat, 80, 'Bomber max heat should be 80');
      assert.strictEqual(bomber.coolingRate, 12, 'Bomber cooling should be 12');
    });

    it('Defender has standard afterburner cost', () => {
      const defender = SHIP_ARCHETYPES.defender;
      assert.strictEqual(
        defender.afterburnerHeatRate,
        50,
        'Defender AB heat should be 50',
      );
      assert.strictEqual(
        defender.maxHeat,
        100,
        'Defender max heat should be 100',
      );
      assert.strictEqual(
        defender.coolingRate,
        18,
        'Defender cooling should be 18',
      );
    });

    it('Raider has cheap afterburner (speed focused)', () => {
      const raider = SHIP_ARCHETYPES.raider;
      assert.strictEqual(
        raider.afterburnerHeatRate,
        35,
        'Raider AB heat should be 35',
      );
      assert.strictEqual(raider.maxHeat, 140, 'Raider max heat should be 140');
      assert.strictEqual(raider.coolingRate, 22, 'Raider cooling should be 22');
    });

    it('Sentinel has moderate afterburner cost', () => {
      const sentinel = SHIP_ARCHETYPES.sentinel;
      assert.strictEqual(
        sentinel.afterburnerHeatRate,
        45,
        'Sentinel AB heat should be 45',
      );
      assert.strictEqual(
        sentinel.maxHeat,
        130,
        'Sentinel max heat should be 130',
      );
      assert.strictEqual(
        sentinel.coolingRate,
        22,
        'Sentinel cooling should be 22',
      );
    });
  });

  // ============================================================
  // Afterburner Sustain Time (maxHeat / afterburnerHeatRate)
  // ============================================================

  describe('Afterburner Sustain Time', () => {
    it('Scout can afterburn longest (3.2 seconds)', () => {
      const scout = SHIP_ARCHETYPES.scout;
      const sustainTime = scout.maxHeat / scout.afterburnerHeatRate;
      assert.strictEqual(
        sustainTime,
        3.2,
        `Scout sustain should be 3.2s, got ${sustainTime}`,
      );
    });

    it('Bomber has shortest afterburn time (1.45 seconds)', () => {
      const bomber = SHIP_ARCHETYPES.bomber;
      const sustainTime = bomber.maxHeat / bomber.afterburnerHeatRate;
      assert.ok(
        Math.abs(sustainTime - 1.45) < 0.01,
        `Bomber sustain should be ~1.45s, got ${sustainTime}`,
      );
    });

    it('Striker sustain time balances capacity vs cost', () => {
      const striker = SHIP_ARCHETYPES.striker;
      const sustainTime = striker.maxHeat / striker.afterburnerHeatRate;
      assert.strictEqual(
        sustainTime,
        2.5,
        `Striker sustain should be 2.5s, got ${sustainTime}`,
      );
    });
  });
});
