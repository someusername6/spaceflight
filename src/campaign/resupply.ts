/**
 * Resupply functions - calculate and apply resupply for ships.
 */

import { getAmmoPrice, getSecondaryPrice } from '../data/prices';
import { getMaxAmmoCapacity } from './store-ammo';
import type { CampaignState, EquippedPrimary, OwnedShip } from './types';

// Re-export constrained resupply functions
export {
  estimateAllShipsResupplyCost,
  estimateShipResupplyCost,
  getShipResupplyNeeds,
  needsAmmoResupply,
  needsAttention,
  needsResupply,
  type ResupplyCostEstimate,
  type ResupplyResult,
  resupplyAllShipsConstrained,
  resupplyShipConstrained,
  type ShipResupplyNeeds,
} from './resupply-constrained';

/** Get max ammo capacity for a primary weapon (convenience wrapper) */
function getMaxPrimaryAmmo(primary: EquippedPrimary): number {
  return getMaxAmmoCapacity(primary.weaponType, primary.bankSize);
}

/** Calculate resupply cost for a single ship (ignores store stock) */
export function calculateResupplyCost(ship: OwnedShip): number {
  let cost = 0;

  // Primary weapons with finite ammo (skip null slots)
  for (const primary of ship.primaryWeapons) {
    if (primary === null) continue;
    if (primary.currentAmmo !== undefined) {
      const maxAmmo = getMaxPrimaryAmmo(primary);
      const needed = maxAmmo - primary.currentAmmo;
      const pricePerUnit = getAmmoPrice(primary.weaponType, 'buy');
      // Round to avoid fractional credits
      cost += Math.round(Math.max(0, needed) * pricePerUnit);
    }
  }

  // Secondary weapons - use actual missile prices (skip null slots)
  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) continue;
    const needed = secondary.maxCount - secondary.count;
    const pricePerUnit = getSecondaryPrice(secondary.weaponType, 'buy');
    cost += needed * pricePerUnit;
  }

  return cost;
}

/** Resupply a ship (refill all ammo, ignores store stock) */
export function resupplyShip(ship: OwnedShip): OwnedShip {
  return {
    ...ship,
    primaryWeapons: ship.primaryWeapons.map((primary) => {
      if (primary === null) return null;
      if (primary.currentAmmo !== undefined) {
        const maxAmmo = getMaxPrimaryAmmo(primary);
        return { ...primary, currentAmmo: maxAmmo };
      }
      return primary;
    }),
    secondaryWeapons: ship.secondaryWeapons.map((secondary) => {
      if (secondary === null) return null;
      return { ...secondary, count: secondary.maxCount };
    }),
  };
}

/** Resupply all ships in campaign (deduct cost from credits, ignores store stock) */
export function resupplyAllShips(state: CampaignState): CampaignState {
  let totalCost = 0;
  for (const ship of state.ships) {
    totalCost += calculateResupplyCost(ship);
  }

  if (totalCost > state.credits) {
    // Can't afford - return unchanged
    return state;
  }

  return {
    ...state,
    credits: state.credits - totalCost,
    ships: state.ships.map(resupplyShip),
  };
}

/** Aggregate ammo/missile needs across all ships */
interface ResupplyNeeds {
  ammo: Map<string, number>; // weaponType -> total needed
  missiles: Map<string, number>; // weaponType -> total needed
}

function aggregateResupplyNeeds(ships: OwnedShip[]): ResupplyNeeds {
  const ammo = new Map<string, number>();
  const missiles = new Map<string, number>();

  for (const ship of ships) {
    for (const primary of ship.primaryWeapons) {
      if (primary === null || primary.currentAmmo === undefined) continue;
      const maxAmmo = getMaxPrimaryAmmo(primary);
      const needed = Math.max(0, maxAmmo - primary.currentAmmo);
      if (needed > 0) {
        ammo.set(
          primary.weaponType,
          (ammo.get(primary.weaponType) ?? 0) + needed,
        );
      }
    }
    for (const secondary of ship.secondaryWeapons) {
      if (secondary === null) continue;
      const needed = Math.max(0, secondary.maxCount - secondary.count);
      if (needed > 0) {
        missiles.set(
          secondary.weaponType,
          (missiles.get(secondary.weaponType) ?? 0) + needed,
        );
      }
    }
  }

  return { ammo, missiles };
}

/** Resupply status for the store */
export interface ResupplyStatus {
  status: 'supplied' | 'insufficient' | 'available';
  cost: number;
  hasShortages: boolean;
}

