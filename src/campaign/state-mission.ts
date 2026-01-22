/**
 * Campaign state - mission result application functions.
 *
 * Handles applying mission outcomes (results, ammo usage, pilot stats)
 * back to the campaign state.
 */

import { logDebug } from '../core/logger';
import { mapSlots } from './slot-array';
import { applyStoreTrickle } from './store/store-trickle';
import type { CampaignState } from './types';

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
        logDebug('Commander killed - game over state');
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

/** Apply extracted pilot stats from mission back to campaign state */
export function applyPilotStats(
  state: CampaignState,
  pilotStats: Array<{
    pilotId: string;
    kills: number;
    assists: number;
    damageDealt: number;
    damageReceived: number;
  }>,
): CampaignState {
  // Create a map for quick lookup
  const statsByPilotId = new Map(pilotStats.map((s) => [s.pilotId, s]));

  // Update pilots with combat stats
  const updatedPilots = state.pilots.map((pilot) => {
    const extracted = statsByPilotId.get(pilot.id);
    if (!extracted) return pilot;

    return {
      ...pilot,
      kills: pilot.kills + extracted.kills,
      assists: pilot.assists + extracted.assists,
      damageDealt: pilot.damageDealt + extracted.damageDealt,
      damageReceived: pilot.damageReceived + extracted.damageReceived,
    };
  });

  return {
    ...state,
    pilots: updatedPilots,
  };
}
