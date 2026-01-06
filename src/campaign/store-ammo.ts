/**
 * Ammo Store Functions - buy/sell ammo and transfer between storage and weapons.
 */

import { getAmmoPrice } from '../data/prices';
import { PRIMARY_WEAPONS } from '../data/weapons';
import { cloneShipWithPrimary, mergeAmmoIntoStorage } from './ship-utils';
import type { CampaignState, EquippedPrimary } from './types';

// Re-export missile functions for backward compatibility
export {
  getMaxMissileCapacity,
  loadMissilesToWeapon,
  unloadMissilesFromWeapon,
} from './store-missiles';

/** Get max ammo capacity for a ballistic weapon (scaled by bank size) */
export function getMaxAmmoCapacity(
  weaponType: string,
  bankSize: number,
): number {
  const stats = PRIMARY_WEAPONS[weaponType];
  if (!stats || stats.ammo === undefined) return 0;
  return stats.ammo * bankSize;
}

/** Buy ammo for ballistic weapons (add to storage) */
export function buyAmmo(
  state: CampaignState,
  weaponType: string,
  count: number,
): CampaignState {
  const pricePerUnit = getAmmoPrice(weaponType, 'buy');
  const stock = state.storeStock.ammo[weaponType] ?? 0;
  // Can only buy up to available stock
  const toBuy = Math.min(count, stock);
  if (pricePerUnit === 0 || toBuy <= 0) {
    return state;
  }
  // Round to avoid fractional credits (e.g., 0.1 cr/unit * 10 = 1 cr)
  const totalPrice = Math.round(pricePerUnit * toBuy);
  if (state.credits < totalPrice) {
    return state;
  }

  return {
    ...state,
    credits: state.credits - totalPrice,
    storedAmmo: mergeAmmoIntoStorage(state.storedAmmo, weaponType, toBuy),
    storeStock: {
      ...state.storeStock,
      ammo: { ...state.storeStock.ammo, [weaponType]: stock - toBuy },
    },
  };
}

/** Sell ammo from storage */
export function sellAmmo(
  state: CampaignState,
  weaponType: string,
  count: number,
): CampaignState {
  const existingIndex = state.storedAmmo.findIndex(
    (a) => a.weaponType === weaponType,
  );
  if (existingIndex < 0) {
    return state;
  }

  const existing = state.storedAmmo[existingIndex];
  if (!existing) return state;

  const toSell = Math.min(count, existing.count);
  if (toSell <= 0) {
    return state;
  }

  const pricePerUnit = getAmmoPrice(weaponType, 'sell');
  // Round to avoid fractional credits
  const totalPrice = Math.round(pricePerUnit * toSell);
  const remaining = existing.count - toSell;
  const currentStock = state.storeStock.ammo[weaponType] ?? 0;

  const newStoredAmmo = [...state.storedAmmo];
  if (remaining <= 0) {
    newStoredAmmo.splice(existingIndex, 1);
  } else {
    newStoredAmmo[existingIndex] = {
      weaponType: existing.weaponType,
      count: remaining,
    };
  }

  return {
    ...state,
    credits: state.credits + totalPrice,
    storedAmmo: newStoredAmmo,
    storeStock: {
      ...state.storeStock,
      ammo: { ...state.storeStock.ammo, [weaponType]: currentStock + toSell },
    },
  };
}

/** Load ammo from storage into an equipped weapon (respects max capacity) */
export function loadAmmoToWeapon(
  state: CampaignState,
  shipId: string,
  weaponIndex: number,
  count: number,
): CampaignState {
  const shipIndex = state.ships.findIndex((s) => s.id === shipId);
  if (shipIndex < 0) return state;

  const ship = state.ships[shipIndex];
  if (!ship) return state;

  const weapon = ship.primaryWeapons[weaponIndex];
  if (!weapon || weapon.currentAmmo === undefined) return state;

  // Calculate max capacity and how much we can load
  const maxCapacity = getMaxAmmoCapacity(weapon.weaponType, weapon.bankSize);
  const spaceAvailable = maxCapacity - weapon.currentAmmo;
  if (spaceAvailable <= 0) return state;

  // Find ammo in storage
  const ammoIndex = state.storedAmmo.findIndex(
    (a) => a.weaponType === weapon.weaponType,
  );
  if (ammoIndex < 0) return state;

  const storedAmmo = state.storedAmmo[ammoIndex];
  if (!storedAmmo) return state;

  // Load only what fits and what we have
  const toLoad = Math.min(count, storedAmmo.count, spaceAvailable);
  if (toLoad <= 0) return state;

  // Update weapon ammo
  const newWeapon: EquippedPrimary = {
    weaponType: weapon.weaponType,
    bankSize: weapon.bankSize,
    currentAmmo: weapon.currentAmmo + toLoad,
  };
  const newShip = cloneShipWithPrimary(ship, weaponIndex, newWeapon);
  const newShips = [...state.ships];
  newShips[shipIndex] = newShip;

  // Update storage
  const remaining = storedAmmo.count - toLoad;
  const newStoredAmmo = [...state.storedAmmo];
  if (remaining <= 0) {
    newStoredAmmo.splice(ammoIndex, 1);
  } else {
    newStoredAmmo[ammoIndex] = {
      weaponType: storedAmmo.weaponType,
      count: remaining,
    };
  }

  return {
    ...state,
    ships: newShips,
    storedAmmo: newStoredAmmo,
  };
}

/** Unload ammo from weapon to storage */
export function unloadAmmoFromWeapon(
  state: CampaignState,
  shipId: string,
  weaponIndex: number,
  count: number,
): CampaignState {
  const shipIndex = state.ships.findIndex((s) => s.id === shipId);
  if (shipIndex < 0) return state;

  const ship = state.ships[shipIndex];
  if (!ship) return state;

  const weapon = ship.primaryWeapons[weaponIndex];
  if (!weapon || weapon.currentAmmo === undefined) return state;

  const toUnload = Math.min(count, weapon.currentAmmo);
  if (toUnload <= 0) return state;

  // Update weapon ammo
  const newWeapon: EquippedPrimary = {
    weaponType: weapon.weaponType,
    bankSize: weapon.bankSize,
    currentAmmo: weapon.currentAmmo - toUnload,
  };
  const newShip = cloneShipWithPrimary(ship, weaponIndex, newWeapon);
  const newShips = [...state.ships];
  newShips[shipIndex] = newShip;

  // Merge unloaded ammo into storage
  const newStoredAmmo = mergeAmmoIntoStorage(
    state.storedAmmo,
    weapon.weaponType,
    toUnload,
  );

  return {
    ...state,
    ships: newShips,
    storedAmmo: newStoredAmmo,
  };
}
