/**
 * Missile Store Functions - transfer missiles between storage and weapons.
 */

import { MISSILES } from '../../data/missiles';
import {
  cloneShipWithSecondary,
  mergeSecondaryIntoStorage,
} from '../ship-utils';
import { getSlot } from '../slot-array';
import type { CampaignState, EquippedSecondary, StoredWeapon } from '../types';

/** Get max missile capacity for a secondary weapon (capacity × bankSize) */
export function getMaxMissileCapacity(
  weaponType: string,
  bankSize: number,
): number {
  const stats = MISSILES[weaponType];
  if (!stats) return 0;
  return stats.capacity * bankSize;
}

/** Load missiles from storage into an equipped secondary weapon */
export function loadMissilesToWeapon(
  state: CampaignState,
  shipId: string,
  weaponIndex: number,
  count: number,
): CampaignState {
  const shipIndex = state.ships.findIndex((s) => s.id === shipId);
  if (shipIndex < 0) return state;

  const ship = state.ships[shipIndex];
  if (!ship) return state;

  const weapon = getSlot(ship.secondaryWeapons, weaponIndex);
  if (!weapon) return state;

  // Calculate space available
  const spaceAvailable = weapon.maxCount - weapon.count;
  if (spaceAvailable <= 0) return state;

  // Find missiles in storage
  const storageIndex = state.storedWeapons.findIndex(
    (w) => w.category === 'secondary' && w.weaponType === weapon.weaponType,
  );
  if (storageIndex < 0) return state;

  const stored = state.storedWeapons[storageIndex];
  if (!stored) return state;

  // Load only what fits and what we have
  const toLoad = Math.min(count, stored.count, spaceAvailable);
  if (toLoad <= 0) return state;

  // Update weapon
  const newWeapon: EquippedSecondary = {
    weaponType: weapon.weaponType,
    bankSize: weapon.bankSize,
    count: weapon.count + toLoad,
    maxCount: weapon.maxCount,
  };
  const newShip = cloneShipWithSecondary(ship, weaponIndex, newWeapon);
  const newShips = [...state.ships];
  newShips[shipIndex] = newShip;

  // Update storage
  const remaining = stored.count - toLoad;
  let newStoredWeapons: StoredWeapon[];
  if (remaining <= 0) {
    newStoredWeapons = state.storedWeapons.filter((_, i) => i !== storageIndex);
  } else {
    newStoredWeapons = state.storedWeapons.map((w, i) =>
      i === storageIndex
        ? { weaponType: w.weaponType, category: w.category, count: remaining }
        : w,
    );
  }

  return {
    ...state,
    ships: newShips,
    storedWeapons: newStoredWeapons,
  };
}

/** Unload missiles from weapon to storage */
export function unloadMissilesFromWeapon(
  state: CampaignState,
  shipId: string,
  weaponIndex: number,
  count: number,
): CampaignState {
  const shipIndex = state.ships.findIndex((s) => s.id === shipId);
  if (shipIndex < 0) return state;

  const ship = state.ships[shipIndex];
  if (!ship) return state;

  const weapon = getSlot(ship.secondaryWeapons, weaponIndex);
  if (!weapon) return state;

  const toUnload = Math.min(count, weapon.count);
  if (toUnload <= 0) return state;

  // Update weapon
  const newWeapon: EquippedSecondary = {
    weaponType: weapon.weaponType,
    bankSize: weapon.bankSize,
    count: weapon.count - toUnload,
    maxCount: weapon.maxCount,
  };
  const newShip = cloneShipWithSecondary(ship, weaponIndex, newWeapon);
  const newShips = [...state.ships];
  newShips[shipIndex] = newShip;

  // Merge unloaded missiles into storage
  const newStoredWeapons = mergeSecondaryIntoStorage(
    state.storedWeapons,
    weapon.weaponType,
    toUnload,
  );

  return {
    ...state,
    ships: newShips,
    storedWeapons: newStoredWeapons,
  };
}
