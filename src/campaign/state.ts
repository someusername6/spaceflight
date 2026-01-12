/**
 * Campaign state management - create, save, load campaign state.
 */

import { createDerivedPRNG, random } from '../core/prng';
import { getArchetype } from '../factories/ship';
import { generateCampaignId } from './id-generator';
import { generateInitialRecruits } from './recruits';
import { createSlotArray, mapSlots } from './slot-array';
import { getMaxMissileCapacity } from './store/store-ammo';
import {
  createInitialStoreStock,
  generateSectorStock,
} from './store/store-catalog';
import { applyStoreTrickle } from './store/store-trickle';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  Pilot,
} from './types';
import { MAX_SECTOR } from './types';

/** Create a ship from an archetype with default loadout */
export function createShipFromArchetype(
  archetype: string,
  id: string,
  pilot: Pilot | null = null,
): OwnedShip {
  const stats = getArchetype(archetype);
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
    id,
    shipClass: stats.shipClassName, // Use the underlying ship class
    primaryWeapons: createSlotArray(primaryWeapons),
    secondaryWeapons: createSlotArray(secondaryWeapons),
    pilot,
  };
}

/** Create a pilot with default stats */
function createPilot(id: string, name: string, skill: Pilot['skill']): Pilot {
  return {
    id,
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

/** Create a new campaign with default starting state */
export function createNewCampaign(): CampaignState {
  // Generate master seed for this campaign run (different each time)
  const seed = Date.now() >>> 0;

  // Track ID counter locally during creation
  let nextId = 1;

  // Helper to generate IDs during campaign creation
  const genId = (prefix: string): string => {
    const [id, newNextId] = generateCampaignId(nextId, prefix);
    nextId = newNextId;
    return id;
  };

  // Create all pilots (commander + wingmen)
  const commander = createPilot(genId('pilot'), 'Commander', 'ace');
  const wingman1Pilot = createPilot(genId('pilot'), 'Viper', 'regular');
  const wingman2Pilot = createPilot(genId('pilot'), 'Ghost', 'regular');
  const wingman3Pilot = createPilot(genId('pilot'), 'Shadow', 'regular');
  const allPilots = [commander, wingman1Pilot, wingman2Pilot, wingman3Pilot];

  // Create ships with assigned pilots
  const commanderShip = createShipFromArchetype(
    'fighter',
    genId('ship'),
    commander,
  );
  const wingman1 = createShipFromArchetype(
    'fighter',
    genId('ship'),
    wingman1Pilot,
  );
  const wingman2 = createShipFromArchetype(
    'fighter',
    genId('ship'),
    wingman2Pilot,
  );
  const wingman3 = createShipFromArchetype(
    'fighter',
    genId('ship'),
    wingman3Pilot,
  );

  // Generate initial recruits using derived PRNG (missionCount=0 at start)
  const recruitRng = createDerivedPRNG(seed, 'recruits', 0);
  const { recruits: availableRecruits, nextId: afterRecruits } =
    generateInitialRecruits(nextId, allPilots, () => random(recruitRng));
  nextId = afterRecruits;

  // Generate initial store stock
  const storeStock = createInitialStoreStock();

  return {
    seed,
    nextId,
    credits: 1000,
    commanderId: commander.id,
    ships: [commanderShip, wingman1, wingman2, wingman3],
    pilots: allPilots,
    storedShips: [],
    storedWeapons: [],
    storedAmmo: [],
    storedScrap: {},
    storeStock,
    availableRecruits,
    currentSector: 1,
    sectorMissionsCompleted: 0,
    completedContracts: [],
    attemptedContracts: [],
    contractRefreshCount: 0,
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

/**
 * Apply mission results to campaign state.
 *
 * Processes ship losses, pilot deaths, credit rewards, and store restocking.
 * This function always returns a valid state, even if the commander died.
 *
 * IMPORTANT: Caller must check `isGameOver(result)` after calling this function
 * to handle commander death appropriately (show game-over screen, etc.).
 */
export function applyMissionResults(
  state: CampaignState,
  victory: boolean,
  creditsEarned: number,
  shipsLost: string[],
  completedContractId?: string,
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
      // Log commander death for debugging (caller handles game-over via isGameOver)
      if (lostShip.pilot.id === state.commanderId) {
        console.log('[Campaign] Commander killed - game over state');
      }
    }
  }

  // Remove destroyed ships
  const survivingShips = state.ships.filter((s) => !shipsLost.includes(s.id));

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

  // Track completed contracts (don't add duplicates)
  const completedContracts =
    completedContractId &&
    !state.completedContracts.includes(completedContractId)
      ? [...state.completedContracts, completedContractId]
      : state.completedContracts;

  // Apply mission results first
  const afterMission: CampaignState = {
    ...state,
    credits: state.credits + (victory ? creditsEarned : 0),
    ships: survivingShips,
    pilots: updatedPilots,
    missionCount: state.missionCount + 1,
    sectorMissionsCompleted: victory
      ? state.sectorMissionsCompleted + 1
      : state.sectorMissionsCompleted,
    completedContracts,
  };

  // Apply store trickle (resupply shipment arrives after each mission)
  return applyStoreTrickle(afterMission);
}

/** Check if game is over (commander's ship destroyed) */
export function isGameOver(state: CampaignState): boolean {
  return !isCommanderAssigned(state);
}

/** Advance to the next sector (resets sector mission count, restocks store) */
export function advanceSector(state: CampaignState): CampaignState {
  if (state.currentSector >= MAX_SECTOR) {
    return state; // Already at max sector
  }
  const newSector = state.currentSector + 1;
  return {
    ...state,
    currentSector: newSector,
    sectorMissionsCompleted: 0,
    contractRefreshCount: 0,
    storeStock: generateSectorStock(newSector),
  };
}

/** Get the cost to refresh contracts (scales with sector) */
export function getContractRefreshCost(sector: number): number {
  return 500 * sector;
}

/** Refresh available contracts (increment refresh counter, deduct cost) */
export function refreshContracts(state: CampaignState): CampaignState {
  const cost = getContractRefreshCost(state.currentSector);
  if (state.credits < cost) {
    return state; // Can't afford refresh
  }
  return {
    ...state,
    credits: state.credits - cost,
    contractRefreshCount: state.contractRefreshCount + 1,
  };
}

/** Mark a contract as attempted (called when mission starts) */
export function markContractAttempted(
  state: CampaignState,
  contractId: string,
): CampaignState {
  if (state.attemptedContracts.includes(contractId)) {
    return state; // Already tracked
  }
  return {
    ...state,
    attemptedContracts: [...state.attemptedContracts, contractId],
  };
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

    // Update primary weapon ammo (mapSlots skips null slots automatically)
    const updatedPrimaries = mapSlots(ship.primaryWeapons, (primary, index) => {
      const remaining = extracted.primaryAmmo.get(index);
      return remaining !== undefined
        ? { ...primary, currentAmmo: remaining }
        : primary;
    });

    // Update secondary weapon ammo (mapSlots skips null slots automatically)
    const updatedSecondaries = mapSlots(
      ship.secondaryWeapons,
      (secondary, index) => {
        const remaining = extracted.secondaryAmmo.get(index);
        return remaining !== undefined
          ? { ...secondary, count: remaining }
          : secondary;
      },
    );

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

// Future: localStorage save/load
// export function saveCampaign(state: CampaignState): void { ... }
// export function loadCampaign(): CampaignState | null { ... }
