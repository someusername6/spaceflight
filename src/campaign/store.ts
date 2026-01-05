/**
 * Store Functions - buy/sell equipment in the campaign.
 *
 * Ammo functions are in store-ammo.ts
 */

import {
  getHullPrice,
  getPrimaryPrice,
  getScrapPrice,
  getSecondaryPrice,
  SCRAP_CONVERSION_FEE,
  SCRAP_PER_HULL,
} from '../data/prices';
import { mergeSecondaryIntoStorage } from './ship-utils';
import type { CampaignState, StoredHull, StoredWeapon } from './types';

// Re-export ammo functions
export {
  buyAmmo,
  getMaxAmmoCapacity,
  loadAmmoToWeapon,
  sellAmmo,
  unloadAmmoFromWeapon,
} from './store-ammo';

// Re-export catalog functions
export {
  createInitialStoreStock,
  getAvailableAmmo,
  getAvailableHulls,
  getAvailablePrimaries,
  getAvailableSecondaries,
  getScrapTypes,
} from './store-catalog';

/** Counter for deterministic ID generation */
let itemIdCounter = 0;

/** Generate unique ID for stored items (deterministic, counter-based) */
function generateId(): string {
  return `item_${++itemIdCounter}`;
}

// ============ Hull Buy/Sell ============

/** Buy a ship hull (add to storage) */
export function buyHull(
  state: CampaignState,
  shipClass: string,
): CampaignState {
  const price = getHullPrice(shipClass, 'buy');
  const stock = state.storeStock.hulls[shipClass] ?? 0;
  if (price === 0 || state.credits < price || stock <= 0) {
    return state;
  }

  const newHull: StoredHull = {
    id: generateId(),
    shipClass,
    hullDamage: 0,
  };

  return {
    ...state,
    credits: state.credits - price,
    storedHulls: [...state.storedHulls, newHull],
    storeStock: {
      ...state.storeStock,
      hulls: { ...state.storeStock.hulls, [shipClass]: stock - 1 },
    },
  };
}

/** Sell a stored hull */
export function sellHull(
  state: CampaignState,
  hullIndex: number,
): CampaignState {
  const hull = state.storedHulls[hullIndex];
  if (!hull) {
    return state;
  }

  const price = getHullPrice(hull.shipClass, 'sell');
  const newStoredHulls = state.storedHulls.filter((_, i) => i !== hullIndex);
  const currentStock = state.storeStock.hulls[hull.shipClass] ?? 0;

  return {
    ...state,
    credits: state.credits + price,
    storedHulls: newStoredHulls,
    storeStock: {
      ...state.storeStock,
      hulls: { ...state.storeStock.hulls, [hull.shipClass]: currentStock + 1 },
    },
  };
}

// ============ Primary Weapon Buy/Sell ============

/** Buy a primary weapon (add to storage) */
export function buyPrimaryWeapon(
  state: CampaignState,
  weaponType: string,
): CampaignState {
  const price = getPrimaryPrice(weaponType, 'buy');
  const stock = state.storeStock.primaries[weaponType] ?? 0;
  if (price === 0 || state.credits < price || stock <= 0) {
    return state;
  }

  const newWeapon: StoredWeapon = {
    weaponType,
    category: 'primary',
    count: 1,
  };

  return {
    ...state,
    credits: state.credits - price,
    storedWeapons: [...state.storedWeapons, newWeapon],
    storeStock: {
      ...state.storeStock,
      primaries: { ...state.storeStock.primaries, [weaponType]: stock - 1 },
    },
  };
}

/** Sell a primary weapon from storage */
export function sellPrimaryWeapon(
  state: CampaignState,
  storageIndex: number,
): CampaignState {
  const weapon = state.storedWeapons[storageIndex];
  if (!weapon || weapon.category !== 'primary') {
    return state;
  }

  const price = getPrimaryPrice(weapon.weaponType, 'sell');
  const newStoredWeapons = state.storedWeapons.filter(
    (_, i) => i !== storageIndex,
  );
  const currentStock = state.storeStock.primaries[weapon.weaponType] ?? 0;

  return {
    ...state,
    credits: state.credits + price,
    storedWeapons: newStoredWeapons,
    storeStock: {
      ...state.storeStock,
      primaries: {
        ...state.storeStock.primaries,
        [weapon.weaponType]: currentStock + 1,
      },
    },
  };
}

// ============ Secondary Weapon (Missiles) Buy/Sell ============

