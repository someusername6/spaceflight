/**
 * AI Safe Distance Tests - Flak shrapnel self-damage avoidance.
 * Tests that AI won't fire shrapnel weapons when distance < shrapnelRange.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { createHeat } from '../../../src/components/heat.ts';
import { createPrimaryWeapons } from '../../../src/components/weapons.ts';
import { DEFAULT_TEST_PROFILE } from '../../../src/data/test-fixtures.ts';
import {
  getMinSafeDistance as getPrimaryMinSafeDistance,
  selectOptimalPrimaryWeapon,
} from '../../../src/systems/ai/ai-weapon-selection.ts';

describe('Flak Safe Distance', () => {
  // Flak has: shrapnelRange=120
  // Safe distance = 120m

  it('Flak excluded when too close (self-damage risk)', () => {
    const weapons = createPrimaryWeapons([{ name: 'flak', size: 1 }]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      80, // Too close (< 120m shrapnelRange)
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'none',
      'Should NOT fire Flak when too close (< shrapnelRange)',
    );
  });

  it('Flak allowed at safe distance', () => {
    const weapons = createPrimaryWeapons([{ name: 'flak', size: 1 }]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      150, // Safe distance (> 120m)
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'single',
      'Should fire Flak at safe distance',
    );
    assert.strictEqual(selection.index, 0, 'Should select Flak');
  });

  it('Switch to alternate weapon when Flak is unsafe', () => {
    const weapons = createPrimaryWeapons([
      { name: 'flak', size: 1 }, // Unsafe at close range
      { name: 'plasma', size: 1 }, // Safe at any range
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      80, // Too close for Flak (< 120m)
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'single',
      'Should fire single when Flak excluded',
    );
    assert.strictEqual(
      selection.index,
      1,
      'Should switch to Plasma when Flak is unsafe',
    );
  });

  it('Flak exactly at safe distance boundary is allowed', () => {
    const weapons = createPrimaryWeapons([{ name: 'flak', size: 1 }]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    // Flak: shrapnelRange=120m exactly
    const selection = selectOptimalPrimaryWeapon(
      weapons,
      120, // Exactly at boundary
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    // At exactly 120m, the check is `distance < minSafe`, so 120 < 120 is false = safe
    assert.strictEqual(
      selection.mode,
      'single',
      'Should fire Flak at exactly safe distance',
    );
  });

  it('Linked mode excludes unsafe Flak, uses only safe weapons', () => {
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 },
      { name: 'flak', size: 1 }, // Unsafe at close range
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      80, // Too close for Flak (< 120m)
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    // Should NOT link (Flak is excluded), should fire Plasma only
    assert.strictEqual(
      selection.mode,
      'single',
      'Should fire single when Flak excluded from linked',
    );
    assert.strictEqual(selection.index, 0, 'Should select Plasma');
  });
});

describe('getMinSafeDistance - Primary Weapons', () => {
  it('returns shrapnelRange for Flak weapons', () => {
    const weapons = createPrimaryWeapons([{ name: 'flak', size: 1 }]);
    const flak = weapons.weapons[0];

    const safeDistance = getPrimaryMinSafeDistance(flak);

    assert.strictEqual(
      safeDistance,
      120,
      'Flak safe distance should be shrapnelRange (120m)',
    );
  });

  it('returns 0 for non-shrapnel weapons', () => {
    const weapons = createPrimaryWeapons([{ name: 'plasma', size: 1 }]);
    const plasma = weapons.weapons[0];

    const safeDistance = getPrimaryMinSafeDistance(plasma);

    assert.strictEqual(
      safeDistance,
      0,
      'Non-shrapnel weapons have no safe distance restriction',
    );
  });

  it('throws error if shrapnelCount defined but shrapnelRange missing', () => {
    const malformedWeapon = {
      name: 'BrokenFlak',
      category: 'ballistic',
      heatPerShot: 5,
      projectileSpeed: 400,
      fireRate: 0.25,
      range: 600,
      damage: 0,
      bankSize: 1,
      shrapnelCount: 10, // Has shrapnel count...
      // But missing shrapnelRange!
    };

    assert.throws(
      () => getPrimaryMinSafeDistance(malformedWeapon),
      /missing required shrapnelRange/,
      'Should throw error for shrapnel weapon without shrapnelRange',
    );
  });
});
