/**
 * Campaign state management - create, save, load campaign state.
 */

import { createDerivedPRNG, random } from '../core/prng';
import { getArchetype } from '../factories/ship';
import { generateCampaignId } from './id-generator';
import { generateInitialRecruits } from './recruits';
import { createSlotArray } from './slot-array';
import { getMaxMissileCapacity } from './store/store-ammo';
import {
  createInitialStoreStock,
  generateSectorStock,
} from './store/store-catalog';
import type {
  CampaignSettings,
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
  OwnedShip,
  Pilot,
} from './types';
import { DEFAULT_CAMPAIGN_SETTINGS, MAX_SECTOR } from './types';

// Re-export mission application functions for backwards compatibility
export {
  applyAmmoUsage,
  applyMissionResults,
  applyPilotStats,
} from './state-mission';

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

/**
 * Create a pilot with default stats.
 * @param shipClass - Ship class the pilot is trained on (null for commander who can fly all)
 * @param skill - Skill level for that ship class
 */
function createPilot(
  id: string,
  name: string,
  shipClass: string | null,
  skill: Pilot['shipSkills'][string],
): Pilot {
  // Commander has empty shipSkills (handled specially via commanderId)
  // Regular pilots have one trained ship
  const shipSkills: Pilot['shipSkills'] =
    shipClass && skill ? { [shipClass]: skill } : {};

  return {
    id,
    name,
    shipSkills,
    kills: 0,
    assists: 0,
    missionsFlown: 0,
    missionsWon: 0,
    damageDealt: 0,
    damageReceived: 0,
    ejectionCount: 0,
    injuredMissionsLeft: 0,
    xp: 0,
  };
}

/**
 * Create a new campaign with default starting state.
 * @param settings Campaign settings (commander name, ironman mode, etc.)
 * @param providedSeed Optional seed for deterministic campaign generation.
 *                     If not provided, uses Date.now() (single-player default).
 *                     For multiplayer, server should provide agreed-upon seed.
 */
export function createNewCampaign(
  settings: CampaignSettings = DEFAULT_CAMPAIGN_SETTINGS,
  providedSeed?: number,
): CampaignState {
  // Use provided seed or generate from current time (single-player default)
  const seed = providedSeed ?? Date.now() >>> 0;

  // Track ID counter locally during creation
  let nextId = 1;

  // Helper to generate IDs during campaign creation
  const genId = (prefix: string): string => {
    const [id, newNextId] = generateCampaignId(nextId, prefix);
    nextId = newNextId;
    return id;
  };

  // Create all pilots (commander + wingmen)
  // Commander has null shipClass - they can fly any ship at ace level (via commanderId)
  const commander = createPilot(
    genId('pilot'),
    settings.commanderName,
    null,
    'ace',
  );
  // Wingmen start with fighter skill at regular level
  const wingman1Pilot = createPilot(
    genId('pilot'),
    'Viper',
    'fighter',
    'regular',
  );
  const wingman2Pilot = createPilot(
    genId('pilot'),
    'Ghost',
    'fighter',
    'regular',
  );
  const wingman3Pilot = createPilot(
    genId('pilot'),
    'Shadow',
    'fighter',
    'regular',
  );
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
    settings,
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
    stateVersion: 0,
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

/** Check if game is over (commander's ship destroyed) */
export function isGameOver(state: CampaignState): boolean {
  return !isCommanderAssigned(state);
}

/** Advance to the next sector (resets sector mission count, restocks store, deducts cost) */
export function advanceSector(state: CampaignState): CampaignState {
  if (state.currentSector >= MAX_SECTOR) {
    return state; // Already at max sector
  }
  const cost = getSectorAdvanceCost(state.currentSector);
  if (state.credits < cost) {
    return state; // Can't afford to advance
  }
  const newSector = state.currentSector + 1;
  return {
    ...state,
    credits: state.credits - cost,
    currentSector: newSector,
    sectorMissionsCompleted: 0,
    contractRefreshCount: 0,
    storeStock: generateSectorStock(newSector),
  };
}

/** Get the cost to refresh contracts (scales with sector) */
export function getContractRefreshCost(sector: number): number {
  return 50 * sector;
}

/** Get the cost to advance to the next sector */
export function getSectorAdvanceCost(sector: number): number {
  return 1000 * sector;
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
