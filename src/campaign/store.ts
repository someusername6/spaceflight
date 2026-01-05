/**
 * Store Functions - buy/sell equipment in the campaign.
 *
 * Ammo functions are in store-ammo.ts
 */

import { MISSILES } from '../data/missiles';
import {
  getAmmoPrice,
  getHullPrice,
  getPrimaryPrice,
  getSecondaryPrice,
} from '../data/prices';
import { SHIP_CLASSES } from '../data/ships';
import { PRIMARY_WEAPONS } from '../data/weapons';
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

/** Generate unique ID for stored items */
function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Hull Buy/Sell ============

/** Buy a ship hull (add to storage) */
export function buyHull(
  state: CampaignState,
  shipClass: string,
): CampaignState {
  const price = getHullPrice(shipClass, 'buy');
  if (price === 0 || state.credits < price) {
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

  return {
    ...state,
    credits: state.credits + price,
    storedHulls: newStoredHulls,
  };
}

// ============ Primary Weapon Buy/Sell ============

/** Buy a primary weapon (add to storage) */
export function buyPrimaryWeapon(
  state: CampaignState,
  weaponType: string,
): CampaignState {
  const price = getPrimaryPrice(weaponType, 'buy');
  if (price === 0 || state.credits < price) {
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

  return {
    ...state,
    credits: state.credits + price,
    storedWeapons: newStoredWeapons,
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
  const totalPrice = pricePerUnit * count;
  if (pricePerUnit === 0 || state.credits < totalPrice) {
    return state;
  }

  return {
    ...state,
    credits: state.credits - totalPrice,
    storedWeapons: mergeSecondaryIntoStorage(
      state.storedWeapons,
      weaponType,
      count,
    ),
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
  };
}

// ============ Catalog Lists ============

/** Get list of available hulls for purchase (derived from SHIP_CLASSES) */
export function getAvailableHulls(): Array<{
  shipClass: string;
  buyPrice: number;
}> {
  return Object.keys(SHIP_CLASSES)
    .map((shipClass) => ({
      shipClass,
      buyPrice: getHullPrice(shipClass, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get list of available primary weapons for purchase (derived from PRIMARY_WEAPONS) */
export function getAvailablePrimaries(): Array<{
  weaponType: string;
  buyPrice: number;
}> {
  return Object.keys(PRIMARY_WEAPONS)
    .map((weaponType) => ({
      weaponType,
      buyPrice: getPrimaryPrice(weaponType, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get list of available secondary weapons for purchase (derived from MISSILES) */
export function getAvailableSecondaries(): Array<{
  weaponType: string;
  buyPrice: number;
}> {
  return Object.keys(MISSILES)
    .map((weaponType) => ({
      weaponType,
      buyPrice: getSecondaryPrice(weaponType, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}

/** Get list of available ammo types for purchase (derived from PRIMARY_WEAPONS with ammo) */
export function getAvailableAmmo(): Array<{
  weaponType: string;
  buyPrice: number;
}> {
  return Object.entries(PRIMARY_WEAPONS)
    .filter(([_, stats]) => stats.ammo !== undefined)
    .map(([weaponType]) => ({
      weaponType,
      buyPrice: getAmmoPrice(weaponType, 'buy'),
    }))
    .filter((item) => item.buyPrice > 0);
}
