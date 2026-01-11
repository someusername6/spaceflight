/**
 * Ship utility functions - helpers for immutable ship updates.
 */

import { SHIP_CLASSES } from '../data/ships';
import {
  emptySlotArray,
  forEachSlot,
  getOccupiedWeapons,
  type SlotArray,
  setSlot,
} from './slot-array';
import type {
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  StoredAmmo,
  StoredWeapon,
} from './types';

/** Create empty weapon slot arrays for a ship class */
export function createEmptyWeaponSlots(shipClass: string): {
  primaryWeapons: SlotArray<EquippedPrimary>;
  secondaryWeapons: SlotArray<EquippedSecondary>;
} {
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];
  const primaryCount = stats?.primaryBanks.length ?? 0;
  const secondaryCount = stats?.secondaryBanks.length ?? 0;

  return {
    primaryWeapons: emptySlotArray<EquippedPrimary>(primaryCount),
    secondaryWeapons: emptySlotArray<EquippedSecondary>(secondaryCount),
  };
}

/** Result of transferring a ship's weapons to storage */
export interface WeaponTransferResult {
  storedWeapons: StoredWeapon[];
  storedAmmo: StoredAmmo[];
}

/** Clone a ship with an updated primary weapon at the given index */
export function cloneShipWithPrimary(
  ship: OwnedShip,
  weaponIndex: number,
  newWeapon: EquippedPrimary,
): OwnedShip {
  return {
    id: ship.id,
    shipClass: ship.shipClass,
    primaryWeapons: setSlot(ship.primaryWeapons, weaponIndex, newWeapon),
    secondaryWeapons: ship.secondaryWeapons,
    pilot: ship.pilot,
  };
}

/** Clone a ship with an updated secondary weapon at the given index */
export function cloneShipWithSecondary(
  ship: OwnedShip,
  weaponIndex: number,
  newWeapon: EquippedSecondary,
): OwnedShip {
  return {
    id: ship.id,
    shipClass: ship.shipClass,
    primaryWeapons: ship.primaryWeapons,
    secondaryWeapons: setSlot(ship.secondaryWeapons, weaponIndex, newWeapon),
    pilot: ship.pilot,
  };
}

/** Merge a secondary weapon into stored weapons (combines with existing stack if present) */
export function mergeSecondaryIntoStorage(
  storedWeapons: StoredWeapon[],
  weaponType: string,
  count: number,
): StoredWeapon[] {
  const existingIndex = storedWeapons.findIndex(
    (w) => w.category === 'secondary' && w.weaponType === weaponType,
  );

  if (existingIndex >= 0) {
    const existing = storedWeapons[existingIndex];
    if (!existing) return storedWeapons;
    return storedWeapons.map((w, i) =>
      i === existingIndex
        ? {
            weaponType: w.weaponType,
            category: w.category,
            count: existing.count + count,
          }
        : w,
    );
  } else {
    const stored: StoredWeapon = {
      weaponType,
      category: 'secondary',
      count,
    };
    return [...storedWeapons, stored];
  }
}

/** Merge ammo into stored ammo (combines with existing stack if present) */
export function mergeAmmoIntoStorage(
  storedAmmo: StoredAmmo[],
  weaponType: string,
  count: number,
): StoredAmmo[] {
  if (count <= 0) return storedAmmo;

  const existingIndex = storedAmmo.findIndex(
    (a) => a.weaponType === weaponType,
  );

  if (existingIndex >= 0) {
    const existing = storedAmmo[existingIndex];
    if (!existing) return storedAmmo;
    return storedAmmo.map((a, i) =>
      i === existingIndex
        ? { weaponType: a.weaponType, count: existing.count + count }
        : a,
    );
  } else {
    return [...storedAmmo, { weaponType, count }];
  }
}

/** Transfer all weapons and ammo from a ship to storage */
export function transferShipWeaponsToStorage(
  ship: OwnedShip,
  currentStoredWeapons: StoredWeapon[],
  currentStoredAmmo: StoredAmmo[],
): WeaponTransferResult {
  // Move primary weapons to storage (discrete items, don't stack)
  const primaryWeapons: StoredWeapon[] = getOccupiedWeapons(
    ship.primaryWeapons,
  ).map((w) => ({
    weaponType: w.weaponType,
    category: 'primary' as const,
    count: 1,
  }));

  // Merge secondary weapons into storage (stack with existing)
  let storedWeapons = [...currentStoredWeapons, ...primaryWeapons];
  forEachSlot(ship.secondaryWeapons, (secondary) => {
    storedWeapons = mergeSecondaryIntoStorage(
      storedWeapons,
      secondary.weaponType,
      secondary.count,
    );
  });

  // Transfer ammo from ballistic weapons to storage
  let storedAmmo = currentStoredAmmo;
  forEachSlot(ship.primaryWeapons, (primary) => {
    storedAmmo = mergeAmmoIntoStorage(
      storedAmmo,
      primary.weaponType,
      primary.currentAmmo ?? 0,
    );
  });

  return { storedWeapons, storedAmmo };
}
