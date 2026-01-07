/**
 * Pilot assignment - assign/unassign pilots to ships and hulls.
 */

import {
  createEmptyWeaponSlots,
  transferShipWeaponsToStorage,
} from './ship-utils';
import type { CampaignState, OwnedShip, StoredHull } from './types';

/** Move pilot from active ship to stored hull, current ship goes to storage */
export function swapPilotToHull(
  state: CampaignState,
  shipId: string,
  hullIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const hull = state.storedHulls[hullIndex];
  if (!ship || !hull || !ship.pilot) {
    return state; // Ship must have a pilot assigned
  }

  // Get bank counts for new ship class
  const { primaryWeapons, secondaryWeapons } = createEmptyWeaponSlots(
    hull.shipClass,
  );

  // Create new active ship from hull with the same pilot
  const newShip: OwnedShip = {
    id: hull.id,
    shipClass: hull.shipClass,
    primaryWeapons, // Null-filled array matching bank count
    secondaryWeapons, // Null-filled array matching bank count
    pilot: ship.pilot,
    hullDamage: hull.hullDamage,
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

/** Assign a pilot to a stored hull, creating a new active ship */
export function assignPilotToHull(
  state: CampaignState,
  pilotId: string,
  hullIndex: number,
): CampaignState {
  const pilot = state.pilots.find((p) => p.id === pilotId);
  const hull = state.storedHulls[hullIndex];
  if (!pilot || !hull) {
    return state;
  }

  // Check if pilot is already assigned to a ship
  const existingShip = state.ships.find((s) => s.pilot?.id === pilotId);
  if (existingShip) {
    return state; // Pilot already assigned
  }

  // Get bank counts for new ship class
  const { primaryWeapons, secondaryWeapons } = createEmptyWeaponSlots(
    hull.shipClass,
  );

  // Create new active ship from hull + pilot
  const newShip: OwnedShip = {
    id: hull.id,
    shipClass: hull.shipClass,
    primaryWeapons, // Null-filled array matching bank count
    secondaryWeapons, // Null-filled array matching bank count
    pilot,
    hullDamage: hull.hullDamage,
  };

  return {
    ...state,
    ships: [...state.ships, newShip],
    storedHulls: state.storedHulls.filter((_, i) => i !== hullIndex),
  };
}

/** Assign a pilot to an existing ship (reassignment) */
export function assignPilotToShip(
  state: CampaignState,
  pilotId: string,
  shipId: string,
): CampaignState {
  const pilot = state.pilots.find((p) => p.id === pilotId);
  const ship = state.ships.find((s) => s.id === shipId);
  if (!pilot || !ship) {
    return state;
  }

  // Check if pilot is already assigned to another ship
  const existingShip = state.ships.find((s) => s.pilot?.id === pilotId);
  if (existingShip) {
    return state; // Pilot already assigned elsewhere
  }

  // Check if ship already has a pilot
  if (ship.pilot) {
    return state; // Ship already has a pilot
  }

  // Assign pilot to ship
  return {
    ...state,
    ships: state.ships.map((s) => (s.id === shipId ? { ...s, pilot } : s)),
  };
}

/** Swap pilot from current ship to an empty active ship */
export function swapPilotToShip(
  state: CampaignState,
  pilotId: string,
  targetShipId: string,
): CampaignState {
  const pilot = state.pilots.find((p) => p.id === pilotId);
  const currentShip = state.ships.find((s) => s.pilot?.id === pilotId);
  const targetShip = state.ships.find((s) => s.id === targetShipId);

  if (!pilot || !currentShip || !targetShip) {
    return state;
  }

  // Target ship must be empty (no pilot)
  if (targetShip.pilot !== null) {
    return state;
  }

  // Old ship becomes a stored hull (weapons go to storage)
  const oldHull: StoredHull = {
    id: currentShip.id,
    shipClass: currentShip.shipClass,
    hullDamage: currentShip.hullDamage,
  };

  // Transfer all weapons and ammo from old ship to storage
  const { storedWeapons, storedAmmo } = transferShipWeaponsToStorage(
    currentShip,
    state.storedWeapons,
    state.storedAmmo,
  );

  // Update ships: remove old ship, assign pilot to target
  const updatedShips = state.ships
    .filter((s) => s.id !== currentShip.id)
    .map((s) => (s.id === targetShipId ? { ...s, pilot } : s));

  return {
    ...state,
    ships: updatedShips,
    storedHulls: [...state.storedHulls, oldHull],
    storedWeapons,
    storedAmmo,
  };
}

/** Unassign a pilot from a ship, ship goes to storage */
export function unassignPilot(
  state: CampaignState,
  shipId: string,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || !ship.pilot) {
    return state;
  }

  // Ship becomes a stored hull (pilot is unassigned but stays in state.pilots)
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
    storedHulls: [...state.storedHulls, newHull],
    storedWeapons,
    storedAmmo,
  };
}
