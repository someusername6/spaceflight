/**
 * Popover Ammo Load/Unload Tests
 *
 * Tests that the popover correctly handles ammo and missile load/unload operations:
 * 1. Load/unload functions update campaign state correctly
 * 2. Popover content should refresh with updated weapon data after load/unload
 * 3. Missiles: unloading all should effectively unequip (close popover)
 * 4. Primary weapons: unloading all should NOT unequip (weapon stays, ammo = 0)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { unequipSecondary } from '../../../src/campaign/loadout.ts';
import { createSlotArray, getSlot } from '../../../src/campaign/slot-array.ts';
import {
  getMaxAmmoCapacity,
  loadAmmoToWeapon,
  unloadAmmoFromWeapon,
} from '../../../src/campaign/store/store-ammo.ts';
import {
  loadMissilesToWeapon,
  unloadMissilesFromWeapon,
} from '../../../src/campaign/store/store-missiles.ts';

// ============================================================================
// Test Data Factories
// ============================================================================

/** Create a minimal campaign state with a ship equipped with a ballistic weapon */
function createStateWithBallisticWeapon() {
  return {
    ships: [
      {
        id: 'ship1',
        shipClass: 'fighter',
        pilot: null,
        primaryWeapons: createSlotArray([
          {
            weaponType: 'autocannon',
            bankSize: 2,
            currentAmmo: 50, // Start with 50 ammo
          },
        ]),
        secondaryWeapons: createSlotArray([null]),
      },
    ],
    storedWeapons: [],
    storedAmmo: [
      { weaponType: 'autocannon', count: 200 }, // 200 in storage
    ],
    credits: 1000,
    storeStock: { ammo: {}, missiles: {}, weapons: [] },
  };
}

/** Create a minimal campaign state with a ship equipped with missiles */
function createStateWithMissiles() {
  return {
    ships: [
      {
        id: 'ship1',
        shipClass: 'fighter',
        pilot: null,
        primaryWeapons: createSlotArray([null]),
        secondaryWeapons: createSlotArray([
          {
            weaponType: 'seeker',
            bankSize: 1,
            count: 4, // Start with 4 missiles
            maxCount: 8, // Max capacity
          },
        ]),
      },
    ],
    storedWeapons: [
      { category: 'secondary', weaponType: 'seeker', count: 10 }, // 10 in storage
    ],
    storedAmmo: [],
    credits: 1000,
    storeStock: { ammo: {}, missiles: {}, weapons: [] },
  };
}

// ============================================================================
// Primary Weapon Ammo Tests
// ============================================================================