/** Buy secondary weapons/missiles (add to storage or existing stack) */
export function buySecondaryWeapon(
  state: CampaignState,
  weaponType: string,
  count: number,
): CampaignState {
  const pricePerUnit = getSecondaryPrice(weaponType, 'buy');
  const stock = state.storeStock.secondaries[weaponType] ?? 0;
  // Can only buy up to available stock
  const toBuy = Math.min(count, stock);
  if (pricePerUnit === 0 || toBuy <= 0) {
    return state;
  }
  const totalPrice = pricePerUnit * toBuy;
  if (state.credits < totalPrice) {
    return state;
  }

  return {
    ...state,
    credits: state.credits - totalPrice,
    storedWeapons: mergeSecondaryIntoStorage(
      state.storedWeapons,
      weaponType,
      toBuy,
    ),
    storeStock: {
      ...state.storeStock,
      secondaries: {
        ...state.storeStock.secondaries,
        [weaponType]: stock - toBuy,
      },
    },
  };
}

/** Sell secondary weapons from storage */
export function sellSecondaryWeapon(
  state: CampaignState,
  storageIndex: number,
  count: number,
): CampaignState {
  const weapon = state.storedWeapons[storageIndex];
  if (!weapon || weapon.category !== 'secondary') {
    return state;
  }

  const toSell = Math.min(count, weapon.count);
  if (toSell <= 0) {
    return state;
  }

  const pricePerUnit = getSecondaryPrice(weapon.weaponType, 'sell');
  const totalPrice = pricePerUnit * toSell;
  const remaining = weapon.count - toSell;
  const currentStock = state.storeStock.secondaries[weapon.weaponType] ?? 0;

  let newStoredWeapons: StoredWeapon[];
  if (remaining <= 0) {
    newStoredWeapons = state.storedWeapons.filter((_, i) => i !== storageIndex);
  } else {
    newStoredWeapons = state.storedWeapons.map((w, i) =>
      i === storageIndex ? { ...w, count: remaining } : w,
    );
  }

  return {
    ...state,
    credits: state.credits + totalPrice,
    storedWeapons: newStoredWeapons,
    storeStock: {
      ...state.storeStock,
      secondaries: {
        ...state.storeStock.secondaries,
        [weapon.weaponType]: currentStock + toSell,
      },
    },
  };
}

// ============ Scrap Sell ============

/**
 * Sell scrap to the store.
 * Unlike other items, scrap does NOT increment store stock (it's destroyed).
 */
export function sellScrap(
  state: CampaignState,
  shipClass: string,
  count: number,
): CampaignState {
  const currentScrap = state.storedScrap[shipClass] ?? 0;
  const toSell = Math.min(count, currentScrap);
  if (toSell <= 0) {
    return state;
  }

  const pricePerUnit = getScrapPrice(shipClass);
  const totalPrice = pricePerUnit * toSell;
  const remaining = currentScrap - toSell;

  const newStoredScrap = { ...state.storedScrap };
  if (remaining <= 0) {
    delete newStoredScrap[shipClass];
  } else {
    newStoredScrap[shipClass] = remaining;
  }

  return {
    ...state,
    credits: state.credits + totalPrice,
    storedScrap: newStoredScrap,
    // Note: scrap doesn't go back to store stock, it's consumed
  };
}

// ============ Scrap Conversion ============

/**
 * Calculate the conversion fee to turn scrap into a hull.
 * Fee = 5% of hull buy price.
 */
export function getScrapConversionFee(shipClass: string): number {
  const hullPrice = getHullPrice(shipClass, 'buy');
  return Math.floor(hullPrice * SCRAP_CONVERSION_FEE);
}

/**
 * Check if player can convert scrap to a hull.
 * Requires SCRAP_PER_HULL (100) scrap + conversion fee in credits.
 */
export function canConvertScrapToHull(
  state: CampaignState,
  shipClass: string,
): boolean {
  const scrapCount = state.storedScrap[shipClass] ?? 0;
  const fee = getScrapConversionFee(shipClass);
  return scrapCount >= SCRAP_PER_HULL && state.credits >= fee;
}

/**
 * Convert scrap to a fully repaired hull.
 * Consumes SCRAP_PER_HULL scrap + conversion fee, creates new hull in storage.
 */
export function convertScrapToHull(
  state: CampaignState,
  shipClass: string,
): CampaignState {
  if (!canConvertScrapToHull(state, shipClass)) {
    return state;
  }

  const fee = getScrapConversionFee(shipClass);
  const currentScrap = state.storedScrap[shipClass] ?? 0;
  const remaining = currentScrap - SCRAP_PER_HULL;

  // Update scrap
  const newStoredScrap = { ...state.storedScrap };
  if (remaining <= 0) {
    delete newStoredScrap[shipClass];
  } else {
    newStoredScrap[shipClass] = remaining;
  }

  // Create new fully repaired hull
  const newHull: StoredHull = {
    id: generateId(),
    shipClass,
    hullDamage: 0,
  };

  return {
    ...state,
    credits: state.credits - fee,
    storedScrap: newStoredScrap,
    storedHulls: [...state.storedHulls, newHull],
  };
}
