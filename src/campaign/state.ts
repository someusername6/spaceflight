/**
 * Campaign state management - create, save, load campaign state.
 */

import { SHIP_ARCHETYPES } from '../factories/ship-archetypes';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  Pilot,
} from './types';

/** Generate a unique ID */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Create a ship from an archetype with default loadout */
export function createShipFromArchetype(
  archetype: string,
  isPlayerShip = false,
): OwnedShip {
  const stats = SHIP_ARCHETYPES[archetype];
  if (!stats) {
    throw new Error(`Unknown archetype: ${archetype}`);
  }

  const primaryWeapons: EquippedPrimary[] = stats.primaryWeapons.map((w) => ({
    weaponType: w.name,
    bankSize: w.size,
  }));

  const secondaryWeapons: EquippedSecondary[] = (
    stats.secondaryWeapons ?? []
  ).map((w) => ({
    weaponType: w.name,
    bankSize: w.size,
    count: w.count * w.size, // Scaled by bank size
    maxCount: w.count * w.size,
  }));

  return {
    id: generateId(),
    archetype,
    primaryWeapons,
    secondaryWeapons,
    pilot: null,
    hullDamage: 0,
    isPlayerShip,
  };
}

/** Create default starting pilots */
function createStartingPilots(): Pilot[] {
  return [
    { id: generateId(), name: 'Viper', skill: 'regular' },
    { id: generateId(), name: 'Ghost', skill: 'regular' },
  ];
}

/** Create a new campaign with default starting state */
export function createNewCampaign(): CampaignState {
  // Player's ship (interceptor)
  const playerShip = createShipFromArchetype('interceptor', true);

  // Two wingmen (also interceptors for now)
  const wingman1 = createShipFromArchetype('interceptor');
  const wingman2 = createShipFromArchetype('interceptor');

  // Assign pilots to wingmen
  const pilots = createStartingPilots();
  wingman1.pilot = pilots[0] ?? null;
  wingman2.pilot = pilots[1] ?? null;

  return {
    credits: 1000,
    ships: [playerShip, wingman1, wingman2],
    pilots: [], // All pilots assigned
    storedWeapons: [],
    currentSector: 1,
    completedContracts: [],
    missionCount: 0,
  };
}

/** Get the player's ship from campaign state */
export function getPlayerShip(state: CampaignState): OwnedShip | undefined {
  return state.ships.find((s) => s.isPlayerShip);
}

/** Get all wingman ships (AI-controlled friendly ships) */
export function getWingmanShips(state: CampaignState): OwnedShip[] {
  return state.ships.filter((s) => !s.isPlayerShip && s.pilot !== null);
}

/** Get ships that need repairs (hull damage > 0) */
export function getShipsNeedingRepair(state: CampaignState): OwnedShip[] {
  return state.ships.filter((s) => s.hullDamage > 0);
}

/** Calculate repair cost for a ship */
export function calculateRepairCost(ship: OwnedShip): number {
  // Placeholder: 10 credits per point of damage
  return ship.hullDamage * 10;
}

/** Apply mission results to campaign state */
export function applyMissionResults(
  state: CampaignState,
  victory: boolean,
  creditsEarned: number,
  shipsLost: string[],
  hullDamage: Map<string, number>,
): CampaignState {
  // Remove destroyed ships
  const survivingShips = state.ships.filter((s) => !shipsLost.includes(s.id));

  // Apply hull damage to surviving ships
  for (const ship of survivingShips) {
    const damage = hullDamage.get(ship.id);
    if (damage !== undefined) {
      ship.hullDamage += damage;
    }
  }

  return {
    ...state,
    credits: state.credits + (victory ? creditsEarned : 0),
    ships: survivingShips,
    missionCount: state.missionCount + 1,
    // Return pilots from destroyed ships to the pool
    pilots: [
      ...state.pilots,
      ...state.ships
        .filter((s) => shipsLost.includes(s.id) && s.pilot)
        .map((s) => s.pilot as Pilot),
    ],
  };
}

/** Check if game is over (player ship destroyed) */
export function isGameOver(state: CampaignState): boolean {
  return !state.ships.some((s) => s.isPlayerShip);
}

// Future: localStorage save/load
// export function saveCampaign(state: CampaignState): void { ... }
// export function loadCampaign(): CampaignState | null { ... }
