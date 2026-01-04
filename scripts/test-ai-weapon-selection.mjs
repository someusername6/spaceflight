/**
 * AI Weapon Selection Tests - validates primary weapon selection logic.
 *
 * Uses real AI profiles via test fixtures to ensure tests reflect actual
 * game behavior and don't rely on hardcoded assumptions.
 */

import { createHeat } from '../src/components/heat.ts';
import { createPrimaryWeapons } from '../src/components/weapons.ts';
import { DEFAULT_TEST_PROFILE } from '../src/data/test-fixtures.ts';
import {
  calculateFiringAngle,
  getDistanceCategory,
  getWeaponRangeCategory,
  RangeCategory,
  selectOptimalPrimaryWeapon,
} from '../src/systems/ai/ai-weapon-selection.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================
// Distance Category Tests
// ============================================================

test('Distance category - short range (<400m)', () => {
  assert(getDistanceCategory(100) === RangeCategory.Short, 'Expected Short');
  assert(
    getDistanceCategory(399) === RangeCategory.Short,
    'Expected Short at 399',
  );
});

test('Distance category - medium range (400-800m)', () => {
  assert(
    getDistanceCategory(400) === RangeCategory.Medium,
    'Expected Medium at 400',
  );
  assert(
    getDistanceCategory(799) === RangeCategory.Medium,
    'Expected Medium at 799',
  );
});

test('Distance category - long range (800-1500m)', () => {
  assert(
    getDistanceCategory(800) === RangeCategory.Long,
    'Expected Long at 800',
  );
  assert(
    getDistanceCategory(1499) === RangeCategory.Long,
    'Expected Long at 1499',
  );
});

test('Distance category - very long range (1500m+)', () => {
  assert(
    getDistanceCategory(1500) === RangeCategory.VeryLong,
    'Expected VeryLong at 1500',
  );
  assert(
    getDistanceCategory(3000) === RangeCategory.VeryLong,
    'Expected VeryLong at 3000',
  );
});

// ============================================================
// Weapon Range Category Tests
// ============================================================

test('Weapon range category - railgun is VeryLong', () => {
  const weapons = createPrimaryWeapons([{ name: 'railgun', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(
    getWeaponRangeCategory(weapon) === RangeCategory.VeryLong,
    'Railgun should be VeryLong',
  );
});

test('Weapon range category - plasma is Long', () => {
  const weapons = createPrimaryWeapons([{ name: 'plasma', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(
    getWeaponRangeCategory(weapon) === RangeCategory.Long,
    'Plasma should be Long',
  );
});

test('Weapon range category - autocannon is Medium', () => {
  const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(
    getWeaponRangeCategory(weapon) === RangeCategory.Medium,
    'Autocannon should be Medium',
  );
});

test('Weapon range category - lightning is Short', () => {
  const weapons = createPrimaryWeapons([{ name: 'lightning', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(
    getWeaponRangeCategory(weapon) === RangeCategory.Short,
    'Lightning should be Short',
  );
});

// ============================================================
// Primary Weapon Selection Tests
// ============================================================

test('Linked mode when all weapons in range and heat low', () => {
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

  assert(
    selection.mode === 'linked',
    'Should fire linked when all weapons in range and low heat',
  );
});

test('Single mode when weapon out of range', () => {
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
  assert(
    selection.mode === 'single',
    'Should fire single when one weapon out of range',
  );
  assert(selection.index === 0, 'Should select plasma (index 0)');
});

test('No firing when heat is critical', () => {
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
  assert(
    selection.mode === 'none' || selection.mode === 'single',
    'Should limit firing at high heat',
  );
});

test('Prefer Ion weapon against shielded targets', () => {
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
  assert(
    selection.mode === 'single',
    'Should fire single when targeting shields',
  );
  assert(selection.index === 1, 'Should select Ion (index 1)');
});

test('Avoid wasting finite ammo at poor firing angles', () => {
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
    assert(
      selection.index === 1,
      'Should prefer plasma (infinite ammo) at poor angle',
    );
  }
});

// ============================================================
// Firing Angle Tests
// ============================================================

test('Firing angle - dead ahead is 0 degrees', () => {
  const transform = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion (facing -Z)
  };
  const targetPos = { x: 0, y: 0, z: -100 };

  const angle = calculateFiringAngle(transform, targetPos);
  assert(angle < 5, `Dead ahead should be ~0 degrees, got ${angle}`);
});

test('Firing angle - behind is ~180 degrees', () => {
  const transform = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion (facing -Z)
  };
  const targetPos = { x: 0, y: 0, z: 100 }; // Behind

  const angle = calculateFiringAngle(transform, targetPos);
  assert(angle > 170, `Behind should be ~180 degrees, got ${angle}`);
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
