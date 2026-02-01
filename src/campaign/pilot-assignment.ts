/**
 * Pilot assignment - assign/unassign pilots to ships.
 */

import { canFlyShip } from './pilot-skills';
import {
  createEmptyWeaponSlots,
  transferShipWeaponsToStorage,
} from './ship-utils';
import type { CampaignState, OwnedShip, Pilot, StoredShip } from './types';

/** Result of checking if a pilot can be assigned */
export interface CanAssignResult {
  canAssign: boolean;
  reason?: string;
}

/**
 * Check if a pilot can be assigned to a ship.
 * Returns false with reason if pilot is injured.
 */
export function canAssignPilot(pilot: Pilot): CanAssignResult {
  if (pilot.injuredMissionsLeft > 0) {
    const missions = pilot.injuredMissionsLeft;
    return {
      canAssign: false,
      reason: `${pilot.name} is injured (${missions} mission${missions > 1 ? 's' : ''} remaining)`,
    };
  }
  return { canAssign: true };
}

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

  // Validate pilot can fly the target ship class (commander can fly any)
  if (
    ship.pilot.id !== state.commanderId &&
    !canFlyShip(ship.pilot, storedShip.shipClass)
  ) {
    return state; // Pilot not trained on this ship class
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

  // Validate pilot can fly this ship class (commander can fly any)
  if (
    pilotId !== state.commanderId &&
    !canFlyShip(pilot, storedShip.shipClass)
  ) {
    return state; // Pilot not trained on this ship class
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

  // Validate pilot can fly this ship class (commander can fly any)
  if (pilotId !== state.commanderId && !canFlyShip(pilot, ship.shipClass)) {
    return state; // Pilot not trained on this ship class
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

  // Validate pilot can fly the target ship class (commander can fly any)
  if (
    pilotId !== state.commanderId &&
    !canFlyShip(pilot, targetShip.shipClass)
  ) {
    return state; // Pilot not trained on this ship class
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

/**
 * Dismiss a pilot from the roster.
 * Auto-unassigns from any ship first.
 * Cannot dismiss commander.
 */
export function dismissPilot(
  state: CampaignState,
  pilotId: string,
): CampaignState {
  // Cannot dismiss commander
  if (pilotId === state.commanderId) {
    throw new Error('Cannot dismiss commander');
  }

  // Check if pilot exists
  const pilot = state.pilots.find((p) => p.id === pilotId);
  if (!pilot) {
    return state; // Pilot not found, no change
  }

  // Auto-unassign from any ship first
  let updatedState = state;
  const assignedShip = state.ships.find((s) => s.pilot?.id === pilotId);
  if (assignedShip) {
    updatedState = unassignPilot(updatedState, assignedShip.id);
  }

  // Remove from roster
  return {
    ...updatedState,
    pilots: updatedState.pilots.filter((p) => p.id !== pilotId),
  };
}
