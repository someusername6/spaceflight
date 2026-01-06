/**
 * Ship utility functions - helpers for immutable ship updates.
 */

import { SHIP_CLASSES } from '../data/ships';
import type {
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  StoredAmmo,
  StoredWeapon,
} from './types';

/** Create empty weapon slot arrays for a ship class (null-filled) */
export function createEmptyWeaponSlots(shipClass: string): {
  primaryWeapons: (EquippedPrimary | null)[];
  secondaryWeapons: (EquippedSecondary | null)[];
} {
  const stats = SHIP_CLASSES[shipClass.toLowerCase()];
  const primaryCount = stats?.primaryBanks.length ?? 0;
  const secondaryCount = stats?.secondaryBanks.length ?? 0;

  return {
    primaryWeapons: Array(primaryCount).fill(null),
    secondaryWeapons: Array(secondaryCount).fill(null),
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
  const newPrimaries = [...ship.primaryWeapons];
  newPrimaries[weaponIndex] = newWeapon;
  return {
    id: ship.id,
    shipClass: ship.shipClass,
    primaryWeapons: newPrimaries,
    secondaryWeapons: ship.secondaryWeapons,
    pilot: ship.pilot,
    hullDamage: ship.hullDamage,
  };
}

/** Clone a ship with an updated secondary weapon at the given index */
export function cloneShipWithSecondary(
  ship: OwnedShip,
  weaponIndex: number,
  newWeapon: EquippedSecondary,
): OwnedShip {
  const newSecondaries = [...ship.secondaryWeapons];
  newSecondaries[weaponIndex] = newWeapon;
  return {
    id: ship.id,
    shipClass: ship.shipClass,
    primaryWeapons: ship.primaryWeapons,
    secondaryWeapons: newSecondaries,
    pilot: ship.pilot,
    hullDamage: ship.hullDamage,
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
  // Filter out null slots
  const primaryWeapons: StoredWeapon[] = ship.primaryWeapons
    .filter((w): w is EquippedPrimary => w !== null)
    .map((w) => ({
      weaponType: w.weaponType,
      category: 'primary' as const,
      count: 1,
    }));

  // Merge secondary weapons into storage (stack with existing)
  // Filter out null slots
  let storedWeapons = [...currentStoredWeapons, ...primaryWeapons];
  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) continue;
    storedWeapons = mergeSecondaryIntoStorage(
      storedWeapons,
      secondary.weaponType,
      secondary.count,
    );
  }

  // Transfer ammo from ballistic weapons to storage
  // Filter out null slots
  let storedAmmo = currentStoredAmmo;
  for (const primary of ship.primaryWeapons) {
    if (primary === null) continue;
    storedAmmo = mergeAmmoIntoStorage(
      storedAmmo,
      primary.weaponType,
      primary.currentAmmo ?? 0,
    );
  }

  return { storedWeapons, storedAmmo };
}
