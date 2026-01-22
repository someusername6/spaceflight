/**
 * Campaign state - mission result application functions.
 *
 * Handles applying mission outcomes (results, ammo usage, pilot stats)
 * back to the campaign state.
 */

import { logDebug } from '../core/logger';
import { getRetirementChance, rollForRetirement } from './ejection';
import { mapSlots } from './slot-array';
import { applyStoreTrickle } from './store/store-trickle';
import type { CampaignState } from './types';

/**
 * Apply mission results to campaign state.
 *
 * Processes ship losses, pilot ejections/deaths, credit rewards, and store restocking.
 * This function always returns a valid state, even if the commander died.
 *
 * Ejection system:
 * - Commander death = game over (no ejection)
 * - Wingman ship destruction = ejection (pilot survives, but may retire)
 *   - Retirement chance increases with each ejection: 0%, 15%, 30%, 45%, 50% (capped)
 *   - If pilot doesn't retire, they're injured for 1 mission
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

  // Process ship losses - separate commander death from wingman ejection
  let commanderDied = false;
  const ejectedPilotIds = new Set<string>(); // 1st ejection = injured
  const retiringPilotIds = new Set<string>(); // 2nd ejection = retirement

  for (const shipId of shipsLost) {
    const lostShip = state.ships.find((s) => s.id === shipId);
    if (lostShip?.pilot) {
      const pilot = lostShip.pilot;
      if (pilot.id === state.commanderId) {
        // Commander death = game over (no ejection)
        commanderDied = true;
        logDebug('Commander killed - game over state');
      } else {
        // Wingman ejection - roll for retirement based on ejection history
        const retires = rollForRetirement(
          state.seed,
          state.missionCount,
          pilot.id,
          pilot.ejectionCount,
        );
        const chance = getRetirementChance(pilot.ejectionCount);

        if (retires) {
          retiringPilotIds.add(pilot.id);
          logDebug(
            `Pilot ${pilot.name} retiring (${Math.round(chance * 100)}% chance, ejection #${pilot.ejectionCount + 1})`,
          );
        } else {
          // Survived ejection - injured for 1 mission
          ejectedPilotIds.add(pilot.id);
          logDebug(
            `Pilot ${pilot.name} ejected - injured for 1 mission (survived ${Math.round(chance * 100)}% retirement chance)`,
          );
        }
      }
    }
  }

  // Remove destroyed ships
  const survivingShips = state.ships.filter((s) => !shipsLost.includes(s.id));

  // Helper to update pilot after mission (returns null if pilot should be removed)
  const updatePilotAfterMission = (
    pilot: (typeof state.pilots)[0],
  ): (typeof state.pilots)[0] | null => {
    // Commander died - remove from roster (game over)
    if (pilot.id === state.commanderId && commanderDied) {
      return null;
    }

    // Retiring pilots - remove from roster
    if (retiringPilotIds.has(pilot.id)) {
      return null;
    }

    // Start with mission stats update (if pilot flew this mission)
    let updated = pilot;
    if (pilotIdsInMission.has(pilot.id)) {
      updated = {
        ...updated,
        missionsFlown: updated.missionsFlown + 1,
        missionsWon: updated.missionsWon + (victory ? 1 : 0),
      };
    }

    // Apply ejection effects (1st ejection = injured)
    if (ejectedPilotIds.has(pilot.id)) {
      updated = {
        ...updated,
        ejectionCount: updated.ejectionCount + 1,
        injuredMissionsLeft: 1,
      };
    }

    return updated;
  };

  // Update pilots array (filter out null for dead/retiring pilots)
  const pilotsAfterMission = state.pilots
    .map(updatePilotAfterMission)
    .filter((p): p is (typeof state.pilots)[0] => p !== null);

  // Apply injury recovery for pilots who were already injured (not newly ejected)
  // Injured pilots don't fly, so they recover while others are on missions
  const updatedPilots = pilotsAfterMission.map((pilot) => {
    // Skip if pilot wasn't injured or just ejected this mission
    if (pilot.injuredMissionsLeft <= 0 || ejectedPilotIds.has(pilot.id)) {
      return pilot;
    }
    // Decrement recovery time
    return {
      ...pilot,
      injuredMissionsLeft: pilot.injuredMissionsLeft - 1,
    };
  });

  // Also update pilots embedded in surviving ships (data is denormalized)
  const updatedShips = survivingShips.map((ship) => {
    if (!ship.pilot) return ship;
    const updatedPilot = updatePilotAfterMission(ship.pilot);
    // Pilot removed (shouldn't happen for surviving ships) or unchanged
    if (!updatedPilot || updatedPilot === ship.pilot) return ship;
    return { ...ship, pilot: updatedPilot };
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
    ships: updatedShips,
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

  // Helper to apply stats to a pilot
  const applyStats = (pilot: (typeof state.pilots)[0]) => {
    const extracted = statsByPilotId.get(pilot.id);
    if (!extracted) return pilot;
    return {
      ...pilot,
      kills: pilot.kills + extracted.kills,
      assists: pilot.assists + extracted.assists,
      damageDealt: pilot.damageDealt + extracted.damageDealt,
      damageReceived: pilot.damageReceived + extracted.damageReceived,
    };
  };

  // Update pilots array
  const updatedPilots = state.pilots.map(applyStats);

  // Also update pilots embedded in ships (data is denormalized)
  const updatedShips = state.ships.map((ship) => {
    if (!ship.pilot) return ship;
    const updatedPilot = applyStats(ship.pilot);
    if (updatedPilot === ship.pilot) return ship; // No change
    return { ...ship, pilot: updatedPilot };
  });

  return {
    ...state,
    pilots: updatedPilots,
    ships: updatedShips,
  };
}
