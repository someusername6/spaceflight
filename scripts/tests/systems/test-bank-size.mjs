/**
 * Bank Size Scaling Tests - validates weapon bank size effects.
 */

import { createSecondaryWeaponFromDef } from '../../../src/components/missile.ts';
import {
  createDecoyWeapon,
  createPrimaryWeapons,
  getEffectiveHeat,
} from '../../../src/components/weapons.ts';

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
// Energy Weapons - bank size affects heat scaling
// ============================================================

test('Energy weapon (Plasma) bank size 1 has normal heat', () => {
  const weapons = createPrimaryWeapons([{ name: 'plasma', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 1, 'Bank size should be 1');
  assert(weapon.heatPerShot === 5, 'Heat per shot should be 5');
  assert(getEffectiveHeat(weapon) === 5, 'Effective heat should be 5');
});

test('Energy weapon (Plasma) bank size 2 has halved effective heat', () => {
  const weapons = createPrimaryWeapons([{ name: 'plasma', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 2, 'Bank size should be 2');
  assert(weapon.heatPerShot === 5, 'Heat per shot should still be 5');
  assert(getEffectiveHeat(weapon) === 2.5, 'Effective heat should be 2.5');
});

test('Energy weapon (Plasma) bank size 3 has 1/3 effective heat', () => {
  const weapons = createPrimaryWeapons([{ name: 'plasma', size: 3 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 3, 'Bank size should be 3');
  assert(getEffectiveHeat(weapon) === 5 / 3, 'Effective heat should be 5/3');
});

test('Energy weapon (Pulse) bank size scaling', () => {
  const weapons = createPrimaryWeapons([{ name: 'pulse', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.heatPerShot === 5, 'Pulse heat should be 5');
  assert(getEffectiveHeat(weapon) === 2.5, 'Effective heat should be 2.5');
});

test('Energy weapon (Ion) bank size scaling', () => {
  const weapons = createPrimaryWeapons([{ name: 'ion', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.heatPerShot === 6, 'Ion heat should be 6');
  assert(getEffectiveHeat(weapon) === 3, 'Effective heat should be 3');
});

// ============================================================
// Ballistic Weapons - bank size affects ammo capacity
// ============================================================

test('Ballistic weapon (Autocannon) bank size 1 has base ammo', () => {
  const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 1, 'Bank size should be 1');
  assert(weapon.ammo === 200, 'Ammo should be 200');
  assert(weapon.maxAmmo === 200, 'Max ammo should be 200');
});

test('Ballistic weapon (Autocannon) bank size 2 has doubled ammo', () => {
  const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 2, 'Bank size should be 2');
  assert(weapon.ammo === 400, 'Ammo should be 400');
  assert(weapon.maxAmmo === 400, 'Max ammo should be 400');
});

test('Ballistic weapon (Autocannon) bank size 3 has tripled ammo', () => {
  const weapons = createPrimaryWeapons([{ name: 'autocannon', size: 3 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 3, 'Bank size should be 3');
  assert(weapon.ammo === 600, 'Ammo should be 600');
  assert(weapon.maxAmmo === 600, 'Max ammo should be 600');
});

test('Ballistic weapon (Railgun) bank size scaling', () => {
  const weapons = createPrimaryWeapons([{ name: 'railgun', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.ammo === 40, 'Railgun ammo should be 40 (20 * 2)');
  assert(weapon.maxAmmo === 40, 'Max ammo should be 40');
});

test('Ballistic weapon (Flak) bank size scaling', () => {
  const weapons = createPrimaryWeapons([{ name: 'flak', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.ammo === 100, 'Flak ammo should be 100 (50 * 2)');
  assert(weapon.maxAmmo === 100, 'Max ammo should be 100');
});

// ============================================================
// Beam Weapons - bank size affects heat scaling
// ============================================================

test('Beam weapon (Red Laser) bank size 1 has normal heat', () => {
  const weapons = createPrimaryWeapons([{ name: 'redLaser', size: 1 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 1, 'Bank size should be 1');
  assert(weapon.heatPerShot === 15, 'Heat/sec should be 15');
  assert(getEffectiveHeat(weapon) === 15, 'Effective heat should be 15');
});

test('Beam weapon (Red Laser) bank size 2 has halved effective heat', () => {
  const weapons = createPrimaryWeapons([{ name: 'redLaser', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.bankSize === 2, 'Bank size should be 2');
  assert(getEffectiveHeat(weapon) === 7.5, 'Effective heat should be 7.5');
});

test('Beam weapon (Green Laser) bank size scaling', () => {
  const weapons = createPrimaryWeapons([{ name: 'greenLaser', size: 2 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.heatPerShot === 12, 'Green Laser heat should be 12');
  assert(getEffectiveHeat(weapon) === 6, 'Effective heat should be 6');
});

test('Beam weapon (Blue Laser) bank size scaling', () => {
  const weapons = createPrimaryWeapons([{ name: 'blueLaser', size: 3 }]);
  const weapon = weapons.weapons[0];
  assert(weapon.heatPerShot === 10, 'Blue Laser heat should be 10');
  assert(getEffectiveHeat(weapon) === 10 / 3, 'Effective heat should be 10/3');
});

// ============================================================
// Missiles - bank size affects count
// ============================================================

test('Missile (Rocket) bank size 1 has base count', () => {
  const weapon = createSecondaryWeaponFromDef('rocket', 10, 1);
  assert(weapon.bankSize === 1, 'Bank size should be 1');
  assert(weapon.count === 10, 'Count should be 10');
  assert(weapon.maxCount === 10, 'Max count should be 10');
});

test('Missile (Rocket) bank size 2 has doubled count', () => {
  const weapon = createSecondaryWeaponFromDef('rocket', 10, 2);
  assert(weapon.bankSize === 2, 'Bank size should be 2');
  assert(weapon.count === 20, 'Count should be 20');
  assert(weapon.maxCount === 20, 'Max count should be 20');
});

test('Missile (Seeker) bank size scaling', () => {
  const weapon = createSecondaryWeaponFromDef('seeker', 8, 2);
  assert(weapon.count === 16, 'Seeker count should be 16 (8 * 2)');
  assert(weapon.maxCount === 16, 'Max count should be 16');
  assert(weapon.requiresLock === true, 'Seeker requires lock');
});

test('Missile (Dart) bank size scaling', () => {
  const weapon = createSecondaryWeaponFromDef('dart', 6, 3);
  assert(weapon.count === 18, 'Dart count should be 18 (6 * 3)');
  assert(weapon.maxCount === 18, 'Max count should be 18');
});

test('Missile (Cluster) bank size scaling', () => {
  const weapon = createSecondaryWeaponFromDef('cluster', 4, 2);
  assert(weapon.count === 8, 'Cluster count should be 8 (4 * 2)');
});

test('Missile (Swarm) bank size scaling', () => {
  const weapon = createSecondaryWeaponFromDef('swarm', 16, 2);
  assert(weapon.count === 32, 'Swarm count should be 32 (16 * 2)');
});

test('Missile (Torpedo) bank size scaling', () => {
  const weapon = createSecondaryWeaponFromDef('torpedo', 3, 2);
  assert(weapon.count === 6, 'Torpedo count should be 6 (3 * 2)');
});

test('Missile (Nuke) bank size scaling', () => {
  const weapon = createSecondaryWeaponFromDef('nuke', 1, 3);
  assert(weapon.count === 3, 'Nuke count should be 3 (1 * 3)');
  assert(weapon.isNuke === true, 'Should be marked as nuke');
  assert(weapon.aoeRadius === 100, 'Should have AoE radius');
});

// ============================================================
// Decoys - bank size affects count
// ============================================================

test('Decoy bank size 1 has base count', () => {
  const weapon = createDecoyWeapon(4, 1);
  assert(weapon.bankSize === 1, 'Bank size should be 1');
  assert(weapon.count === 4, 'Count should be 4');
  assert(weapon.maxCount === 4, 'Max count should be 4');
});

test('Decoy bank size 2 has doubled count', () => {
  const weapon = createDecoyWeapon(4, 2);
  assert(weapon.bankSize === 2, 'Bank size should be 2');
  assert(weapon.count === 8, 'Count should be 8 (4 * 2)');
  assert(weapon.maxCount === 8, 'Max count should be 8');
});

test('Decoy bank size 3 has tripled count', () => {
  const weapon = createDecoyWeapon(4, 3);
  assert(weapon.bankSize === 3, 'Bank size should be 3');
  assert(weapon.count === 12, 'Count should be 12 (4 * 3)');
  assert(weapon.maxCount === 12, 'Max count should be 12');
});

// ============================================================
// Mixed and Legacy Tests
// ============================================================

test('Mixed weapon banks with different sizes', () => {
  const weapons = createPrimaryWeapons([
    { name: 'plasma', size: 1 },
    { name: 'autocannon', size: 2 },
    { name: 'greenLaser', size: 3 },
  ]);
  assert(weapons.weapons.length === 3, 'Should have 3 weapons');

  // Plasma (energy, size 1)
  assert(weapons.weapons[0].bankSize === 1, 'Plasma bank size 1');
  assert(getEffectiveHeat(weapons.weapons[0]) === 5, 'Plasma effective heat 5');

  // Autocannon (ballistic, size 2)
  assert(weapons.weapons[1].bankSize === 2, 'Autocannon bank size 2');
  assert(weapons.weapons[1].ammo === 400, 'Autocannon ammo 400');

  // Green Laser (beam, size 3)
  assert(weapons.weapons[2].bankSize === 3, 'Green Laser bank size 3');
  assert(
    getEffectiveHeat(weapons.weapons[2]) === 4,
    'Green Laser effective heat 4',
  );
});

test('Legacy string format defaults to bank size 1', () => {
  const weapons = createPrimaryWeapons(['plasma', 'autocannon']);
  assert(
    weapons.weapons[0].bankSize === 1,
    'Plasma should default to bank size 1',
  );
  assert(
    weapons.weapons[1].bankSize === 1,
    'Autocannon should default to bank size 1',
  );
  assert(weapons.weapons[1].ammo === 200, 'Autocannon should have base ammo');
});

// Summary
console.log('');
console.log(`Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
