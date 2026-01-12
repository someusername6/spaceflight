/**
 * Weapon System Tests - validates weapon definitions including Lightning and Nuclear Lance.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { WEAPON_DEFS } from '../../../src/components/weapons.ts';
import { assertApprox } from '../shared/test-utils.mjs';

// ============================================================
// Existing Weapon Definitions
// ============================================================

describe('Weapon Definitions', () => {
  it('Energy weapons exist (Plasma, Pulse, Ion)', () => {
    assert.ok(WEAPON_DEFS.plasma, 'Plasma should exist');
    assert.ok(WEAPON_DEFS.pulse, 'Pulse should exist');
    assert.ok(WEAPON_DEFS.ion, 'Ion should exist');
  });

  it('Ballistic weapons exist (Autocannon, Railgun, Flak)', () => {
    assert.ok(WEAPON_DEFS.autocannon, 'Autocannon should exist');
    assert.ok(WEAPON_DEFS.railgun, 'Railgun should exist');
    assert.ok(WEAPON_DEFS.flak, 'Flak should exist');
  });

  it('Beam weapons exist (Red, Green, Blue Laser)', () => {
    assert.ok(WEAPON_DEFS.redLaser, 'Red Laser should exist');
    assert.ok(WEAPON_DEFS.greenLaser, 'Green Laser should exist');
    assert.ok(WEAPON_DEFS.blueLaser, 'Blue Laser should exist');
  });
});

// ============================================================
// Lightning Weapon
// ============================================================

describe('Lightning Weapon', () => {
  it('Lightning weapon exists', () => {
    assert.ok(WEAPON_DEFS.lightning, 'Lightning should exist');
  });

  it('Lightning has correct category', () => {
    assert.ok(
      WEAPON_DEFS.lightning.category === 'beam',
      'Lightning should be beam category',
    );
  });

  it('Lightning has pulse beam properties', () => {
    assert.ok(
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

  it('Lightning has no damage falloff', () => {
    assert.ok(
      WEAPON_DEFS.lightning.noFalloff === true,
      'Lightning should have no falloff',
    );
  });

  it('Lightning has correct stats', () => {
    assert.ok(
      WEAPON_DEFS.lightning.range === 300,
      'Lightning range should be 300m',
    );
    assert.ok(
      WEAPON_DEFS.lightning.damage === 5,
      'Lightning damage per pulse should be 5',
    );
    assert.ok(
      WEAPON_DEFS.lightning.heatPerShot === 2,
      'Lightning heat per pulse should be 2',
    );
  });

  it('Lightning has correct DPS (50/sec at 10 pulses/sec)', () => {
    const pulseInterval = WEAPON_DEFS.lightning.pulseInterval;
    const pulsesPerSecond = 1 / pulseInterval;
    const dps = WEAPON_DEFS.lightning.damage * pulsesPerSecond;
    assertApprox(dps, 50, 0.1, 'Lightning DPS');
  });

  it('Lightning has correct heat rate (20/sec)', () => {
    const pulseInterval = WEAPON_DEFS.lightning.pulseInterval;
    const pulsesPerSecond = 1 / pulseInterval;
    const heatPerSecond = WEAPON_DEFS.lightning.heatPerShot * pulsesPerSecond;
    assertApprox(heatPerSecond, 20, 0.1, 'Lightning heat per second');
  });
});

// ============================================================
// Nuclear Lance Weapon
// ============================================================

describe('Nuclear Lance Weapon', () => {
  it('Nuclear Lance weapon exists', () => {
    assert.ok(WEAPON_DEFS.nuclearLance, 'Nuclear Lance should exist');
  });

  it('Nuclear Lance has correct category', () => {
    assert.ok(
      WEAPON_DEFS.nuclearLance.category === 'beam',
      'Nuclear Lance should be beam category',
    );
  });

  it('Nuclear Lance uses ammo', () => {
    assert.ok(
      WEAPON_DEFS.nuclearLance.ammo === 1,
      'Nuclear Lance should have 1 base ammo',
    );
  });

  it('Nuclear Lance has correct stats', () => {
    assert.ok(
      WEAPON_DEFS.nuclearLance.range === 3000,
      'Nuclear Lance range should be 3000m',
    );
    assert.ok(
      WEAPON_DEFS.nuclearLance.damage === 500,
      'Nuclear Lance damage should be 500',
    );
    assert.ok(
      WEAPON_DEFS.nuclearLance.heatPerShot === 30,
      'Nuclear Lance should have 30 heat per shot',
    );
    assert.ok(
      WEAPON_DEFS.nuclearLance.isInstantBeam === true,
      'Nuclear Lance should be an instant beam',
    );
  });

  it('Nuclear Lance has fire rate cooldown', () => {
    assert.ok(
      WEAPON_DEFS.nuclearLance.fireRate === 0.5,
      'Nuclear Lance fire rate should be 0.5s',
    );
  });

  it('Nuclear Lance is NOT a pulse beam', () => {
    assert.ok(
      WEAPON_DEFS.nuclearLance.isPulseBeam !== true,
      'Nuclear Lance should not be pulse beam',
    );
  });
});

// ============================================================
// Gyrojet Weapon
// ============================================================

describe('Gyrojet Weapon', () => {
  it('Gyrojet weapon exists', () => {
    assert.ok(WEAPON_DEFS.gyrojet, 'Gyrojet should exist');
  });

  it('Gyrojet has correct category', () => {
    assert.ok(
      WEAPON_DEFS.gyrojet.category === 'ballistic',
      'Gyrojet should be ballistic category',
    );
  });

  it('Gyrojet has acceleration properties', () => {
    assert.ok(
      WEAPON_DEFS.gyrojet.initialSpeed === 200,
      'Gyrojet initial speed should be 200',
    );
    assert.ok(
      WEAPON_DEFS.gyrojet.projectileSpeed === 1200,
      'Gyrojet max speed should be 1200',
    );
    assert.ok(
      WEAPON_DEFS.gyrojet.acceleration === 400,
      'Gyrojet acceleration should be 400',
    );
  });

  it('Gyrojet has tracking properties', () => {
    assert.ok(
      WEAPON_DEFS.gyrojet.trackingRate === 2,
      'Gyrojet tracking rate should be 2°/s',
    );
    assert.ok(
      WEAPON_DEFS.gyrojet.trackingCone === 30,
      'Gyrojet tracking cone should be 30°',
    );
  });

  it('Gyrojet has speed-based damage scaling', () => {
    assert.ok(
      WEAPON_DEFS.gyrojet.speedDamageScale === true,
      'Gyrojet should have speed damage scaling',
    );
  });

  it('Gyrojet has correct stats', () => {
    assert.ok(
      WEAPON_DEFS.gyrojet.range === 2000,
      'Gyrojet range should be 2000m',
    );
    assert.ok(
      WEAPON_DEFS.gyrojet.damage === 200,
      'Gyrojet damage at max speed should be 200',
    );
    assert.ok(WEAPON_DEFS.gyrojet.ammo === 60, 'Gyrojet should have 60 ammo');
  });

  it('Gyrojet has 4 shots per second fire rate', () => {
    const fireRate = 1 / WEAPON_DEFS.gyrojet.fireRate;
    assertApprox(fireRate, 4, 0.1, 'Gyrojet fire rate');
  });
});

// ============================================================
// Weapon Count Validation
// ============================================================

describe('Weapon Count Validation', () => {
  it('All 14 primary weapon types defined', () => {
    const weapons = Object.keys(WEAPON_DEFS);
    assert.ok(
      weapons.length === 14,
      `Should have 14 weapons, got ${weapons.length}`,
    );
  });

  it('All energy weapons have infinite ammo', () => {
    assert.ok(
      WEAPON_DEFS.plasma.ammo === undefined,
      'Plasma should have no ammo',
    );
    assert.ok(
      WEAPON_DEFS.pulse.ammo === undefined,
      'Pulse should have no ammo',
    );
    assert.ok(WEAPON_DEFS.ion.ammo === undefined, 'Ion should have no ammo');
  });

  it('All ballistic weapons have finite ammo', () => {
    assert.ok(
      WEAPON_DEFS.autocannon.ammo === 200,
      'Autocannon should have 200 ammo',
    );
    assert.ok(WEAPON_DEFS.railgun.ammo === 20, 'Railgun should have 20 ammo');
    assert.ok(WEAPON_DEFS.flak.ammo === 200, 'Flak should have 200 ammo');
  });

  it('Standard beams have no ammo (infinite)', () => {
    assert.ok(
      WEAPON_DEFS.redLaser.ammo === undefined,
      'Red Laser should have no ammo',
    );
    assert.ok(
      WEAPON_DEFS.greenLaser.ammo === undefined,
      'Green Laser should have no ammo',
    );
    assert.ok(
      WEAPON_DEFS.blueLaser.ammo === undefined,
      'Blue Laser should have no ammo',
    );
    assert.ok(
      WEAPON_DEFS.lightning.ammo === undefined,
      'Lightning should have no ammo',
    );
  });
});
