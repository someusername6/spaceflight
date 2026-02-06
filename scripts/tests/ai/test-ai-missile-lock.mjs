/**
 * AI Missile Selection Tests
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { selectOptimalMissile } from '../../../src/systems/ai/ai-missile-selection.ts';

describe('AI Missile Selection', () => {
  it('Select dumbfire missile when not locked', () => {
    const weapons = {
      type: 'secondaryWeapons',
      weapons: [
        {
          name: 'Seeker',
          requiresLock: true,
          count: 5,
          range: 2000,
          speed: 400,
          turnRate: 90,
          damage: 60,
          fireRate: 0.5,
          lockSpeed: 1,
          bankSize: 1,
          maxCount: 8,
        },
        {
          name: 'Rocket',
          requiresLock: false,
          count: 5,
          range: 1000,
          speed: 600,
          turnRate: 0,
          damage: 50,
          fireRate: 0.5,
          lockSpeed: 0,
          bankSize: 1,
          maxCount: 8,
        },
      ],
      currentIndex: 0,
      lastFireTime: 0,
      lockTarget: undefined,
      lockProgress: 0,
      lockWeaponIndex: -1,
    };

    const selection = selectOptimalMissile(
      weapons,
      800, // In range for both
      false, // NOT locked
    );

    assert.strictEqual(selection.shouldFire, true, 'Should be able to fire');
    assert.strictEqual(
      selection.index,
      1,
      'Should select Rocket (dumbfire) when not locked',
    );
  });

  it('Prefer lock-requiring missile when locked', () => {
    const weapons = {
      type: 'secondaryWeapons',
      weapons: [
        {
          name: 'Rocket',
          requiresLock: false,
          count: 5,
          range: 1000,
          speed: 600,
          turnRate: 0,
          damage: 50,
          fireRate: 0.5,
          lockSpeed: 0,
          bankSize: 1,
          maxCount: 8,
        },
        {
          name: 'Seeker',
          requiresLock: true,
          count: 5,
          range: 2000,
          speed: 400,
          turnRate: 90,
          damage: 60,
          fireRate: 0.5,
          lockSpeed: 1,
          bankSize: 1,
          maxCount: 8,
        },
      ],
      currentIndex: 0,
      lastFireTime: 0,
      lockTarget: undefined,
      lockProgress: 1,
      lockWeaponIndex: -1,
    };

    const selection = selectOptimalMissile(
      weapons,
      800,
      true, // Locked
    );

    assert.strictEqual(selection.shouldFire, true, 'Should be able to fire');
    // When locked, prefer homing missile (Seeker at index 1)
    assert.strictEqual(
      selection.index,
      1,
      'Should select homing Seeker when locked',
    );
  });

  it('Cannot fire lock-requiring missile when not locked', () => {
    const weapons = {
      type: 'secondaryWeapons',
      weapons: [
        {
          name: 'Seeker',
          requiresLock: true,
          count: 5,
          range: 2000,
          speed: 400,
          turnRate: 90,
          damage: 60,
          fireRate: 0.5,
          lockSpeed: 1,
          bankSize: 1,
          maxCount: 8,
        },
      ],
      currentIndex: 0,
      lastFireTime: 0,
      lockTarget: undefined,
      lockProgress: 0,
      lockWeaponIndex: -1,
    };

    const selection = selectOptimalMissile(
      weapons,
      800,
      false, // NOT locked
    );

    assert.strictEqual(
      selection.shouldFire,
      false,
      'Should NOT fire lock-requiring missile without lock',
    );
  });

  it('No missile selection when out of range', () => {
    const weapons = {
      type: 'secondaryWeapons',
      weapons: [
        {
          name: 'Rocket',
          requiresLock: false,
          count: 5,
          range: 1000,
          speed: 600,
          turnRate: 0,
          damage: 50,
          fireRate: 0.5,
          lockSpeed: 0,
          bankSize: 1,
          maxCount: 8,
        },
      ],
      currentIndex: 0,
      lastFireTime: 0,
      lockTarget: undefined,
      lockProgress: 0,
      lockWeaponIndex: -1,
    };

    const selection = selectOptimalMissile(
      weapons,
      1500, // Out of range
      false,
    );

    assert.strictEqual(
      selection.shouldFire,
      false,
      'Should NOT fire when out of range',
    );
  });

  it('No missile selection when no ammo', () => {
    const weapons = {
      type: 'secondaryWeapons',
      weapons: [
        {
          name: 'Rocket',
          requiresLock: false,
          count: 0,
          range: 1000,
          speed: 600,
          turnRate: 0,
          damage: 50,
          fireRate: 0.5,
          lockSpeed: 0,
          bankSize: 1,
          maxCount: 8,
        },
      ],
      currentIndex: 0,
      lastFireTime: 0,
      lockTarget: undefined,
      lockProgress: 0,
      lockWeaponIndex: -1,
    };

    const selection = selectOptimalMissile(weapons, 500, false);

    assert.strictEqual(
      selection.shouldFire,
      false,
      'Should NOT fire when no ammo',
    );
  });

  it('Dumbfire missiles can fire without lock', () => {
    const weapons = {
      type: 'secondaryWeapons',
      weapons: [
        {
          name: 'Rocket',
          requiresLock: false,
          count: 5,
          range: 1000,
          speed: 600,
          turnRate: 0,
          damage: 50,
          fireRate: 0.5,
          lockSpeed: 0,
          bankSize: 1,
          maxCount: 8,
        },
      ],
      currentIndex: 0,
      lastFireTime: 0,
      lockTarget: undefined,
      lockProgress: 0, // No lock at all
      lockWeaponIndex: -1,
    };

    const selection = selectOptimalMissile(
      weapons,
      500,
      false, // Not locked
    );

    assert.strictEqual(
      selection.shouldFire,
      true,
      'Dumbfire should fire without lock',
    );
    assert.strictEqual(selection.index, 0, 'Should select Rocket');
  });
});