/** Get resupply status considering store stock */
export function getResupplyStatus(state: CampaignState): ResupplyStatus {
  const needs = aggregateResupplyNeeds(state.ships);
  let cost = 0;
  let totalNeeded = 0;
  let totalCanBuy = 0;

  // Calculate for ammo
  for (const [weaponType, needed] of needs.ammo) {
    totalNeeded += needed;
    const stock = state.storeStock.ammo[weaponType] ?? 0;
    const canBuy = Math.min(needed, stock);
    totalCanBuy += canBuy;
    const pricePerUnit = getAmmoPrice(weaponType, 'buy');
    cost += Math.round(canBuy * pricePerUnit);
  }

  // Calculate for missiles
  for (const [weaponType, needed] of needs.missiles) {
    totalNeeded += needed;
    const stock = state.storeStock.secondaries[weaponType] ?? 0;
    const canBuy = Math.min(needed, stock);
    totalCanBuy += canBuy;
    const pricePerUnit = getSecondaryPrice(weaponType, 'buy');
    cost += canBuy * pricePerUnit;
  }

  if (totalNeeded === 0) {
    return { status: 'supplied', cost: 0, hasShortages: false };
  }

  if (totalCanBuy === 0) {
    return { status: 'insufficient', cost: 0, hasShortages: true };
  }

  return {
    status: 'available',
    cost,
    hasShortages: totalCanBuy < totalNeeded,
  };
}

/** Store-aware resupply - only buys what's in stock */
export function storeResupplyAllShips(state: CampaignState): CampaignState {
  const resupplyStatus = getResupplyStatus(state);

  if (
    resupplyStatus.status === 'supplied' ||
    resupplyStatus.status === 'insufficient'
  ) {
    return state;
  }

  if (state.credits < resupplyStatus.cost) {
    return state;
  }

  // Calculate what we can buy for each type
  const needs = aggregateResupplyNeeds(state.ships);
  const ammoBought = new Map<string, number>();
  const missilesBought = new Map<string, number>();
  const newStoreStock = { ...state.storeStock };

  // Buy ammo (capped by stock)
  const newAmmoStock = { ...state.storeStock.ammo };
  for (const [weaponType, needed] of needs.ammo) {
    const stock = newAmmoStock[weaponType] ?? 0;
    const buy = Math.min(needed, stock);
    ammoBought.set(weaponType, buy);
    newAmmoStock[weaponType] = stock - buy;
  }
  newStoreStock.ammo = newAmmoStock;

  // Buy missiles (capped by stock)
  const newMissileStock = { ...state.storeStock.secondaries };
  for (const [weaponType, needed] of needs.missiles) {
    const stock = newMissileStock[weaponType] ?? 0;
    const buy = Math.min(needed, stock);
    missilesBought.set(weaponType, buy);
    newMissileStock[weaponType] = stock - buy;
  }
  newStoreStock.secondaries = newMissileStock;

  // Distribute purchased ammo/missiles across ships
  const newShips = state.ships.map((ship) => {
    const newPrimaries = ship.primaryWeapons.map((primary) => {
      if (primary === null || primary.currentAmmo === undefined) return primary;
      const bought = ammoBought.get(primary.weaponType) ?? 0;
      if (bought === 0) return primary;

      const maxAmmo = getMaxPrimaryAmmo(primary);
      const needed = Math.max(0, maxAmmo - primary.currentAmmo);
      const toAdd = Math.min(needed, bought);

      // Deduct from remaining bought pool
      ammoBought.set(primary.weaponType, bought - toAdd);

      return { ...primary, currentAmmo: primary.currentAmmo + toAdd };
    });

    const newSecondaries = ship.secondaryWeapons.map((secondary) => {
      if (secondary === null) return secondary;
      const bought = missilesBought.get(secondary.weaponType) ?? 0;
      if (bought === 0) return secondary;

      const needed = Math.max(0, secondary.maxCount - secondary.count);
      const toAdd = Math.min(needed, bought);

      // Deduct from remaining bought pool
      missilesBought.set(secondary.weaponType, bought - toAdd);

      return { ...secondary, count: secondary.count + toAdd };
    });

    return {
      ...ship,
      primaryWeapons: newPrimaries,
      secondaryWeapons: newSecondaries,
    };
  });

  return {
    ...state,
    credits: state.credits - resupplyStatus.cost,
    ships: newShips,
    storeStock: newStoreStock,
  };
}
