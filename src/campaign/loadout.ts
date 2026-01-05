/**
 * Loadout management - equip/unequip weapons, swap pilots between ships.
 */

import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  StoredHull,
  StoredWeapon,
} from './types';

/** Unequip a primary weapon from a ship, move to storage */
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

  // Add to storage
  const stored: StoredWeapon = {
    weaponType: weapon.weaponType,
    category: 'primary',
    count: 1,
  };

  // Remove from ship
  const updatedWeapons = ship.primaryWeapons.filter(
    (_, i) => i !== weaponIndex,
  );

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId ? { ...s, primaryWeapons: updatedWeapons } : s,
    ),
    storedWeapons: [...state.storedWeapons, stored],
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

  // Add to storage (preserves ammo count)
  const stored: StoredWeapon = {
    weaponType: weapon.weaponType,
    category: 'secondary',
    count: weapon.count,
  };

  // Remove from ship
  const updatedWeapons = ship.secondaryWeapons.filter(
    (_, i) => i !== weaponIndex,
  );

  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === shipId ? { ...s, secondaryWeapons: updatedWeapons } : s,
    ),
    storedWeapons: [...state.storedWeapons, stored],
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

  // Create equipped weapon
  const equipped: EquippedPrimary = {
    weaponType: stored.weaponType,
    bankSize,
  };

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

  // Create equipped weapon (preserves ammo from storage)
  const equipped: EquippedSecondary = {
    weaponType: stored.weaponType,
    bankSize,
    count: stored.count,
    maxCount: stored.count, // Max is what we had in storage
  };

  // Remove from storage
  const updatedStorage = state.storedWeapons.filter(
    (_, i) => i !== storageIndex,
  );

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

/** Move pilot from active ship to stored hull, current ship goes to storage */
export function swapPilotToHull(
  state: CampaignState,
  shipId: string,
  hullIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const hull = state.storedHulls[hullIndex];
  if (!ship || !hull || ship.isPlayerShip) {
    // Don't allow swapping player's ship this way
    return state;
  }

  const pilot = ship.pilot;
  if (!pilot) return state;

  // Create new active ship from hull
  const newShip: OwnedShip = {
    id: hull.id,
    shipClass: hull.shipClass,
    primaryWeapons: [], // Starts empty - needs weapons equipped
    secondaryWeapons: [],
    pilot,
    hullDamage: hull.hullDamage,
    isPlayerShip: false,
  };

  // Old ship becomes a stored hull (weapons go to storage)
  const oldHull: StoredHull = {
    id: ship.id,
    shipClass: ship.shipClass,
    hullDamage: ship.hullDamage,
  };

  // Move old ship's weapons to storage
  const oldPrimaryWeapons: StoredWeapon[] = ship.primaryWeapons.map((w) => ({
    weaponType: w.weaponType,
    category: 'primary' as const,
    count: 1,
  }));
  const oldSecondaryWeapons: StoredWeapon[] = ship.secondaryWeapons.map(
    (w) => ({
      weaponType: w.weaponType,
      category: 'secondary' as const,
      count: w.count,
    }),
  );

  return {
    ...state,
    ships: state.ships.map((s) => (s.id === shipId ? newShip : s)),
    storedHulls: [
      ...state.storedHulls.filter((_, i) => i !== hullIndex),
      oldHull,
    ],
    storedWeapons: [
      ...state.storedWeapons,
      ...oldPrimaryWeapons,
      ...oldSecondaryWeapons,
    ],
  };
}
