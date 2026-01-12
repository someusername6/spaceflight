/**
 * Tests for store stock caps - prevents infinite consumable accumulation.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createInitialStoreStock,
  generateSectorStock,
  getAmmoStockCap,
  getMissileStockCap,
} from '../../../src/campaign/store/store-catalog.ts';
import { applyStoreTrickle } from '../../../src/campaign/store/store-trickle.ts';
import { MISSILES } from '../../../src/data/missiles.ts';
import { PRIMARY_WEAPONS } from '../../../src/data/weapons.ts';

/** Create a minimal campaign state for trickle testing */
function createTestState(sector = 1, missionCount = 1) {
  return {
    seed: 12345,
    currentSector: sector,
    missionCount,
    storeStock: generateSectorStock(sector),
    credits: 1000,
    pilots: [],
    ships: [],
    contracts: [],
    version: 4,
    selectedContract: null,
    selectedShips: [],
    scrap: {},
    lastResults: null,
    missionStats: { started: 0, won: 0, lost: 0, aborted: 0 },
  };
}

describe('Store Stock Caps', () => {
  describe('getMissileStockCap', () => {
    it('calculates cap for sector 1 item', () => {
      // Seeker: capacity 8, sector 1, sectorsAvailable = 0
      const seekerCap = getMissileStockCap(8, 0);
      // base = 20 * 8 * 1.0 = 160
      // trickle = 2 * 8 = 16
      // cap = 160 + 8 * 16 = 288
      assert.strictEqual(seekerCap, 288, 'Seeker cap at sector 1');
    });

    it('calculates cap for established item', () => {
      // Seeker at sector 3 (2 sectors available)
      const seekerCap = getMissileStockCap(8, 2);
      // base = 20 * 8 * 1.5 = 240
      // trickle = 2 * 8 = 16
      // cap = 240 + 8 * 16 = 368
      assert.strictEqual(seekerCap, 368, 'Seeker cap with 2 sectors available');
    });

    it('scales with missile capacity', () => {
      // Compare swarm (capacity 20) vs seeker (capacity 8)
      const swarmCap = getMissileStockCap(20, 0);
      const seekerCap = getMissileStockCap(8, 0);
      assert.ok(
        swarmCap > seekerCap,
        'Higher capacity missiles have higher cap',
      );
    });
  });

  describe('getAmmoStockCap', () => {
    it('calculates cap for autocannon at sector 1', () => {
      // Autocannon: baseAmmo 200, sectorsAvailable = 0
      const autoCap = getAmmoStockCap(200, 0);
      // base = 12 * 200 * 1.0 = 2400
      // trickle = 1.5 * 200 = 300
      // cap = 2400 + 8 * 300 = 4800
      assert.strictEqual(autoCap, 4800, 'Autocannon cap at sector 1');
    });

    it('increases cap with sector availability', () => {
      const cap0 = getAmmoStockCap(200, 0);
      const cap2 = getAmmoStockCap(200, 2);
      assert.ok(cap2 > cap0, 'Cap increases with sectors available');
    });
  });

  describe('applyStoreTrickle caps', () => {
    it('stops missile trickle at cap', () => {
      let state = createTestState(1, 1);
      const seekerCap = getMissileStockCap(
        MISSILES.seeker.capacity,
        0, // sector 1, unlocks at 1
      );

      // Apply trickle many times to exceed natural cap
      for (let i = 1; i <= 50; i++) {
        state = { ...state, missionCount: i };
        state = applyStoreTrickle(state);
      }

      assert.strictEqual(
        state.storeStock.secondaries.seeker,
        seekerCap,
        `Seeker stock capped at ${seekerCap}`,
      );
    });

    it('stops ammo trickle at cap', () => {
      let state = createTestState(1, 1);
      const autoCap = getAmmoStockCap(
        PRIMARY_WEAPONS.autocannon.ammo,
        0, // sector 1, unlocks at 1
      );

      // Apply trickle many times to exceed natural cap
      for (let i = 1; i <= 50; i++) {
        state = { ...state, missionCount: i };
        state = applyStoreTrickle(state);
      }

      assert.strictEqual(
        state.storeStock.ammo.autocannon,
        autoCap,
        `Autocannon ammo capped at ${autoCap}`,
      );
    });

    it('does not cap primaries', () => {
      let state = createTestState(1, 1);
      const initialPrimaries = state.storeStock.primaries.plasma;

      // Apply trickle many times
      for (let i = 1; i <= 100; i++) {
        state = { ...state, missionCount: i };
        state = applyStoreTrickle(state);
      }

      // Primaries should be able to grow beyond any reasonable cap
      // With 40% chance and 100 missions, expected ~40 additions
      assert.ok(
        state.storeStock.primaries.plasma > initialPrimaries + 20,
        'Primaries can grow significantly (probabilistic)',
      );
    });

    it('uses correct cap for later sector unlocks', () => {
      // Test at sector 3 where torpedo unlocks
      let state = createTestState(3, 1);
      const torpedoCap = getMissileStockCap(
        MISSILES.torpedo.capacity,
        0, // unlocks at sector 3, so 0 sectors available
      );

      // Apply trickle many times
      for (let i = 1; i <= 50; i++) {
        state = { ...state, missionCount: i };
        state = applyStoreTrickle(state);
      }

      assert.strictEqual(
        state.storeStock.secondaries.torpedo,
        torpedoCap,
        `Torpedo stock capped at ${torpedoCap}`,
      );
    });

    it('does not exceed cap when already at cap', () => {
      let state = createTestState(1, 1);
      const seekerCap = getMissileStockCap(MISSILES.seeker.capacity, 0);
      const autoCap = getAmmoStockCap(PRIMARY_WEAPONS.autocannon.ammo, 0);

      // Manually set stock to exactly the cap
      state.storeStock.secondaries.seeker = seekerCap;
      state.storeStock.ammo.autocannon = autoCap;

      // Apply trickle
      state = applyStoreTrickle(state);

      // Stock should remain at cap, not increase
      assert.strictEqual(
        state.storeStock.secondaries.seeker,
        seekerCap,
        'Seeker stays at cap',
      );
      assert.strictEqual(
        state.storeStock.ammo.autocannon,
        autoCap,
        'Autocannon ammo stays at cap',
      );
    });

    it('does not exceed cap when slightly below cap', () => {
      let state = createTestState(1, 1);
      const seekerCap = getMissileStockCap(MISSILES.seeker.capacity, 0);

      // Set stock to just below cap (cap - 1)
      state.storeStock.secondaries.seeker = seekerCap - 1;

      // Apply trickle (would normally add 16 for seeker)
      state = applyStoreTrickle(state);

      // Stock should be capped, not cap + 15
      assert.strictEqual(
        state.storeStock.secondaries.seeker,
        seekerCap,
        'Seeker clamped to cap, not exceeded',
      );
    });
  });

  describe('sector restock vs caps', () => {
    it('sector restock is below cap', () => {
      // Verify that initial sector stock is always below the cap
      const stock = createInitialStoreStock();
      const seekerCap = getMissileStockCap(MISSILES.seeker.capacity, 0);
      const autoCap = getAmmoStockCap(PRIMARY_WEAPONS.autocannon.ammo, 0);

      assert.ok(
        stock.secondaries.seeker < seekerCap,
        'Initial seeker stock below cap',
      );
      assert.ok(
        stock.ammo.autocannon < autoCap,
        'Initial autocannon ammo below cap',
      );
    });

    it('cap equals base + 8 missions of trickle', () => {
      // Verify the formula: cap = base + (8 * trickle)
      const seekerBase = 160; // 20 * 8
      const seekerTrickle = 16; // 2 * 8
      const expectedCap = seekerBase + 8 * seekerTrickle;

      assert.strictEqual(
        getMissileStockCap(8, 0),
        expectedCap,
        'Cap matches formula',
      );
    });
  });
});
