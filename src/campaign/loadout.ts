/**
 * Loadout management - equip/unequip weapons, swap pilots between ships.
 */

import { weaponUsesAmmo } from '../data/prices';
import {
  mergeAmmoIntoStorage,
  mergeSecondaryIntoStorage,
  transferShipWeaponsToStorage,
} from './ship-utils';
import { getMaxMissileCapacity } from './store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  StoredHull,
  StoredWeapon,
} from './types';

/** Unequip a primary weapon from a ship, move to storage (and ammo if any) */
export function unequipPrimary(
  state: CampaignState,
  shipId: string,
  weaponIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || weaponIndex < 0 || weaponIndex >= ship.primaryWeapons.length) {
    return state;
  }

  const weapon = ship.primaryWeapons[weaponIndex];
  if (!weapon) return state;

  // Add weapon to storage
  const stored: StoredWeapon = {
    weaponType: weapon.weaponType,
    category: 'primary',
    count: 1,
  };

  // Remove from ship
  const updatedWeapons = ship.primaryWeapons.filter(
    (_, i) => i !== weaponIndex,
  );

  // Transfer ammo to storage if weapon had any
  const newStoredAmmo = mergeAmmoIntoStorage(
    state.storedAmmo,
    weapon.weaponType,
    weapon.currentAmmo ?? 0,
  );

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId ? { ...s, primaryWeapons: updatedWeapons } : s,
    ),
    storedWeapons: [...state.storedWeapons, stored],
    storedAmmo: newStoredAmmo,
  };
}

/** Unequip a secondary weapon from a ship, move to storage */
export function unequipSecondary(
  state: CampaignState,
  shipId: string,
  weaponIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || weaponIndex < 0 || weaponIndex >= ship.secondaryWeapons.length) {
    return state;
  }

  const weapon = ship.secondaryWeapons[weaponIndex];
  if (!weapon) return state;

  // Remove from ship
  const updatedWeapons = ship.secondaryWeapons.filter(
    (_, i) => i !== weaponIndex,
  );

  // Merge into existing storage stack or create new entry
  const newStoredWeapons = mergeSecondaryIntoStorage(
    state.storedWeapons,
    weapon.weaponType,
    weapon.count,
  );

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId ? { ...s, secondaryWeapons: updatedWeapons } : s,
    ),
    storedWeapons: newStoredWeapons,
  };
}

/** Equip a primary weapon from storage to a ship */
export function equipPrimary(
  state: CampaignState,
  shipId: string,
  storageIndex: number,
  bankSize: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const stored = state.storedWeapons[storageIndex];
  if (!ship || !stored || stored.category !== 'primary') {
    return state;
  }

  // Create equipped weapon - ballistic weapons start with 0 ammo
  const equipped: EquippedPrimary = weaponUsesAmmo(stored.weaponType)
    ? { weaponType: stored.weaponType, bankSize, currentAmmo: 0 }
    : { weaponType: stored.weaponType, bankSize };

  // Remove from storage
  const updatedStorage = state.storedWeapons.filter(
    (_, i) => i !== storageIndex,
  );

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId
        ? { ...s, primaryWeapons: [...s.primaryWeapons, equipped] }
        : s,
    ),
    storedWeapons: updatedStorage,
  };
}

/** Equip a secondary weapon from storage to a ship */
export function equipSecondary(
  state: CampaignState,
  shipId: string,
  storageIndex: number,
  bankSize: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const stored = state.storedWeapons[storageIndex];
  if (!ship || !stored || stored.category !== 'secondary') {
    return state;
  }

  // Calculate max capacity based on missile type and bank size
  const maxCapacity = getMaxMissileCapacity(stored.weaponType, bankSize);
  // Load only up to capacity, leaving remainder in storage
  const toLoad = Math.min(stored.count, maxCapacity);
  const remainder = stored.count - toLoad;

  // Create equipped weapon with proper capacity
  const equipped: EquippedSecondary = {
    weaponType: stored.weaponType,
    bankSize,
    count: toLoad,
    maxCount: maxCapacity,
  };

  // Update storage - remove if empty, reduce count if remainder
  let updatedStorage: StoredWeapon[];
  if (remainder <= 0) {
    updatedStorage = state.storedWeapons.filter((_, i) => i !== storageIndex);
  } else {
    updatedStorage = state.storedWeapons.map((w, i) =>
      i === storageIndex
        ? { weaponType: w.weaponType, category: w.category, count: remainder }
        : w,
    );
  }

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId
        ? { ...s, secondaryWeapons: [...s.secondaryWeapons, equipped] }
        : s,
    ),
    storedWeapons: updatedStorage,
  };
}

