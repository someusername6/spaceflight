/**
 * Tests for resupply needs detection and single ship resupply.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getShipResupplyNeeds,
  needsAmmoResupply,
  needsAttention,
  needsResupply,
} from '../../../src/campaign/resupply/resupply-constrained.ts';
import { createSlotArray } from '../../../src/campaign/slot-array.ts';
import { getMaxAmmoCapacity } from '../../../src/campaign/store/store-ammo.ts';

describe('Resupply Needs', () => {
  describe('needsResupply', () => {
    it('returns false for full ship', () => {
      const fullShip = {
        id: 'ship1',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsResupply(fullShip),
        false,
        'Full ship does not need resupply',
      );
    });

    it('returns true for low ammo ship', () => {
      const lowAmmoShip = {
        id: 'ship2',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsResupply(lowAmmoShip),
        true,
        'Low ammo ship needs resupply',
      );
    });

    it('returns true for low missiles ship', () => {
      const lowMissilesShip = {
        id: 'ship3',
        primaryWeapons: createSlotArray([
          { weaponType: 'plasma', bankSize: 1 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 2, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsResupply(lowMissilesShip),
        true,
        'Low missiles ship needs resupply',
      );
    });

    it('returns true for empty primary slot', () => {
      const emptyPrimaryShip = {
        id: 'ship4',
        primaryWeapons: createSlotArray([
          null,
          { weaponType: 'plasma', bankSize: 1 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsResupply(emptyPrimaryShip),
        true,
        'Empty primary slot needs attention',
      );
    });

    it('returns true for empty secondary slot', () => {
      const emptySecondaryShip = {
        id: 'ship5',
        primaryWeapons: createSlotArray([
          { weaponType: 'plasma', bankSize: 1 },
        ]),
        secondaryWeapons: createSlotArray([null]),
      };
      assert.strictEqual(
        needsResupply(emptySecondaryShip),
        true,
        'Empty secondary slot needs attention',
      );
    });
  });

  describe('needsAmmoResupply (excludes empty slots)', () => {
    it('returns false for empty slot with full ammo', () => {
      const emptySlotFullAmmo = {
        id: 'ship1',
        primaryWeapons: createSlotArray([
          null,
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsAmmoResupply(emptySlotFullAmmo),
        false,
        'Empty slot with full ammo does NOT need ammo resupply',
      );
    });

    it('returns true for needsAttention with empty slot', () => {
      const emptySlotFullAmmo = {
        id: 'ship1',
        primaryWeapons: createSlotArray([
          null,
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsAttention(emptySlotFullAmmo),
        true,
        'Empty slot DOES need attention (warning icon)',
      );
    });

    it('returns true for low ammo', () => {
      const lowAmmo = {
        id: 'ship2',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
      };
      assert.strictEqual(
        needsAmmoResupply(lowAmmo),
        true,
        'Low ammo needs ammo resupply',
      );
    });

    it('returns false for fully equipped ship', () => {
      const fullyEquipped = {
        id: 'ship3',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 4, maxCount: 4 },
        ]),
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
    });
  });

  describe('getShipResupplyNeeds', () => {
    it('calculates ammo and missile needs correctly', () => {
      const ship = {
        id: 'ship1',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', bankSize: 1, count: 2, maxCount: 4 },
        ]),
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
    });
  });
});
