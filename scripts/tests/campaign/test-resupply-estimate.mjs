/**
 * Tests for resupply estimation and multi-ship resupply.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  estimateAllShipsResupplyCost,
  estimateShipResupplyCost,
  getAttentionReasons,
  resupplyAllShipsConstrained,
} from '../../../src/campaign/resupply/resupply-constrained.ts';
import { createSlotArray, getSlot } from '../../../src/campaign/slot-array.ts';
import { getMaxAmmoCapacity } from '../../../src/campaign/store/store-ammo.ts';

/** Create a test campaign state */
function createTestState(options = {}) {
  const {
    currentAmmo = 50,
    missileCount = 4,
    maxMissiles = 4,
    storedAmmo = 0,
    storeStockAmmo = 1000,
    credits = 1000,
  } = options;

  return {
    seed: 12345,
    nextId: 100,
    commanderId: 'commander1',
    credits,
    ships: [
      {
        id: 'ship1',
        shipClass: 'firefly',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo },
        ]),
        secondaryWeapons: createSlotArray([
          {
            weaponType: 'heatseeking',
            bankSize: 1,
            count: missileCount,
            maxCount: maxMissiles,
          },
        ]),
        pilot: { id: 'commander1', name: 'Commander' },
        hullDamage: 0,
        isPlayerShip: true,
      },
    ],
    pilots: [{ id: 'commander1', name: 'Commander' }],
    storedShips: [],
    storedWeapons: [],
    storedAmmo:
      storedAmmo > 0 ? [{ weaponType: 'autocannon', count: storedAmmo }] : [],
    storeStock: {
      ships: {},
      primaries: {},
      secondaries: { heatseeking: 100 },
      ammo: { autocannon: storeStockAmmo },
    },
    availableRecruits: [],
    currentSector: 1,
    completedContracts: [],
    missionCount: 0,
  };
}

