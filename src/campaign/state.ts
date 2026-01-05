/**
 * Campaign state management - create, save, load campaign state.
 */

import type { DestroyedShipRecord } from '../components/combat-stats';
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
    { id: generateId(), name: 'Shadow', skill: 'regular' },
  ];
}

/** Create a new campaign with default starting state */
export function createNewCampaign(): CampaignState {
  // Player's ship (fighter - simple loadout)
  const playerShip = createShipFromArchetype('fighter', true);

  // Three wingmen (also fighters for now)
  const wingman1 = createShipFromArchetype('fighter');
  const wingman2 = createShipFromArchetype('fighter');
  const wingman3 = createShipFromArchetype('fighter');

  // Assign pilots to wingmen
  const pilots = createStartingPilots();
  wingman1.pilot = pilots[0] ?? null;
  wingman2.pilot = pilots[1] ?? null;
  wingman3.pilot = pilots[2] ?? null;

  return {
    credits: 1000,
    ships: [playerShip, wingman1, wingman2, wingman3],
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

/** Credits per enemy kill for salvage bonus */
const SALVAGE_CREDITS_PER_KILL = 50;

/** Calculate salvage bonus from enemy kills */
export function calculateSalvageBonus(
  destroyedShips: DestroyedShipRecord[],
): number {
  // Count enemy ships destroyed (not player, not wingman)
  const enemyKills = destroyedShips.filter(
    (record) => !record.wasPlayer && !record.isWingman,
  ).length;
  return enemyKills * SALVAGE_CREDITS_PER_KILL;
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

    // Update primary weapon ammo
    const updatedPrimaries = ship.primaryWeapons.map((primary, index) => {
      const remaining = extracted.primaryAmmo.get(index);
      if (remaining !== undefined) {
        return { ...primary, currentAmmo: remaining };
      }
      return primary;
    });

    // Update secondary weapon ammo
    const updatedSecondaries = ship.secondaryWeapons.map((secondary, index) => {
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

  // Primary weapons with finite ammo
  for (const primary of ship.primaryWeapons) {
    if (primary.currentAmmo !== undefined) {
      // Cost based on ammo needed (assume maxAmmo from archetype)
      // For now, simple calculation: 1 credit per ammo
      const needed = primary.bankSize * 100 - (primary.currentAmmo ?? 0);
      cost += Math.max(0, needed);
    }
  }

  // Secondary weapons
  for (const secondary of ship.secondaryWeapons) {
    const needed = secondary.maxCount - secondary.count;
    // Missiles cost more: 10 credits per missile
    cost += needed * 10;
  }

  return cost;
}

/** Resupply a ship (refill all ammo) */
export function resupplyShip(ship: OwnedShip): OwnedShip {
  return {
    ...ship,
    primaryWeapons: ship.primaryWeapons.map((primary) => {
      if (primary.currentAmmo !== undefined) {
        // Refill to max (bankSize * base ammo)
        return { ...primary, currentAmmo: primary.bankSize * 100 };
      }
      return primary;
    }),
    secondaryWeapons: ship.secondaryWeapons.map((secondary) => ({
      ...secondary,
      count: secondary.maxCount,
    })),
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
