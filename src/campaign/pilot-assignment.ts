/**
 * Pilot assignment - assign/unassign pilots to ships.
 */

import {
  createEmptyWeaponSlots,
  transferShipWeaponsToStorage,
} from './ship-utils';
import type { CampaignState, OwnedShip, StoredShip } from './types';

/** Move pilot from active ship to stored ship, current ship goes to storage */
export function swapPilotToStoredShip(
  state: CampaignState,
  shipId: string,
  storedShipIndex: number,
): CampaignState {
  const ship = state.ships.find((s) => s.id === shipId);
  const storedShip = state.storedShips[storedShipIndex];
  if (!ship || !storedShip || !ship.pilot) {
    return state; // Ship must have a pilot assigned
  }

  // Get bank counts for new ship class
  const { primaryWeapons, secondaryWeapons } = createEmptyWeaponSlots(
    storedShip.shipClass,
  );

  // Create new active ship from stored ship with the same pilot
  const newShip: OwnedShip = {
    id: storedShip.id,
    shipClass: storedShip.shipClass,
    primaryWeapons, // Null-filled array matching bank count
    secondaryWeapons, // Null-filled array matching bank count
    pilot: ship.pilot,
  };

  // Old ship becomes a stored ship (weapons go to storage)
  const oldStoredShip: StoredShip = {
    id: ship.id,
    shipClass: ship.shipClass,
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
    storedShips: [
      ...state.storedShips.filter((_, i) => i !== storedShipIndex),
      oldStoredShip,
    ],
    storedWeapons,
    storedAmmo,
  };
}

/** Assign a pilot to a stored ship, creating a new active ship */
export function assignPilotToStoredShip(
  state: CampaignState,
  pilotId: string,
  storedShipIndex: number,
): CampaignState {
  const pilot = state.pilots.find((p) => p.id === pilotId);
  const storedShip = state.storedShips[storedShipIndex];
  if (!pilot || !storedShip) {
    return state;
  }

  // Check if pilot is already assigned to a ship
  const existingShip = state.ships.find((s) => s.pilot?.id === pilotId);
  if (existingShip) {
    return state; // Pilot already assigned
  }

  // Get bank counts for new ship class
  const { primaryWeapons, secondaryWeapons } = createEmptyWeaponSlots(
    storedShip.shipClass,
  );

  // Create new active ship from stored ship + pilot
  const newShip: OwnedShip = {
    id: storedShip.id,
    shipClass: storedShip.shipClass,
    primaryWeapons, // Null-filled array matching bank count
    secondaryWeapons, // Null-filled array matching bank count
    pilot,
  };

  return {
    ...state,
    ships: [...state.ships, newShip],
    storedShips: state.storedShips.filter((_, i) => i !== storedShipIndex),
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

  // Old ship becomes a stored ship (weapons go to storage)
  const oldStoredShip: StoredShip = {
    id: currentShip.id,
    shipClass: currentShip.shipClass,
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
    storedShips: [...state.storedShips, oldStoredShip],
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

  // Ship becomes a stored ship (pilot is unassigned but stays in state.pilots)
  const storedShip: StoredShip = {
    id: ship.id,
    shipClass: ship.shipClass,
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
    storedShips: [...state.storedShips, storedShip],
    storedWeapons,
    storedAmmo,
  };
}
