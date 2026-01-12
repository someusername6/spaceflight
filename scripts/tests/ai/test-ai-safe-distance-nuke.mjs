/**
 * AI Safe Distance Tests - Nuke/AoE missile self-damage avoidance.
 * Tests that AI won't fire AoE missiles when distance < aoeRadius.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  getMinSafeDistance as getMissileMinSafeDistance,
  selectOptimalMissile,
} from '../../../src/systems/ai/ai-missile-selection.ts';
import {
  createTestNuke,
  createTestRocket,
  createTestSecondaryWeapons,
  createTestSeeker,
} from '../shared/missile-fixtures.mjs';

describe('Nuke Safe Distance', () => {
  // Nuke has: aoeRadius=100
  // Safe distance = 100m

  it('Nuke excluded when too close (self-damage risk)', () => {
    const weapons = createTestSecondaryWeapons([createTestNuke()]);

    const selection = selectOptimalMissile(
      weapons,
      50, // Too close (< 100m aoeRadius)
      100,
      true, // Locked
    );

    assert.strictEqual(
      selection.shouldFire,
      false,
      'Should NOT fire Nuke when too close (< aoeRadius)',
    );
  });

  it('Nuke allowed at safe distance', () => {
    const weapons = createTestSecondaryWeapons([createTestNuke()]);

    const selection = selectOptimalMissile(
      weapons,
      150, // Safe distance (> 100m)
      100,
      true, // Locked
    );

    assert.strictEqual(
      selection.shouldFire,
      true,
      'Should fire Nuke at safe distance',
    );
    assert.strictEqual(selection.index, 0, 'Should select Nuke');
  });

  it('Switch to alternate missile when Nuke is unsafe', () => {
    const weapons = createTestSecondaryWeapons([
      createTestNuke(), // Unsafe at close range
      createTestSeeker(), // Safe at any range
    ]);

    const selection = selectOptimalMissile(
      weapons,
      50, // Too close for Nuke
      100,
      true, // Locked
    );

    assert.strictEqual(
      selection.shouldFire,
      true,
      'Should be able to fire alternate missile',
    );
    assert.strictEqual(
      selection.index,
      1,
      'Should switch to Seeker when Nuke is unsafe',
    );
  });

  it('Nuke exactly at safe distance boundary is allowed', () => {
    const weapons = createTestSecondaryWeapons([createTestNuke()]);

    const selection = selectOptimalMissile(
      weapons,
      100, // Exactly at boundary
      100,
      true, // Locked
    );

    // At exactly 100m, should fire (distance < minSafe is false)
    assert.strictEqual(
      selection.shouldFire,
      true,
      'Should fire Nuke at exactly safe distance',
    );
  });

  it('Fallback to dumbfire when Nuke unsafe and no homing alternatives', () => {
    const weapons = createTestSecondaryWeapons([
      createTestNuke(), // Unsafe at close range
      createTestRocket(), // Dumbfire, safe at any range
    ]);

    const selection = selectOptimalMissile(
      weapons,
      50, // Too close for Nuke
      100,
      true, // Locked
    );

    assert.strictEqual(selection.shouldFire, true, 'Should fire dumbfire');
    assert.strictEqual(
      selection.index,
      1,
      'Should fallback to Rocket when Nuke unsafe',
    );
  });
});

describe('getMinSafeDistance - Missiles', () => {
  it('returns aoeRadius for AoE missiles', () => {
    const nuke = createTestNuke();
    const safeDistance = getMissileMinSafeDistance(nuke);

    assert.strictEqual(
      safeDistance,
      100,
      'Nuke safe distance should be aoeRadius (100m)',
    );
  });

  it('returns 0 for non-AoE missiles', () => {
    const seeker = createTestSeeker();
    const safeDistance = getMissileMinSafeDistance(seeker);

    assert.strictEqual(
      safeDistance,
      0,
      'Non-AoE missiles have no safe distance restriction',
    );
  });
});
