/**
 * Tests for resupply needs detection and single ship resupply.
 */

import assert from 'node:assert';
import {
  getShipResupplyNeeds,
  needsAmmoResupply,
  needsAttention,
  needsResupply,
} from '../../../src/campaign/resupply-constrained.ts';
import { getMaxAmmoCapacity } from '../../../src/campaign/store-ammo.ts';

console.log('=== Resupply Needs Tests ===\n');

// Test: needsResupply detects low ammo
console.log('Testing needsResupply...');
{
  const fullShip = {
    id: 'ship1',
    primaryWeapons: [
      { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
    ],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 4, maxCount: 4 }],
  };
  assert.strictEqual(
    needsResupply(fullShip),
    false,
    'Full ship does not need resupply',
  );

  const lowAmmoShip = {
    id: 'ship2',
    primaryWeapons: [
      { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
    ],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 4, maxCount: 4 }],
  };
  assert.strictEqual(
    needsResupply(lowAmmoShip),
    true,
    'Low ammo ship needs resupply',
  );

  const lowMissilesShip = {
    id: 'ship3',
    primaryWeapons: [{ weaponType: 'plasma', bankSize: 1 }],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 2, maxCount: 4 }],
  };
  assert.strictEqual(
    needsResupply(lowMissilesShip),
    true,
    'Low missiles ship needs resupply',
  );

  const emptyPrimaryShip = {
    id: 'ship4',
    primaryWeapons: [null, { weaponType: 'plasma', bankSize: 1 }],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 4, maxCount: 4 }],
  };
  assert.strictEqual(
    needsResupply(emptyPrimaryShip),
    true,
    'Empty primary slot needs attention',
  );

  const emptySecondaryShip = {
    id: 'ship5',
    primaryWeapons: [{ weaponType: 'plasma', bankSize: 1 }],
    secondaryWeapons: [null],
  };
  assert.strictEqual(
    needsResupply(emptySecondaryShip),
    true,
    'Empty secondary slot needs attention',
  );

  console.log('  - Full ship detection: PASS');
  console.log('  - Low ammo detection: PASS');
  console.log('  - Low missiles detection: PASS');
  console.log('  - Empty primary slot detection: PASS');
  console.log('  - Empty secondary slot detection: PASS');
}

// Test: needsAmmoResupply only detects ammo/missile needs, not empty slots
console.log('\nTesting needsAmmoResupply (excludes empty slots)...');
{
  const emptySlotFullAmmo = {
    id: 'ship1',
    primaryWeapons: [
      null,
      { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
    ],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 4, maxCount: 4 }],
  };
  assert.strictEqual(
    needsAmmoResupply(emptySlotFullAmmo),
    false,
    'Empty slot with full ammo does NOT need ammo resupply',
  );
  assert.strictEqual(
    needsAttention(emptySlotFullAmmo),
    true,
    'Empty slot DOES need attention (warning icon)',
  );

  const lowAmmo = {
    id: 'ship2',
    primaryWeapons: [
      { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
    ],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 4, maxCount: 4 }],
  };
  assert.strictEqual(
    needsAmmoResupply(lowAmmo),
    true,
    'Low ammo needs ammo resupply',
  );

  const fullyEquipped = {
    id: 'ship3',
    primaryWeapons: [
      { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
    ],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 4, maxCount: 4 }],
  };
  assert.strictEqual(
    needsAmmoResupply(fullyEquipped),
    false,
    'Fully equipped ship does NOT need ammo resupply',
  );
  assert.strictEqual(
    needsAttention(fullyEquipped),
    false,
    'Fully equipped ship does NOT need attention',
  );

  console.log('  - Empty slot full ammo: no ammo resupply needed: PASS');
  console.log('  - Empty slot full ammo: attention needed: PASS');
  console.log('  - Low ammo: ammo resupply needed: PASS');
  console.log('  - Fully equipped: nothing needed: PASS');
}

// Test: getShipResupplyNeeds calculates correctly
console.log('\nTesting getShipResupplyNeeds...');
{
  const ship = {
    id: 'ship1',
    primaryWeapons: [
      { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
    ],
    secondaryWeapons: [{ weaponType: 'heatseeking', count: 2, maxCount: 4 }],
  };
  const needs = getShipResupplyNeeds(ship);

  const maxAmmo = getMaxAmmoCapacity('autocannon', 1);
  assert.strictEqual(
    needs.ammo.get('autocannon'),
    maxAmmo - 50,
    'Correct ammo needed',
  );
  assert.strictEqual(
    needs.missiles.get('heatseeking'),
    2,
    'Correct missiles needed',
  );
  assert.strictEqual(
    needs.totalNeeded,
    maxAmmo - 50 + 2,
    'Total needed is correct',
  );

  console.log('  - Ammo needs calculation: PASS');
  console.log('  - Missile needs calculation: PASS');
}

console.log('\n=== All Resupply Needs Tests Passed ===');