/** Move pilot/player from active ship to stored hull, current ship goes to storage */
export function swapPilotToHull(
  state: CampaignState,
  shipId: string,
  hullIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const hull = state.storedHulls[hullIndex];
  if (!ship || !hull) {
    return state;
  }

  // Wingman ships require a pilot
  if (!ship.isPlayerShip && !ship.pilot) {
    return state;
  }

  // Create new active ship from hull (preserve player/pilot status)
  const newShip: OwnedShip = {
    id: hull.id,
    shipClass: hull.shipClass,
    primaryWeapons: [], // Starts empty - needs weapons equipped
    secondaryWeapons: [],
    pilot: ship.pilot, // null for player, Pilot for wingman
    hullDamage: hull.hullDamage,
    isPlayerShip: ship.isPlayerShip,
  };

  // Old ship becomes a stored hull (weapons go to storage)
  const oldHull: StoredHull = {
    id: ship.id,
    shipClass: ship.shipClass,
    hullDamage: ship.hullDamage,
  };

  // Transfer all weapons and ammo from old ship to storage
  const { storedWeapons, storedAmmo } = transferShipWeaponsToStorage(
    ship,
    state.storedWeapons,
    state.storedAmmo,
  );

  return {
    ...state,
    ships: state.ships.map((s) => (s.id === shipId ? newShip : s)),
    storedHulls: [
      ...state.storedHulls.filter((_, i) => i !== hullIndex),
      oldHull,
    ],
    storedWeapons,
    storedAmmo,
  };
}

/** Assign an unassigned pilot to a stored hull, creating a new active ship */
export function assignPilotToHull(
  state: CampaignState,
  pilotIndex: number,
  hullIndex: number,
): CampaignState {
  const pilot = state.pilots[pilotIndex];
  const hull = state.storedHulls[hullIndex];
  if (!pilot || !hull) {
    return state;
  }

  // Create new active ship from hull + pilot
  const newShip: OwnedShip = {
    id: hull.id,
    shipClass: hull.shipClass,
    primaryWeapons: [], // Empty - needs weapons equipped
    secondaryWeapons: [],
    pilot,
    hullDamage: hull.hullDamage,
    isPlayerShip: false,
  };

  return {
    ...state,
    ships: [...state.ships, newShip],
    pilots: state.pilots.filter((_, i) => i !== pilotIndex),
    storedHulls: state.storedHulls.filter((_, i) => i !== hullIndex),
  };
}

/** Unassign a pilot from a wingman ship, returning pilot to pool and ship to storage */
export function unassignPilot(
  state: CampaignState,
  shipId: string,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || ship.isPlayerShip || !ship.pilot) {
    return state;
  }

  const pilot = ship.pilot;

  // Ship becomes a stored hull
  const newHull: StoredHull = {
    id: ship.id,
    shipClass: ship.shipClass,
    hullDamage: ship.hullDamage,
  };

  // Transfer all weapons and ammo to storage
  const { storedWeapons, storedAmmo } = transferShipWeaponsToStorage(
    ship,
    state.storedWeapons,
    state.storedAmmo,
  );

  return {
    ...state,
    ships: state.ships.filter((s) => s.id !== shipId),
    pilots: [...state.pilots, pilot],
    storedHulls: [...state.storedHulls, newHull],
    storedWeapons,
    storedAmmo,
  };
}
