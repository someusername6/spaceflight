/**
 * Weapon System Tests - validates weapon definitions including Lightning and Nuclear Lance.
 */

import { WEAPON_DEFS } from '../../../src/components/weapons.ts';

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

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `${message || 'Assertion failed'}: expected ${expected}, got ${actual}`,
    );
  }
}

// ============================================================
// Existing Weapon Definitions
// ============================================================

test('Energy weapons exist (Plasma, Pulse, Ion)', () => {
  assert(WEAPON_DEFS.plasma, 'Plasma should exist');
  assert(WEAPON_DEFS.pulse, 'Pulse should exist');
  assert(WEAPON_DEFS.ion, 'Ion should exist');
});

test('Ballistic weapons exist (Autocannon, Railgun, Flak)', () => {
  assert(WEAPON_DEFS.autocannon, 'Autocannon should exist');
  assert(WEAPON_DEFS.railgun, 'Railgun should exist');
  assert(WEAPON_DEFS.flak, 'Flak should exist');
});

test('Beam weapons exist (Red, Green, Blue Laser)', () => {
  assert(WEAPON_DEFS.redLaser, 'Red Laser should exist');
  assert(WEAPON_DEFS.greenLaser, 'Green Laser should exist');
  assert(WEAPON_DEFS.blueLaser, 'Blue Laser should exist');
});

// ============================================================
// Lightning Weapon
// ============================================================

test('Lightning weapon exists', () => {
  assert(WEAPON_DEFS.lightning, 'Lightning should exist');
});

test('Lightning has correct category', () => {
  assert(
    WEAPON_DEFS.lightning.category === 'beam',
    'Lightning should be beam category',
  );
});

test('Lightning has pulse beam properties', () => {
  assert(
    WEAPON_DEFS.lightning.isPulseBeam === true,
    'Lightning should be pulse beam',
  );
  assertApprox(
    WEAPON_DEFS.lightning.pulseInterval,
    0.1,
    0.001,
    'Lightning pulse interval should be 100ms',
  );
});

test('Lightning has no damage falloff', () => {
  assert(
    WEAPON_DEFS.lightning.noFalloff === true,
    'Lightning should have no falloff',
  );
});

test('Lightning has correct stats', () => {
  assert(WEAPON_DEFS.lightning.range === 300, 'Lightning range should be 300m');
  assert(
    WEAPON_DEFS.lightning.damage === 5,
    'Lightning damage per pulse should be 5',
  );
  assert(
    WEAPON_DEFS.lightning.heatPerShot === 2,
    'Lightning heat per pulse should be 2',
  );
});

test('Lightning has correct DPS (50/sec at 10 pulses/sec)', () => {
  const pulseInterval = WEAPON_DEFS.lightning.pulseInterval;
  const pulsesPerSecond = 1 / pulseInterval;
  const dps = WEAPON_DEFS.lightning.damage * pulsesPerSecond;
  assertApprox(dps, 50, 0.1, 'Lightning DPS');
});

test('Lightning has correct heat rate (20/sec)', () => {
  const pulseInterval = WEAPON_DEFS.lightning.pulseInterval;
  const pulsesPerSecond = 1 / pulseInterval;
  const heatPerSecond = WEAPON_DEFS.lightning.heatPerShot * pulsesPerSecond;
  assertApprox(heatPerSecond, 20, 0.1, 'Lightning heat per second');
});

// ============================================================
// Nuclear Lance Weapon
// ============================================================

test('Nuclear Lance weapon exists', () => {
  assert(WEAPON_DEFS.nuclearLance, 'Nuclear Lance should exist');
});

test('Nuclear Lance has correct category', () => {
  assert(
    WEAPON_DEFS.nuclearLance.category === 'beam',
    'Nuclear Lance should be beam category',
  );
});

test('Nuclear Lance uses ammo', () => {
  assert(
    WEAPON_DEFS.nuclearLance.ammo === 1,
    'Nuclear Lance should have 1 base ammo',
  );
});

test('Nuclear Lance has correct stats', () => {
  assert(
    WEAPON_DEFS.nuclearLance.range === 3000,
    'Nuclear Lance range should be 3000m',
  );
  assert(
    WEAPON_DEFS.nuclearLance.damage === 500,
    'Nuclear Lance damage should be 500',
  );
  assert(
    WEAPON_DEFS.nuclearLance.heatPerShot === 30,
    'Nuclear Lance should have 30 heat per shot',
  );
  assert(
    WEAPON_DEFS.nuclearLance.isInstantBeam === true,
    'Nuclear Lance should be an instant beam',
  );
});

test('Nuclear Lance has fire rate cooldown', () => {
  assert(
    WEAPON_DEFS.nuclearLance.fireRate === 0.5,
    'Nuclear Lance fire rate should be 0.5s',
  );
});

test('Nuclear Lance is NOT a pulse beam', () => {
  assert(
    WEAPON_DEFS.nuclearLance.isPulseBeam !== true,
    'Nuclear Lance should not be pulse beam',
  );
});

// ============================================================
// Weapon Count Validation
// ============================================================

test('All 12 primary weapon types defined', () => {
  const weapons = Object.keys(WEAPON_DEFS);
  assert(
    weapons.length === 12,
    `Should have 12 weapons, got ${weapons.length}`,
  );
});

test('All energy weapons have infinite ammo', () => {
  assert(WEAPON_DEFS.plasma.ammo === undefined, 'Plasma should have no ammo');
  assert(WEAPON_DEFS.pulse.ammo === undefined, 'Pulse should have no ammo');
  assert(WEAPON_DEFS.ion.ammo === undefined, 'Ion should have no ammo');
});

test('All ballistic weapons have finite ammo', () => {
  assert(
    WEAPON_DEFS.autocannon.ammo === 200,
    'Autocannon should have 200 ammo',
  );
  assert(WEAPON_DEFS.railgun.ammo === 20, 'Railgun should have 20 ammo');
  assert(WEAPON_DEFS.flak.ammo === 50, 'Flak should have 50 ammo');
});

test('Standard beams have no ammo (infinite)', () => {
  assert(
    WEAPON_DEFS.redLaser.ammo === undefined,
    'Red Laser should have no ammo',
  );
  assert(
    WEAPON_DEFS.greenLaser.ammo === undefined,
    'Green Laser should have no ammo',
  );
  assert(
    WEAPON_DEFS.blueLaser.ammo === undefined,
    'Blue Laser should have no ammo',
  );
  assert(
    WEAPON_DEFS.lightning.ammo === undefined,
    'Lightning should have no ammo',
  );
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