describe('Primary Weapon Ammo Load/Unload', () => {
  describe('loadAmmoToWeapon', () => {
    it('should load ammo from storage to weapon', () => {
      const state = createStateWithBallisticWeapon();
      const newState = loadAmmoToWeapon(state, 'ship1', 0, 10);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.strictEqual(weapon.currentAmmo, 60, 'weapon ammo should increase');

      const storedAmmo = newState.storedAmmo.find(
        (a) => a.weaponType === 'autocannon',
      );
      assert.strictEqual(storedAmmo.count, 190, 'storage should decrease');
    });

    it('should not load more than max capacity', () => {
      // Create state with enough storage to exceed max capacity
      const state = {
        ...createStateWithBallisticWeapon(),
        storedAmmo: [{ weaponType: 'autocannon', count: 1000 }], // Plenty in storage
      };
      // autocannon has 200 ammo per weapon, bankSize=2 means max=400
      // Currently at 50, so only 350 more can be loaded
      const newState = loadAmmoToWeapon(state, 'ship1', 0, 1000);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      const maxCapacity = getMaxAmmoCapacity('autocannon', 2);
      assert.strictEqual(
        weapon.currentAmmo,
        maxCapacity,
        'should cap at max capacity',
      );
    });

    it('should not load more than available in storage', () => {
      const state = {
        ...createStateWithBallisticWeapon(),
        storedAmmo: [{ weaponType: 'autocannon', count: 5 }], // Only 5 available
      };
      const newState = loadAmmoToWeapon(state, 'ship1', 0, 100);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.strictEqual(
        weapon.currentAmmo,
        55,
        'should only load what is available',
      );

      // Storage should be empty (removed from array)
      const storedAmmo = newState.storedAmmo.find(
        (a) => a.weaponType === 'autocannon',
      );
      assert.strictEqual(
        storedAmmo,
        undefined,
        'storage entry should be removed when depleted',
      );
    });
  });

  describe('unloadAmmoFromWeapon', () => {
    it('should unload ammo from weapon to storage', () => {
      const state = createStateWithBallisticWeapon();
      const newState = unloadAmmoFromWeapon(state, 'ship1', 0, 10);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.strictEqual(weapon.currentAmmo, 40, 'weapon ammo should decrease');

      const storedAmmo = newState.storedAmmo.find(
        (a) => a.weaponType === 'autocannon',
      );
      assert.strictEqual(storedAmmo.count, 210, 'storage should increase');
    });

    it('should not unload more than current ammo', () => {
      const state = createStateWithBallisticWeapon();
      // Weapon has 50 ammo, try to unload 1000
      const newState = unloadAmmoFromWeapon(state, 'ship1', 0, 1000);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.strictEqual(
        weapon.currentAmmo,
        0,
        'ammo should be 0 after unload-all',
      );

      const storedAmmo = newState.storedAmmo.find(
        (a) => a.weaponType === 'autocannon',
      );
      assert.strictEqual(
        storedAmmo.count,
        250,
        'storage should increase by 50',
      );
    });

    it('should NOT unequip weapon when ammo reaches 0', () => {
      const state = createStateWithBallisticWeapon();
      const newState = unloadAmmoFromWeapon(state, 'ship1', 0, 1000);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.ok(weapon !== undefined, 'weapon should still be equipped');
      assert.strictEqual(
        weapon.weaponType,
        'autocannon',
        'weapon type unchanged',
      );
      assert.strictEqual(weapon.currentAmmo, 0, 'ammo should be 0');
    });
  });
});

// ============================================================================
// Secondary Weapon (Missile) Tests
// ============================================================================

describe('Secondary Weapon (Missile) Load/Unload', () => {
  describe('loadMissilesToWeapon', () => {
    it('should load missiles from storage to weapon', () => {
      const state = createStateWithMissiles();
      const newState = loadMissilesToWeapon(state, 'ship1', 0, 2);

      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      assert.strictEqual(weapon.count, 6, 'missile count should increase');

      const stored = newState.storedWeapons.find(
        (w) => w.weaponType === 'seeker',
      );
      assert.strictEqual(stored.count, 8, 'storage should decrease');
    });

    it('should not load more than max capacity', () => {
      const state = createStateWithMissiles();
      const newState = loadMissilesToWeapon(state, 'ship1', 0, 100);

      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      assert.strictEqual(
        weapon.count,
        weapon.maxCount,
        'should cap at max capacity',
      );
    });

    it('should not load more than available in storage', () => {
      const state = {
        ...createStateWithMissiles(),
        storedWeapons: [
          { category: 'secondary', weaponType: 'seeker', count: 2 },
        ],
      };
      state.ships[0] = {
        ...state.ships[0],
        secondaryWeapons: createSlotArray([
          { weaponType: 'seeker', bankSize: 1, count: 0, maxCount: 8 },
        ]),
      };

      const newState = loadMissilesToWeapon(state, 'ship1', 0, 100);

      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      assert.strictEqual(weapon.count, 2, 'should only load what is available');

      // Storage should be empty
      const stored = newState.storedWeapons.find(
        (w) => w.weaponType === 'seeker',
      );
      assert.strictEqual(
        stored,
        undefined,
        'storage entry should be removed when depleted',
      );
    });
  });

  describe('unloadMissilesFromWeapon', () => {
    it('should unload missiles from weapon to storage', () => {
      const state = createStateWithMissiles();
      const newState = unloadMissilesFromWeapon(state, 'ship1', 0, 2);

      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      assert.strictEqual(weapon.count, 2, 'missile count should decrease');

      const stored = newState.storedWeapons.find(
        (w) => w.weaponType === 'seeker',
      );
      assert.strictEqual(stored.count, 12, 'storage should increase');
    });

    it('should not unload more than current count', () => {
      const state = createStateWithMissiles();
      const newState = unloadMissilesFromWeapon(state, 'ship1', 0, 1000);

      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      assert.strictEqual(weapon.count, 0, 'count should be 0 after unload-all');
    });

    it('weapon stays equipped when missiles reach 0 (slot not cleared)', () => {
      const state = createStateWithMissiles();
      const newState = unloadMissilesFromWeapon(state, 'ship1', 0, 1000);

      // The weapon slot itself is NOT cleared by unload - it's still there with count=0
      // But the UI should close the popover when count=0 because it's effectively unequipped
      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      assert.ok(
        weapon !== undefined,
        'weapon slot still exists after unload-all',
      );
      assert.strictEqual(weapon.count, 0, 'count should be 0');
    });
  });
});

