/**
 * Loadout management - equip/unequip weapons.
 *
 * Pilot assignment functions are in ./pilot-assignment.ts
 */

import { weaponUsesAmmo } from '../data/prices';
import { mergeAmmoIntoStorage, mergeSecondaryIntoStorage } from './ship-utils';
import { getMaxAmmoCapacity, getMaxMissileCapacity } from './store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  StoredWeapon,
} from './types';

// Re-export pilot assignment functions for backwards compatibility
export {
  assignPilotToShip,
  assignPilotToStoredShip,
  swapPilotToShip,
  swapPilotToStoredShip,
  unassignPilot,
} from './pilot-assignment';

/** Unequip a primary weapon from a slot, move to storage (and ammo if any) */
export function unequipPrimary(
  state: CampaignState,
  shipId: string,
  slotIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || slotIndex < 0 || slotIndex >= ship.primaryWeapons.length) {
    return state;
  }

  const weapon = ship.primaryWeapons[slotIndex];
  if (!weapon) return state; // Slot already empty

  // Add weapon to storage
  const stored: StoredWeapon = {
    weaponType: weapon.weaponType,
    category: 'primary',
    count: 1,
  };

  // Set slot to null (preserves array length and slot positions)
  const updatedWeapons = ship.primaryWeapons.map((w, i) =>
    i === slotIndex ? null : w,
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

/** Unequip a secondary weapon from a slot, move to storage */
export function unequipSecondary(
  state: CampaignState,
  shipId: string,
  slotIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || slotIndex < 0 || slotIndex >= ship.secondaryWeapons.length) {
    return state;
  }

  const weapon = ship.secondaryWeapons[slotIndex];
  if (!weapon) return state; // Slot already empty

  // Set slot to null (preserves array length and slot positions)
  const updatedWeapons = ship.secondaryWeapons.map((w, i) =>
    i === slotIndex ? null : w,
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

/** Equip a primary weapon from storage to a specific slot */
export function equipPrimary(
  state: CampaignState,
  shipId: string,
  storageIndex: number,
  slotIndex: number,
  bankSize: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const stored = state.storedWeapons[storageIndex];
  if (!ship || !stored || stored.category !== 'primary') {
    return state;
  }

  // Validate slot index and ensure slot is empty
  if (slotIndex < 0 || slotIndex >= ship.primaryWeapons.length) {
    return state;
  }
  if (ship.primaryWeapons[slotIndex] !== null) {
    return state; // Slot already occupied
  }

  // Track ammo changes for ballistic weapons
  let newStoredAmmo = state.storedAmmo;
  let startingAmmo = 0;

  // For ballistic weapons, auto-load from storage
  if (weaponUsesAmmo(stored.weaponType)) {
    const maxCapacity = getMaxAmmoCapacity(stored.weaponType, bankSize);
    const ammoIndex = state.storedAmmo.findIndex(
      (a) => a.weaponType === stored.weaponType,
    );

    if (ammoIndex >= 0 && maxCapacity > 0) {
      const storedAmmo = state.storedAmmo[ammoIndex];
      if (storedAmmo) {
        // Load up to max capacity from storage
        const toLoad = Math.min(storedAmmo.count, maxCapacity);
        startingAmmo = toLoad;

        // Update storage
        const remaining = storedAmmo.count - toLoad;
        newStoredAmmo = [...state.storedAmmo];
        if (remaining <= 0) {
          newStoredAmmo.splice(ammoIndex, 1);
        } else {
          newStoredAmmo[ammoIndex] = {
            weaponType: storedAmmo.weaponType,
            count: remaining,
          };
        }
      }
    }
  }

  // Create equipped weapon
  const equipped: EquippedPrimary = weaponUsesAmmo(stored.weaponType)
    ? { weaponType: stored.weaponType, bankSize, currentAmmo: startingAmmo }
    : { weaponType: stored.weaponType, bankSize };

  // Assign to specific slot
  const updatedWeapons = ship.primaryWeapons.map((w, i) =>
    i === slotIndex ? equipped : w,
  );

  // Remove weapon from storage
  const updatedStorage = state.storedWeapons.filter(
    (_, i) => i !== storageIndex,
  );

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId ? { ...s, primaryWeapons: updatedWeapons } : s,
    ),
    storedWeapons: updatedStorage,
    storedAmmo: newStoredAmmo,
  };
}

/** Equip a secondary weapon from storage to a specific slot */
export function equipSecondary(
  state: CampaignState,
  shipId: string,
  storageIndex: number,
  slotIndex: number,
  bankSize: number,
  requestedCount?: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const stored = state.storedWeapons[storageIndex];
  if (!ship || !stored || stored.category !== 'secondary') {
    return state;
  }

  // Validate slot index and ensure slot is empty
  if (slotIndex < 0 || slotIndex >= ship.secondaryWeapons.length) {
    return state;
  }
  if (ship.secondaryWeapons[slotIndex] !== null) {
    return state; // Slot already occupied
  }

  // Calculate max capacity based on missile type and bank size
  const maxCapacity = getMaxMissileCapacity(stored.weaponType, bankSize);
  // Use requested count if provided, otherwise load up to capacity
  const maxLoadable = Math.min(stored.count, maxCapacity);
  const toLoad =
    requestedCount !== undefined
      ? Math.min(Math.max(1, requestedCount), maxLoadable)
      : maxLoadable;
  const remainder = stored.count - toLoad;

  // Create equipped weapon with proper capacity
  const equipped: EquippedSecondary = {
    weaponType: stored.weaponType,
    bankSize,
    count: toLoad,
    maxCount: maxCapacity,
  };

  // Assign to specific slot
  const updatedWeapons = ship.secondaryWeapons.map((w, i) =>
    i === slotIndex ? equipped : w,
  );

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
      s.id === shipId ? { ...s, secondaryWeapons: updatedWeapons } : s,
    ),
    storedWeapons: updatedStorage,
  };
}
