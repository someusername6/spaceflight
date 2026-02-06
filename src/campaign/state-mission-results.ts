/**
 * Campaign state - mission result application.
 *
 * Processes ship losses, pilot ejections/deaths, credit rewards, and store restocking.
 */

import { logDebug } from '../core/logger';
import { isPlayerPilot } from '../multiplayer/ship-assignment';
import { rollEjectionOutcome } from './ejection';
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
 * - Wingman ship destruction = ejection with three possible outcomes:
 *   - Safe: Pilot survives unharmed
 *   - Injured: Pilot survives but is unavailable for 1-3 missions
 *   - KIA: Pilot is killed in action (permanent removal)
 *   Risk increases with each ejection (0% KIA on first, up to 35% on 5th+)
 *
 * IMPORTANT: Caller must check `isGameOver(result)` after calling this function
 * to handle commander death appropriately (show game-over screen, etc.).
 *
 * @param salaryTotal - Total salary to deduct (calculated via calculateMissionSalaries)
 */
export function applyMissionResults(
  state: CampaignState,
  victory: boolean,
  creditsEarned: number,
  shipsLost: string[],
  completedContractId?: string,
  salaryTotal = 0,
): CampaignState {
  // Get pilot IDs from ships that flew the mission
  const pilotIdsInMission = new Set(
    state.ships.filter((s) => s.pilot).map((s) => s.pilot?.id),
  );

  // Process ship losses - separate commander death from wingman ejection
  let commanderDied = false;
  const ejectedPilotIds = new Set<string>(); // Pilots who ejected safely
  const injuredPilotIds = new Map<string, number>(); // Pilot ID -> injury duration
  const kiaPilotIds = new Set<string>(); // Pilots killed in action

  for (const shipId of shipsLost) {
    const lostShip = state.ships.find((s) => s.id === shipId);
    if (lostShip?.pilot) {
      const pilot = lostShip.pilot;
      if (pilot.id === state.commanderId) {
        // Commander death = game over (no ejection)
        commanderDied = true;
        logDebug('Commander killed - game over state');
      } else if (isPlayerPilot(pilot)) {
        // Multiplayer player pilots always "safe" - they're temporary
        // No ejection roll, no injury/KIA, just mark as ejected
        ejectedPilotIds.add(pilot.id);
        logDebug(
          `Player pilot ${pilot.name} ejected safely (exempt from rolls)`,
        );
      } else {
        // Wingman ejection - roll for outcome based on ejection history
        const outcome = rollEjectionOutcome(
          state.seed,
          state.missionCount,
          pilot.id,
          pilot.ejectionCount,
        );

        if (outcome.type === 'kia') {
          kiaPilotIds.add(pilot.id);
          logDebug(
            `Pilot ${pilot.name} KIA (ejection #${pilot.ejectionCount + 1})`,
          );
        } else if (outcome.type === 'injured') {
          injuredPilotIds.set(pilot.id, outcome.missions);
          logDebug(
            `Pilot ${pilot.name} injured for ${outcome.missions} mission(s) (ejection #${pilot.ejectionCount + 1})`,
          );
        } else {
          // Safe - still increment ejection count
          ejectedPilotIds.add(pilot.id);
          logDebug(
            `Pilot ${pilot.name} ejected safely (ejection #${pilot.ejectionCount + 1})`,
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

    // KIA pilots - remove from roster permanently
    if (kiaPilotIds.has(pilot.id)) {
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

    // Apply injury effects (injured for 1-3 missions)
    const injuryDuration = injuredPilotIds.get(pilot.id);
    if (injuryDuration !== undefined) {
      updated = {
        ...updated,
        ejectionCount: updated.ejectionCount + 1,
        injuredMissionsLeft: injuryDuration,
      };
    }

    // Apply safe ejection (just increment ejection count)
    if (ejectedPilotIds.has(pilot.id)) {
      updated = {
        ...updated,
        ejectionCount: updated.ejectionCount + 1,
      };
    }

    return updated;
  };

  // Update pilots array (filter out null for dead/retiring pilots)
  const pilotsAfterMission = state.pilots
    .map(updatePilotAfterMission)
    .filter((p): p is (typeof state.pilots)[0] => p !== null);

  // Apply injury recovery for pilots who were already injured (not newly injured)
  // Injured pilots don't fly, so they recover while others are on missions
  const updatedPilots = pilotsAfterMission.map((pilot) => {
    // Skip if pilot wasn't injured or just got injured this mission
    const justInjured = injuredPilotIds.has(pilot.id);
    if (pilot.injuredMissionsLeft <= 0 || justInjured) {
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

  // Calculate net credits: gross reward minus salaries
  // Salaries are paid regardless of victory (pilots flew the mission)
  const grossReward = victory ? creditsEarned : 0;
  const netCredits = grossReward - salaryTotal;

  // Apply mission results first
  const afterMission: CampaignState = {
    ...state,
    credits: state.credits + netCredits,
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