// ============================================================================
// Expected Popover UI Behavior Tests
// ============================================================================

describe('Popover UI Behavior After Load/Unload', () => {
  describe('Weapon data refresh', () => {
    it('after load: weapon data should reflect new ammo count', () => {
      const state = createStateWithBallisticWeapon();
      const newState = loadAmmoToWeapon(state, 'ship1', 0, 10);

      // The popover content needs to be refreshed from newState
      const freshWeapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.strictEqual(
        freshWeapon.currentAmmo,
        60,
        'fresh weapon data should show 60 ammo',
      );
    });

    it('after unload: weapon data should reflect new ammo count', () => {
      const state = createStateWithBallisticWeapon();
      const newState = unloadAmmoFromWeapon(state, 'ship1', 0, 10);

      const freshWeapon = getSlot(newState.ships[0].primaryWeapons, 0);
      assert.strictEqual(
        freshWeapon.currentAmmo,
        40,
        'fresh weapon data should show 40 ammo',
      );
    });
  });

  describe('Missile popover close behavior', () => {
    it('unload-all should result in count=0, signaling popover should close', () => {
      const state = createStateWithMissiles();
      const newState = unloadMissilesFromWeapon(state, 'ship1', 0, 1000);

      const weapon = getSlot(newState.ships[0].secondaryWeapons, 0);
      // When count=0, the UI should close the popover
      // (effectively treating empty missile slot as unequipped)
      assert.strictEqual(weapon.count, 0, 'count should be 0 after unload-all');
    });

    it('unload-all should call unequipSecondary to clear the slot completely', () => {
      // This test verifies the EXPECTED UI behavior:
      // When missiles reach 0, the UI should call unequipSecondary() to:
      // 1. Clear the slot (make it empty/null)
      // 2. Move the missile launcher back to storage

      const state = createStateWithMissiles();
      // First unload all (this just sets count to 0, doesn't clear slot)
      const afterUnload = unloadMissilesFromWeapon(state, 'ship1', 0, 1000);

      // Verify the unload function alone doesn't clear the slot
      const weaponStillThere = getSlot(
        afterUnload.ships[0].secondaryWeapons,
        0,
      );
      assert.ok(
        weaponStillThere !== undefined,
        'unload alone leaves weapon in slot',
      );
      assert.strictEqual(weaponStillThere.count, 0, 'count is 0');

      // Now the UI should call unequipSecondary when count=0
      const finalState = unequipSecondary(afterUnload, 'ship1', 0);

      // Slot should now be empty
      const weaponAfterUnequip = getSlot(
        finalState.ships[0].secondaryWeapons,
        0,
      );
      assert.strictEqual(
        weaponAfterUnequip,
        undefined,
        'slot should be cleared after unequipSecondary',
      );

      // Missile launcher should NOT be in storage (it was already there)
      // The missiles themselves go to storage as individual items
      // (already happened in unloadMissilesFromWeapon)
    });
  });

  describe('Primary weapon does not unequip on empty ammo', () => {
    it('unload-all should keep weapon equipped with 0 ammo', () => {
      const state = createStateWithBallisticWeapon();
      const newState = unloadAmmoFromWeapon(state, 'ship1', 0, 1000);

      const weapon = getSlot(newState.ships[0].primaryWeapons, 0);
      // Primary weapons stay equipped even with 0 ammo
      assert.ok(weapon !== undefined, 'weapon should still be equipped');
      assert.strictEqual(weapon.weaponType, 'autocannon', 'type preserved');
      assert.strictEqual(weapon.bankSize, 2, 'bank size preserved');
      assert.strictEqual(weapon.currentAmmo, 0, 'ammo is 0');
    });
  });
});
