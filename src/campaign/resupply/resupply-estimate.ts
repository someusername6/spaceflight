/**
 * Resupply Estimate - Cost estimation for resupply operations.
 */

import { getAmmoPrice, getSecondaryPrice } from '../../data/prices';
import type { CampaignState } from '../types';
import { getShipResupplyNeeds } from './resupply-needs';

/** Estimated cost for resupply (accounts for storage) */
export interface ResupplyCostEstimate {
  cost: number;
  fromStorage: number;
  toBuy: number;
  canAfford: boolean;
  hasStock: boolean;
}

/** Estimate resupply cost for a single ship (storage is free, store costs credits) */
export function estimateShipResupplyCost(
  state: CampaignState,
  shipId: string,
): ResupplyCostEstimate {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship) {
    return {
      cost: 0,
      fromStorage: 0,
      toBuy: 0,
      canAfford: true,
      hasStock: true,
    };
  }

  const needs = getShipResupplyNeeds(ship);
  if (needs.totalNeeded === 0) {
    return {
      cost: 0,
      fromStorage: 0,
      toBuy: 0,
      canAfford: true,
      hasStock: true,
    };
  }

  let cost = 0;
  let fromStorage = 0;
  let toBuy = 0;
  let hasStock = true;

  // Calculate ammo costs
  for (const [weaponType, needed] of needs.ammo) {
    let remaining = needed;

    // Check storage first (free)
    const stored = state.storedAmmo.find((a) => a.weaponType === weaponType);
    if (stored) {
      const fromStored = Math.min(remaining, stored.count);
      fromStorage += fromStored;
      remaining -= fromStored;
    }

    // Rest needs to be bought
    if (remaining > 0) {
      const stock = state.storeStock.ammo[weaponType] ?? 0;
      const canBuy = Math.min(remaining, stock);
      if (canBuy < remaining) hasStock = false;
      toBuy += canBuy;
      const pricePerUnit = getAmmoPrice(weaponType, 'buy');
      cost += Math.round(canBuy * pricePerUnit);
    }
  }

  // Calculate missile costs
  for (const [weaponType, needed] of needs.missiles) {
    let remaining = needed;

    // Check stored weapons first (free)
    const stored = state.storedWeapons.find(
      (w) => w.weaponType === weaponType && w.category === 'secondary',
    );
    if (stored) {
      const fromStored = Math.min(remaining, stored.count);
      fromStorage += fromStored;
      remaining -= fromStored;
    }

    // Rest needs to be bought
    if (remaining > 0) {
      const stock = state.storeStock.secondaries[weaponType] ?? 0;
      const canBuy = Math.min(remaining, stock);
      if (canBuy < remaining) hasStock = false;
      toBuy += canBuy;
      const pricePerUnit = getSecondaryPrice(weaponType, 'buy');
      cost += canBuy * pricePerUnit;
    }
  }

  return {
    cost,
    fromStorage,
    toBuy,
    canAfford: state.credits >= cost,
    hasStock,
  };
}

/** Estimate total resupply cost for all ships */
export function estimateAllShipsResupplyCost(
  state: CampaignState,
): ResupplyCostEstimate {
  let totalCost = 0;
  let totalFromStorage = 0;
  let totalToBuy = 0;
  let hasStock = true;

  // We need to track remaining storage as we go through ships
  const remainingStoredAmmo = new Map<string, number>();
  for (const stored of state.storedAmmo) {
    remainingStoredAmmo.set(stored.weaponType, stored.count);
  }
  const remainingStoredMissiles = new Map<string, number>();
  for (const stored of state.storedWeapons) {
    if (stored.category === 'secondary') {
      remainingStoredMissiles.set(
        stored.weaponType,
        (remainingStoredMissiles.get(stored.weaponType) ?? 0) + stored.count,
      );
    }
  }
  const remainingStock = {
    ammo: { ...state.storeStock.ammo },
    secondaries: { ...state.storeStock.secondaries },
  };

  for (const ship of state.ships) {
    const needs = getShipResupplyNeeds(ship);

    // Calculate ammo costs
    for (const [weaponType, needed] of needs.ammo) {
      let remaining = needed;

      // Storage first
      const stored = remainingStoredAmmo.get(weaponType) ?? 0;
      if (stored > 0) {
        const fromStored = Math.min(remaining, stored);
        totalFromStorage += fromStored;
        remaining -= fromStored;
        remainingStoredAmmo.set(weaponType, stored - fromStored);
      }

      // Buy from store
      if (remaining > 0) {
        const stock = remainingStock.ammo[weaponType] ?? 0;
        const canBuy = Math.min(remaining, stock);
        if (canBuy < remaining) hasStock = false;
        totalToBuy += canBuy;
        const pricePerUnit = getAmmoPrice(weaponType, 'buy');
        totalCost += Math.round(canBuy * pricePerUnit);
        remainingStock.ammo[weaponType] = stock - canBuy;
      }
    }

    // Calculate missile costs
    for (const [weaponType, needed] of needs.missiles) {
      let remaining = needed;

      // Storage first
      const stored = remainingStoredMissiles.get(weaponType) ?? 0;
      if (stored > 0) {
        const fromStored = Math.min(remaining, stored);
        totalFromStorage += fromStored;
        remaining -= fromStored;
        remainingStoredMissiles.set(weaponType, stored - fromStored);
      }

      // Buy from store
      if (remaining > 0) {
        const stock = remainingStock.secondaries[weaponType] ?? 0;
        const canBuy = Math.min(remaining, stock);
        if (canBuy < remaining) hasStock = false;
        totalToBuy += canBuy;
        const pricePerUnit = getSecondaryPrice(weaponType, 'buy');
        totalCost += canBuy * pricePerUnit;
        remainingStock.secondaries[weaponType] = stock - canBuy;
      }
    }
  }

  return {
    cost: totalCost,
    fromStorage: totalFromStorage,
    toBuy: totalToBuy,
    canAfford: state.credits >= totalCost,
    hasStock,
  };
}
