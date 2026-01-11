/**
 * Store Functions - buy/sell equipment in the campaign.
 *
 * Ammo functions are in store-ammo.ts
 */

import {
  getPrimaryPrice,
  getScrapPrice,
  getSecondaryPrice,
  getShipPrice,
  SCRAP_CONVERSION_FEE,
  SCRAP_PER_SHIP,
} from '../../data/prices';
import { mergeSecondaryIntoStorage } from '../ship-utils';
import type { CampaignState, StoredShip, StoredWeapon } from '../types';

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
  AMMO_TRICKLE_REFILLS,
  createInitialStoreStock,
  generateSectorStock,
  getAvailableAmmo,
  getAvailablePrimaries,
  getAvailableSecondaries,
  getAvailableShips,
  getScrapTypes,
  // Trickle constants and functions
  getTrickleProbability,
  MISSILE_TRICKLE_LOADS,
} from './store-catalog';

/** Counter for deterministic ID generation */
let itemIdCounter = 0;

/** Generate unique ID for stored items (deterministic, counter-based) */
function generateId(): string {
  return `item_${++itemIdCounter}`;
}

// ============ Ship Buy/Sell ============

/** Buy a ship (add to storage) */
export function buyShip(
  state: CampaignState,
  shipClass: string,
): CampaignState {
  const price = getShipPrice(shipClass, 'buy');
  const stock = state.storeStock.ships[shipClass] ?? 0;
  if (price === 0 || state.credits < price || stock <= 0) {
    return state;
  }

  const newShip: StoredShip = {
    id: generateId(),
    shipClass,
  };

  return {
    ...state,
    credits: state.credits - price,
    storedShips: [...state.storedShips, newShip],
    storeStock: {
      ...state.storeStock,
      ships: { ...state.storeStock.ships, [shipClass]: stock - 1 },
    },
  };
}

/** Sell a stored ship */
export function sellShip(
  state: CampaignState,
  storedShipIndex: number,
): CampaignState {
  const storedShip = state.storedShips[storedShipIndex];
  if (!storedShip) {
    return state;
  }

  const price = getShipPrice(storedShip.shipClass, 'sell');
  const newStoredShips = state.storedShips.filter(
    (_, i) => i !== storedShipIndex,
  );
  const currentStock = state.storeStock.ships[storedShip.shipClass] ?? 0;

  return {
    ...state,
    credits: state.credits + price,
    storedShips: newStoredShips,
    storeStock: {
      ...state.storeStock,
      ships: {
        ...state.storeStock.ships,
        [storedShip.shipClass]: currentStock + 1,
      },
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
 * Calculate the conversion fee to turn scrap into a ship.
 * Fee = 5% of ship buy price.
 */
export function getScrapConversionFee(shipClass: string): number {
  const shipPrice = getShipPrice(shipClass, 'buy');
  return Math.floor(shipPrice * SCRAP_CONVERSION_FEE);
}

/**
 * Check if player can convert scrap to a ship.
 * Requires SCRAP_PER_SHIP (100) scrap + conversion fee in credits.
 */
export function canConvertScrapToShip(
  state: CampaignState,
  shipClass: string,
): boolean {
  const scrapCount = state.storedScrap[shipClass] ?? 0;
  const fee = getScrapConversionFee(shipClass);
  return scrapCount >= SCRAP_PER_SHIP && state.credits >= fee;
}

/**
 * Convert scrap to a fully repaired ship.
 * Consumes SCRAP_PER_SHIP scrap + conversion fee, creates new ship in storage.
 */
export function convertScrapToShip(
  state: CampaignState,
  shipClass: string,
): CampaignState {
  if (!canConvertScrapToShip(state, shipClass)) {
    return state;
  }

  const fee = getScrapConversionFee(shipClass);
  const currentScrap = state.storedScrap[shipClass] ?? 0;
  const remaining = currentScrap - SCRAP_PER_SHIP;

  // Update scrap
  const newStoredScrap = { ...state.storedScrap };
  if (remaining <= 0) {
    delete newStoredScrap[shipClass];
  } else {
    newStoredScrap[shipClass] = remaining;
  }

  // Create new ship
  const newShip: StoredShip = {
    id: generateId(),
    shipClass,
  };

  return {
    ...state,
    credits: state.credits - fee,
    storedScrap: newStoredScrap,
    storedShips: [...state.storedShips, newShip],
  };
}
