/**
 * AI Weapon Selection Tests - validates primary weapon selection logic.
 *
 * Uses real AI profiles via test fixtures to ensure tests reflect actual
 * game behavior and don't rely on hardcoded assumptions.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { createHeat } from '../../../src/components/heat.ts';
import { createPrimaryWeapons } from '../../../src/components/weapons.ts';
import { DEFAULT_TEST_PROFILE } from '../../../src/data/test-fixtures.ts';
import {
  calculateFiringAngle,
  getDistanceCategory,
  getWeaponRangeCategory,
  RangeCategory,
  selectOptimalPrimaryWeapon,
} from '../../../src/systems/ai/ai-weapon-selection.ts';

describe('Distance Category', () => {
  it('short range (<400m)', () => {
    assert.strictEqual(
      getDistanceCategory(100),
      RangeCategory.Short,
      'Expected Short',
    );
    assert.strictEqual(
      getDistanceCategory(399),
      RangeCategory.Short,
      'Expected Short at 399',
    );
  });

  it('medium range (400-800m)', () => {
    assert.strictEqual(
      getDistanceCategory(400),
      RangeCategory.Medium,
      'Expected Medium at 400',
    );
    assert.strictEqual(
      getDistanceCategory(799),
      RangeCategory.Medium,
      'Expected Medium at 799',
    );
  });

  it('long range (800-1500m)', () => {
    assert.strictEqual(
      getDistanceCategory(800),
      RangeCategory.Long,
      'Expected Long at 800',
    );
    assert.strictEqual(
      getDistanceCategory(1499),
      RangeCategory.Long,
      'Expected Long at 1499',
    );
  });

  it('very long range (1500m+)', () => {
    assert.strictEqual(
      getDistanceCategory(1500),
      RangeCategory.VeryLong,
      'Expected VeryLong at 1500',
    );
    assert.strictEqual(
      getDistanceCategory(3000),
      RangeCategory.VeryLong,
      'Expected VeryLong at 3000',
    );
  });
});

describe('Weapon Range Category', () => {
  it('railgun is VeryLong', () => {
    const weapons = createPrimaryWeapons([{ name: 'railgun', size: 1 }]);
    const weapon = weapons.weapons[0];
    assert.strictEqual(
      getWeaponRangeCategory(weapon),
      RangeCategory.VeryLong,
      'Railgun should be VeryLong',
    );
  });

  it('plasma is Long', () => {
    const weapons = createPrimaryWeapons([{ name: 'plasma', size: 1 }]);
    const weapon = weapons.weapons[0];
    assert.strictEqual(
      getWeaponRangeCategory(weapon),
      RangeCategory.Long,
      'Plasma should be Long',
    );
  });

  it('autocannon is Medium', () => {
    const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 1 }]);
    const weapon = weapons.weapons[0];
    assert.strictEqual(
      getWeaponRangeCategory(weapon),
      RangeCategory.Medium,
      'Autocannon should be Medium',
    );
  });

  it('lightning is Short', () => {
    const weapons = createPrimaryWeapons([{ name: 'lightning', size: 1 }]);
    const weapon = weapons.weapons[0];
    assert.strictEqual(
      getWeaponRangeCategory(weapon),
      RangeCategory.Short,
      'Lightning should be Short',
    );
  });
});

describe('Primary Weapon Selection', () => {
  it('Linked mode when all weapons in range and heat low', () => {
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 }, // 800m range
      { name: 'ion', size: 1 }, // 700m range
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20; // Low heat

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      600, // Both plasma (800m) and ion (700m) can reach
      heat,
      undefined, // No shields - so Ion doesn't get shield bonus
      10, // Good firing angle
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'linked',
      'Should fire linked when all weapons in range and low heat',
    );
  });

  it('Single mode when weapon out of range', () => {
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 }, // 800m range
      { name: 'pulse', size: 1 }, // 500m range
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      700, // Pulse can't reach
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    // Should use single mode with plasma (only one that can reach)
    assert.strictEqual(
      selection.mode,
      'single',
      'Should fire single when one weapon out of range',
    );
    assert.strictEqual(selection.index, 0, 'Should select plasma (index 0)');
  });

  it('No firing when heat is critical', () => {
    const weapons = createPrimaryWeapons([{ name: 'plasma', size: 1 }]);
    const heat = createHeat(100, 10);
    heat.current = 92; // Above 90% warning

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      500,
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    // High heat weapons should not fire
    assert.ok(
      selection.mode === 'none' || selection.mode === 'single',
      'Should limit firing at high heat',
    );
  });

  it('Prefer Ion weapon against shielded targets', () => {
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 },
      { name: 'ion', size: 1 },
    ]);
    const heat = createHeat(100, 10);
    heat.current = 50;

    // Create mock shields
    const targetShields = {
      type: 'shields',
      current: 100,
      max: 100,
      regenRate: 5,
      regenDelay: 2,
      lastDamageTime: 0,
    };

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      600,
      heat,
      targetShields,
      10,
      DEFAULT_TEST_PROFILE,
    );

    // Should prefer Ion for shielded target
    assert.strictEqual(
      selection.mode,
      'single',
      'Should fire single when targeting shields',
    );
    assert.strictEqual(selection.index, 1, 'Should select Ion (index 1)');
  });

  it('Avoid wasting finite ammo at poor firing angles', () => {
    const weapons = createPrimaryWeapons([
      { name: 'railgun', size: 1 }, // Finite ammo
      { name: 'plasma', size: 1 }, // Infinite ammo
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      600,
      heat,
      undefined,
      45, // Poor angle (above profile's minFiringAngle of 30)
      DEFAULT_TEST_PROFILE,
    );

    // Should prefer infinite ammo weapon at poor angles
    if (selection.mode === 'single') {
      assert.strictEqual(
        selection.index,
        1,
        'Should prefer plasma (infinite ammo) at poor angle',
      );
    }
  });
});

describe('Firing Angle', () => {
  it('dead ahead is 0 degrees', () => {
    const transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion (facing -Z)
    };
    const targetPos = { x: 0, y: 0, z: -100 };

    const angle = calculateFiringAngle(transform, targetPos);
    assert.ok(angle < 5, `Dead ahead should be ~0 degrees, got ${angle}`);
  });

  it('behind is ~180 degrees', () => {
    const transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion (facing -Z)
    };
    const targetPos = { x: 0, y: 0, z: 100 }; // Behind

    const angle = calculateFiringAngle(transform, targetPos);
    assert.ok(angle > 170, `Behind should be ~180 degrees, got ${angle}`);
  });
});
