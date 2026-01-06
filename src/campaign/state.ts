/**
 * Campaign state management - create, save, load campaign state.
 */

import { createPRNG, random } from '../core/prng';
import { getAmmoPrice, getSecondaryPrice } from '../data/prices';
import { SHIP_ARCHETYPES } from '../factories/ship-archetypes';
import { generateInitialRecruits } from './recruits';
import { createInitialStoreStock } from './store';
import { getMaxAmmoCapacity, getMaxMissileCapacity } from './store-ammo';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  Pilot,
} from './types';

/** Counter for deterministic ID generation */
let idCounter = 0;

/** Generate a unique ID (deterministic, counter-based) */
function generateId(): string {
  return `ship_${++idCounter}`;
}

/** Get max ammo capacity for a primary weapon (convenience wrapper) */
function getMaxPrimaryAmmo(primary: EquippedPrimary): number {
  return getMaxAmmoCapacity(primary.weaponType, primary.bankSize);
}

/** Create a ship from an archetype with default loadout */
export function createShipFromArchetype(
  archetype: string,
  pilot: Pilot | null = null,
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
    maxCount: getMaxMissileCapacity(w.name, w.size),
  }));

  return {
    id: generateId(),
    shipClass: stats.shipClassName, // Use the underlying ship class
    primaryWeapons,
    secondaryWeapons,
    pilot,
    hullDamage: 0,
  };
}

/** Create a pilot with default stats */
function createPilot(name: string, skill: Pilot['skill']): Pilot {
  return {
    id: generateId(),
    name,
    skill,
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
  };
}

/** Create commander pilot (the player) */
function createCommander(): Pilot {
  return createPilot('Commander', 'ace');
}

/** Create default starting pilots */
function createStartingPilots(): Pilot[] {
  return [
    createPilot('Viper', 'regular'),
    createPilot('Ghost', 'regular'),
    createPilot('Shadow', 'regular'),
  ];
}

/** Create a new campaign with default starting state */
export function createNewCampaign(): CampaignState {
  // Create all pilots (commander + wingmen)
  const commander = createCommander();
  const wingmanPilots = createStartingPilots();
  const allPilots = [commander, ...wingmanPilots];

  // Create ships with assigned pilots
  const commanderShip = createShipFromArchetype('fighter', commander);
  const wingman1 = createShipFromArchetype('fighter', wingmanPilots[0]);
  const wingman2 = createShipFromArchetype('fighter', wingmanPilots[1]);
  const wingman3 = createShipFromArchetype('fighter', wingmanPilots[2]);

  // Generate initial recruits (4 pilots available for hire)
  // Use fixed seed for deterministic recruit generation
  const recruitRng = createPRNG(42);
  const availableRecruits = generateInitialRecruits(allPilots, () =>
    random(recruitRng),
  );

  return {
    credits: 1000,
    commanderId: commander.id,
    ships: [commanderShip, wingman1, wingman2, wingman3],
    pilots: allPilots, // All pilots stored here
    storedHulls: [], // No spare hulls at start
    storedWeapons: [],
    storedAmmo: [], // No spare ammo at start
    storedScrap: {}, // No scrap at start
    storeStock: createInitialStoreStock(),
    availableRecruits, // Pilots available for hire
    currentSector: 1,
    completedContracts: [],
    missionCount: 0,
  };
}

/** Check if a ship is the commander's ship */
export function isCommanderShip(
  state: CampaignState,
  ship: OwnedShip,
): boolean {
  return ship.pilot?.id === state.commanderId;
}

/** Get the commander's ship from campaign state */
export function getCommanderShip(state: CampaignState): OwnedShip | undefined {
  return state.ships.find((s) => s.pilot?.id === state.commanderId);
}

/** Get the player's ship from campaign state (alias for getCommanderShip) */
export function getPlayerShip(state: CampaignState): OwnedShip | undefined {
  return getCommanderShip(state);
}

/** Get all wingman ships (AI-controlled friendly ships with pilots) */
export function getWingmanShips(state: CampaignState): OwnedShip[] {
  return state.ships.filter(
    (s) => s.pilot !== null && s.pilot.id !== state.commanderId,
  );
}

/** Get unassigned pilots (not currently in any ship) */
export function getUnassignedPilots(state: CampaignState): Pilot[] {
  const assignedPilotIds = new Set(
    state.ships.filter((s) => s.pilot).map((s) => s.pilot?.id),
  );
  return state.pilots.filter((p) => !assignedPilotIds.has(p.id));
}

/** Get a pilot by ID */
export function getPilotById(
  state: CampaignState,
  pilotId: string,
): Pilot | undefined {
  return state.pilots.find((p) => p.id === pilotId);
}