describe('Resupply Estimate', () => {
  describe('resupplyAllShipsConstrained commander priority', () => {
    it('prioritizes commander ship over wingmen', () => {
      const state = {
        seed: 12345,
        nextId: 100,
        commanderId: 'commander1',
        credits: 1000,
        ships: [
          {
            id: 'ship2',
            shipClass: 'firefly',
            primaryWeapons: createSlotArray([
              { weaponType: 'autocannon', bankSize: 1, currentAmmo: 0 },
            ]),
            secondaryWeapons: createSlotArray([]),
            pilot: { id: 'pilot2', name: 'Wingman' },
            hullDamage: 0,
          },
          {
            id: 'ship1',
            shipClass: 'firefly',
            primaryWeapons: createSlotArray([
              { weaponType: 'autocannon', bankSize: 1, currentAmmo: 0 },
            ]),
            secondaryWeapons: createSlotArray([]),
            pilot: { id: 'commander1', name: 'Commander' },
            hullDamage: 0,
          },
        ],
        pilots: [],
        storedShips: [],
        storedWeapons: [],
        storedAmmo: [],
        storeStock: {
          ships: {},
          primaries: {},
          secondaries: {},
          ammo: { autocannon: 300 },
        },
        availableRecruits: [],
        currentSector: 1,
      };

      const result = resupplyAllShipsConstrained(state, 'commander1');

      const commanderShip = result.state.ships.find(
        (s) => s.pilot?.id === 'commander1',
      );
      const maxAmmo = getMaxAmmoCapacity('autocannon', 1);
      assert.strictEqual(
        getSlot(commanderShip.primaryWeapons, 0).currentAmmo,
        maxAmmo,
        'Commander ship fully supplied',
      );

      const wingmanShip = result.state.ships.find(
        (s) => s.pilot?.id === 'pilot2',
      );
      assert.strictEqual(
        getSlot(wingmanShip.primaryWeapons, 0).currentAmmo,
        100,
        'Wingman got remaining stock',
      );
    });
  });

  describe('estimateShipResupplyCost', () => {
    it('calculates storage and purchase split correctly', () => {
      const stateWithStorage = createTestState({
        currentAmmo: 100,
        storedAmmo: 50,
        storeStockAmmo: 1000,
        credits: 1000,
      });
      const estimate1 = estimateShipResupplyCost(stateWithStorage, 'ship1');

      assert.strictEqual(estimate1.fromStorage, 50, 'fromStorage is correct');
      assert.strictEqual(estimate1.toBuy, 50, 'toBuy is correct');
      assert.ok(estimate1.cost > 0, 'cost is positive');
      assert.strictEqual(estimate1.canAfford, true, 'can afford');
      assert.strictEqual(estimate1.hasStock, true, 'has stock');
    });

    it('detects insufficient store stock', () => {
      const stateNoStock = createTestState({
        currentAmmo: 0,
        storedAmmo: 0,
        storeStockAmmo: 50,
        credits: 10000,
      });
      const estimate2 = estimateShipResupplyCost(stateNoStock, 'ship1');

      assert.strictEqual(estimate2.toBuy, 50, 'toBuy limited by stock');
      assert.strictEqual(estimate2.hasStock, false, 'hasStock is false');
    });

    it('detects insufficient credits', () => {
      const stateLowCredits = createTestState({
        currentAmmo: 0,
        storedAmmo: 0,
        storeStockAmmo: 1000,
        credits: 1,
      });
      const estimate3 = estimateShipResupplyCost(stateLowCredits, 'ship1');

      assert.strictEqual(estimate3.canAfford, false, 'canAfford is false');
    });

    it('returns zero cost when full', () => {
      const stateFull = createTestState({
        currentAmmo: 200,
        storedAmmo: 0,
        storeStockAmmo: 1000,
        credits: 1000,
      });
      const estimate4 = estimateShipResupplyCost(stateFull, 'ship1');

      assert.strictEqual(estimate4.cost, 0, 'cost is 0 when full');
      assert.strictEqual(estimate4.toBuy, 0, 'nothing to buy');
    });

    it('returns zero cost when storage covers all needs', () => {
      const stateStorageOnly = createTestState({
        currentAmmo: 100,
        storedAmmo: 100,
        storeStockAmmo: 1000,
        credits: 1000,
      });
      const estimate5 = estimateShipResupplyCost(stateStorageOnly, 'ship1');

      assert.strictEqual(
        estimate5.cost,
        0,
        'cost is 0 when storage covers all',
      );
      assert.strictEqual(estimate5.fromStorage, 100, 'fromStorage covers all');
      assert.strictEqual(estimate5.toBuy, 0, 'nothing to buy');
    });
  });

  describe('estimateAllShipsResupplyCost', () => {
    it('calculates total for multiple ships with shared storage', () => {
      const twoShipState = {
        seed: 12345,
        nextId: 100,
        commanderId: 'commander1',
        credits: 1000,
        ships: [
          {
            id: 'ship1',
            shipClass: 'firefly',
            primaryWeapons: createSlotArray([
              { weaponType: 'autocannon', bankSize: 1, currentAmmo: 100 },
            ]),
            secondaryWeapons: createSlotArray([]),
            pilot: { id: 'commander1', name: 'Commander' },
          },
          {
            id: 'ship2',
            shipClass: 'firefly',
            primaryWeapons: createSlotArray([
              { weaponType: 'autocannon', bankSize: 1, currentAmmo: 150 },
            ]),
            secondaryWeapons: createSlotArray([]),
            pilot: { id: 'pilot2', name: 'Wingman' },
          },
        ],
        pilots: [],
        storedShips: [],
        storedWeapons: [],
        storedAmmo: [{ weaponType: 'autocannon', count: 30 }],
        storeStock: {
          ships: {},
          primaries: {},
          secondaries: {},
          ammo: { autocannon: 1000 },
        },
        availableRecruits: [],
        currentSector: 1,
      };

      const estimate = estimateAllShipsResupplyCost(twoShipState);

      assert.strictEqual(
        estimate.fromStorage + estimate.toBuy,
        150,
        'Total estimated matches needs',
      );
      assert.strictEqual(estimate.fromStorage, 30, 'Storage used first');
      assert.strictEqual(estimate.toBuy, 120, 'Remaining bought from store');
      assert.ok(estimate.cost > 0, 'Cost reflects store purchases');
      assert.strictEqual(estimate.hasStock, true, 'Has sufficient stock');
      assert.strictEqual(estimate.canAfford, true, 'Can afford');
    });
  });

  describe('getAttentionReasons', () => {
    it('reports empty primary slot', () => {
      const emptyPrimaryShip = {
        id: 'ship1',
        primaryWeapons: createSlotArray([
          null,
          { weaponType: 'plasma', bankSize: 1 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', count: 4, maxCount: 4 },
        ]),
      };
      const emptyPrimaryReasons = getAttentionReasons(emptyPrimaryShip);
      assert.ok(
        emptyPrimaryReasons.some((r) => r.includes('empty primary')),
        'Reports empty primary slot',
      );
    });

    it('reports low ammo', () => {
      const lowAmmoShip = {
        id: 'ship2',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 50 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', count: 4, maxCount: 4 },
        ]),
      };
      const lowAmmoReasons = getAttentionReasons(lowAmmoShip);
      assert.ok(
        lowAmmoReasons.some((r) => r.includes('Low ammo')),
        'Reports low ammo',
      );
    });

    it('reports low missiles', () => {
      const lowMissilesShip = {
        id: 'ship3',
        primaryWeapons: createSlotArray([
          { weaponType: 'plasma', bankSize: 1 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', count: 1, maxCount: 4 },
        ]),
      };
      const lowMissilesReasons = getAttentionReasons(lowMissilesShip);
      assert.ok(
        lowMissilesReasons.some((r) => r.includes('Low missiles')),
        'Reports low missiles',
      );
    });

    it('returns empty array for fully equipped ship', () => {
      const fullShip = {
        id: 'ship4',
        primaryWeapons: createSlotArray([
          { weaponType: 'autocannon', bankSize: 1, currentAmmo: 200 },
        ]),
        secondaryWeapons: createSlotArray([
          { weaponType: 'heatseeking', count: 4, maxCount: 4 },
        ]),
      };
      const fullReasons = getAttentionReasons(fullShip);
      assert.strictEqual(fullReasons.length, 0, 'No reasons for full ship');
    });
  });
});
