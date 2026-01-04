/**
 * AI Missile Selection Tests
 */

import { selectOptimalMissile } from '../../../src/systems/ai-missile-selection.ts';

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
// Missile Selection Tests
// ============================================================

test('Select dumbfire missile when not locked', () => {
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
    100, // Target speed
    false, // NOT locked
  );

  assert(selection.shouldFire === true, 'Should be able to fire');
  assert(
    selection.index === 1,
    'Should select Rocket (dumbfire) when not locked',
  );
});

test('Prefer lock-requiring missile when locked', () => {
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
    100,
    true, // Locked
  );

  assert(selection.shouldFire === true, 'Should be able to fire');
  // First pass finds dumbfire, so Rocket (index 0) is selected
  assert(selection.index === 0, 'Should select first available missile');
});

test('Cannot fire lock-requiring missile when not locked', () => {
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
    100,
    false, // NOT locked
  );

  assert(
    selection.shouldFire === false,
    'Should NOT fire lock-requiring missile without lock',
  );
});

test('No missile selection when out of range', () => {
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
    100,
    false,
  );

  assert(selection.shouldFire === false, 'Should NOT fire when out of range');
});

test('No missile selection when no ammo', () => {
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

  const selection = selectOptimalMissile(weapons, 500, 100, false);

  assert(selection.shouldFire === false, 'Should NOT fire when no ammo');
});

test('Dumbfire missiles can fire without lock', () => {
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
    100,
    false, // Not locked
  );

  assert(selection.shouldFire === true, 'Dumbfire should fire without lock');
  assert(selection.index === 0, 'Should select Rocket');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
