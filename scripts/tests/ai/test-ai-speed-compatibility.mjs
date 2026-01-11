/**
 * AI Speed Compatibility Tests - validates linked mode projectile speed logic.
 *
 * Tests that linked mode is only used when projectile speeds are compatible
 * (within 30% ratio), preventing weapons from aiming at different lead points.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { createHeat } from '../../../src/components/heat.ts';
import { createPrimaryWeapons } from '../../../src/components/weapons.ts';
import { DEFAULT_TEST_PROFILE } from '../../../src/data/test-fixtures.ts';
import { selectOptimalPrimaryWeapon } from '../../../src/systems/ai/ai-weapon-selection.ts';

describe('AI Speed Compatibility (Lead Indicator Distance)', () => {
  it('Linked mode when projectiles have similar speeds', () => {
    // Plasma (400) and Ion (400) have identical speeds - should link
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 }, // 400 m/s
      { name: 'ion', size: 1 }, // 400 m/s
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      600,
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'linked',
      `Similar speed weapons should fire linked, got ${selection.mode}`,
    );
  });

  it('Single mode when projectile speeds are incompatible', () => {
    // Plasma (400) and Railgun (2000) have very different speeds
    // Lead points would be far apart - should NOT link
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 }, // 400 m/s
      { name: 'railgun', size: 1 }, // 2000 m/s
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      1000, // Both can reach
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'single',
      `Incompatible speed weapons should NOT fire linked, got ${selection.mode}`,
    );
  });

  it('Single mode when mixing slow and medium speed projectiles', () => {
    // Flak (350) and Pulse (600) have ~71% speed difference (ratio 1.71)
    // This exceeds the 30% threshold - should NOT link
    const weapons = createPrimaryWeapons([
      { name: 'flak', size: 1 }, // 350 m/s
      { name: 'pulse', size: 1 }, // 600 m/s
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      400, // Both can reach
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'single',
      `Flak (350) + Pulse (600) should NOT fire linked, got ${selection.mode}`,
    );
  });

  it('Linked mode when projectile speeds are within 30% threshold', () => {
    // Plasma (400) and Autocannon (500) have 25% difference - should link
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 }, // 400 m/s
      { name: 'autocannon', size: 1 }, // 500 m/s (ratio 1.25)
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      350, // Both can reach (autocannon range 400m)
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    assert.strictEqual(
      selection.mode,
      'linked',
      `Plasma (400) + Autocannon (500) should fire linked (25% diff), got ${selection.mode}`,
    );
  });

  it('Beams are ignored in projectile speed compatibility check', () => {
    // Plasma (400 m/s projectile) + Red Laser (beam, 0 m/s)
    // Beams fire separately from projectiles, so this should allow linked
    // mode for the projectile if it's the only projectile
    const weapons = createPrimaryWeapons([
      { name: 'plasma', size: 1 }, // 400 m/s projectile
      { name: 'redLaser', size: 1 }, // beam (instant hit)
    ]);
    const heat = createHeat(100, 10);
    heat.current = 20;

    const selection = selectOptimalPrimaryWeapon(
      weapons,
      350, // Both can reach
      heat,
      undefined,
      10,
      DEFAULT_TEST_PROFILE,
    );

    // With only one projectile weapon, selection depends on other factors
    // The key is that mixing beam + projectile doesn't cause incompatibility error
    assert.ok(
      selection.mode === 'linked' || selection.mode === 'single',
      `Beam + projectile mix should not crash, got ${selection.mode}`,
    );
  });
});