/** Check if commander is assigned to a ship */
export function isCommanderAssigned(state: CampaignState): boolean {
  return state.ships.some((s) => s.pilot?.id === state.commanderId);
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
  // Get pilot IDs from ships that flew the mission
  const pilotIdsInMission = new Set(
    state.ships.filter((s) => s.pilot).map((s) => s.pilot?.id),
  );

  // Find pilots who died (their ships were destroyed)
  const killedPilotIds = new Set<string>();
  for (const shipId of shipsLost) {
    const lostShip = state.ships.find((s) => s.id === shipId);
    if (lostShip?.pilot) {
      killedPilotIds.add(lostShip.pilot.id);
    }
  }

  // Remove destroyed ships
  const survivingShips = state.ships.filter((s) => !shipsLost.includes(s.id));

  // Apply hull damage to surviving ships
  for (const ship of survivingShips) {
    const damage = hullDamage.get(ship.id);
    if (damage !== undefined) {
      ship.hullDamage += damage;
    }
  }

  // Update pilot career stats for survivors, remove KIA pilots
  const updatedPilots = state.pilots
    .filter((pilot) => !killedPilotIds.has(pilot.id)) // Remove KIA
    .map((pilot) => {
      if (!pilotIdsInMission.has(pilot.id)) {
        return pilot;
      }
      return {
        ...pilot,
        missionsFlown: pilot.missionsFlown + 1,
        missionsWon: pilot.missionsWon + (victory ? 1 : 0),
      };
    });

  return {
    ...state,
    credits: state.credits + (victory ? creditsEarned : 0),
    ships: survivingShips,
    pilots: updatedPilots,
    missionCount: state.missionCount + 1,
  };
}

/** Check if game is over (commander's ship destroyed) */
export function isGameOver(state: CampaignState): boolean {
  return !isCommanderAssigned(state);
}

/** Apply extracted ammo from mission back to campaign state */
export function applyAmmoUsage(
  state: CampaignState,
  ammoData: Array<{
    campaignShipId: string;
    primaryAmmo: Map<number, number>;
    secondaryAmmo: Map<number, number>;
  }>,
): CampaignState {
  // Create a map for quick lookup
  const ammoByShipId = new Map(ammoData.map((a) => [a.campaignShipId, a]));

  // Update ships with remaining ammo
  const updatedShips = state.ships.map((ship) => {
    const extracted = ammoByShipId.get(ship.id);
    if (!extracted) return ship;

    // Update primary weapon ammo (skip null slots)
    const updatedPrimaries = ship.primaryWeapons.map((primary, index) => {
      if (primary === null) return null;
      const remaining = extracted.primaryAmmo.get(index);
      if (remaining !== undefined) {
        return { ...primary, currentAmmo: remaining };
      }
      return primary;
    });

    // Update secondary weapon ammo (skip null slots)
    const updatedSecondaries = ship.secondaryWeapons.map((secondary, index) => {
      if (secondary === null) return null;
      const remaining = extracted.secondaryAmmo.get(index);
      if (remaining !== undefined) {
        return { ...secondary, count: remaining };
      }
      return secondary;
    });

    return {
      ...ship,
      primaryWeapons: updatedPrimaries,
      secondaryWeapons: updatedSecondaries,
    };
  });

  return {
    ...state,
    ships: updatedShips,
  };
}

/** Calculate resupply cost for a single ship */
export function calculateResupplyCost(ship: OwnedShip): number {
  let cost = 0;

  // Primary weapons with finite ammo (skip null slots)
  for (const primary of ship.primaryWeapons) {
    if (primary === null) continue;
    if (primary.currentAmmo !== undefined) {
      const maxAmmo = getMaxPrimaryAmmo(primary);
      const needed = maxAmmo - primary.currentAmmo;
      const pricePerUnit = getAmmoPrice(primary.weaponType, 'buy');
      // Round to avoid fractional credits
      cost += Math.round(Math.max(0, needed) * pricePerUnit);
    }
  }

  // Secondary weapons - use actual missile prices (skip null slots)
  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) continue;
    const needed = secondary.maxCount - secondary.count;
    const pricePerUnit = getSecondaryPrice(secondary.weaponType, 'buy');
    cost += needed * pricePerUnit;
  }

  return cost;
}

/** Resupply a ship (refill all ammo) */
export function resupplyShip(ship: OwnedShip): OwnedShip {
  return {
    ...ship,
    primaryWeapons: ship.primaryWeapons.map((primary) => {
      if (primary === null) return null;
      if (primary.currentAmmo !== undefined) {
        const maxAmmo = getMaxPrimaryAmmo(primary);
        return { ...primary, currentAmmo: maxAmmo };
      }
      return primary;
    }),
    secondaryWeapons: ship.secondaryWeapons.map((secondary) => {
      if (secondary === null) return null;
      return { ...secondary, count: secondary.maxCount };
    }),
  };
}

/** Resupply all ships in campaign (deduct cost from credits) */
export function resupplyAllShips(state: CampaignState): CampaignState {
  let totalCost = 0;
  for (const ship of state.ships) {
    totalCost += calculateResupplyCost(ship);
  }

  if (totalCost > state.credits) {
    // Can't afford - return unchanged
    return state;
  }

  return {
    ...state,
    credits: state.credits - totalCost,
    ships: state.ships.map(resupplyShip),
  };
}

// Future: localStorage save/load
// export function saveCampaign(state: CampaignState): void { ... }
// export function loadCampaign(): CampaignState | null { ... }
