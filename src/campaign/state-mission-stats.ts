/**
 * Campaign state - pilot stats and salary calculation.
 *
 * Handles applying pilot combat stats/XP and calculating mission salaries.
 */

import { logDebug } from '../core/logger';
import { isPlayerPilot } from '../multiplayer/ship-assignment';
import type { Pilot } from './pilot';
import { PILOT_SALARIES } from './pilot-skills';
import { applyXP, calculateMissionXP, XP_EJECTION_SURVIVAL } from './pilot-xp';
import type { CampaignState, SkillLevel } from './types';

/**
 * Apply an updater function to pilots embedded in ships (denormalized data).
 * Returns null from updater to skip, or the same reference if unchanged.
 */
export function syncPilotsToShips(
  ships: CampaignState['ships'],
  updater: (pilot: Pilot) => Pilot | null,
): CampaignState['ships'] {
  return ships.map((ship) => {
    if (!ship.pilot) return ship;
    const updated = updater(ship.pilot);
    if (!updated || updated === ship.pilot) return ship;
    return { ...ship, pilot: updated };
  });
}

/** Salary breakdown entry for a single pilot */
export interface SalaryEntry {
  name: string;
  salary: number;
}

/** Result of salary calculation */
export interface SalaryInfo {
  total: number;
  breakdown: SalaryEntry[];
}

/**
 * Calculate salaries for pilots who flew and survived.
 * - Commander does not pay salary
 * - Multiplayer player pilots do not pay salary
 * - Ejected/dead pilots do not pay salary (ship was destroyed)
 */
export function calculateMissionSalaries(
  state: CampaignState,
  shipsLost: string[],
): SalaryInfo {
  const breakdown: SalaryEntry[] = [];
  let total = 0;

  for (const ship of state.ships) {
    const pilot = ship.pilot;
    if (!pilot) continue;

    // Skip commander (no salary)
    if (pilot.id === state.commanderId) continue;

    // Skip multiplayer player pilots (no salary)
    if (isPlayerPilot(pilot)) continue;

    // Skip if ship was destroyed (pilot ejected or KIA)
    if (shipsLost.includes(ship.id)) continue;

    // Get salary based on skill for this ship
    const skill = pilot.shipSkills[ship.shipClass] as SkillLevel | undefined;
    if (!skill) continue;

    const salary = PILOT_SALARIES[skill as keyof typeof PILOT_SALARIES];
    breakdown.push({ name: pilot.name, salary });
    total += salary;
  }

  return { total, breakdown };
}

/**
 * Apply extracted pilot stats and XP from mission back to campaign state.
 *
 * XP is awarded to wingmen only (not commander):
 * - Mission completion: 10 XP
 * - Per kill: 5 XP
 * - Per assist: 2 XP
 * - Ejection survival bonus: 10 XP (if pilot ejected but didn't retire)
 *
 * @param ejectedPilotIds - IDs of pilots who ejected and survived (for XP bonus)
 */
export function applyPilotStats(
  state: CampaignState,
  pilotStats: Array<{
    pilotId: string;
    kills: number;
    assists: number;
    damageDealt: number;
    damageReceived: number;
  }>,
  ejectedPilotIds: Set<string> = new Set(),
): CampaignState {
  // Create a map for quick lookup
  const statsByPilotId = new Map(pilotStats.map((s) => [s.pilotId, s]));

  // Helper to apply stats and XP to a pilot (no logging - done separately)
  const applyStats = (pilot: (typeof state.pilots)[0]) => {
    const extracted = statsByPilotId.get(pilot.id);
    if (!extracted) return pilot;

    // Apply combat stats
    let updated = {
      ...pilot,
      kills: pilot.kills + extracted.kills,
      assists: pilot.assists + extracted.assists,
      damageDealt: pilot.damageDealt + extracted.damageDealt,
      damageReceived: pilot.damageReceived + extracted.damageReceived,
    };

    // Apply XP for roster wingmen only (not commander, not player pilots)
    if (pilot.id !== state.commanderId && !isPlayerPilot(pilot)) {
      let xpGained = calculateMissionXP(extracted.kills, extracted.assists);

      // Ejection survival bonus
      if (ejectedPilotIds.has(pilot.id)) {
        xpGained += XP_EJECTION_SURVIVAL;
      }

      updated = applyXP(updated, xpGained);
    }

    return updated;
  };

  // Update pilots array
  const updatedPilots = state.pilots.map(applyStats);

  // Log XP gains (only once, using pilots array)
  for (const pilot of state.pilots) {
    const extracted = statsByPilotId.get(pilot.id);
    if (!extracted) continue;
    // Skip commander and player pilots
    if (pilot.id === state.commanderId) continue;
    if (isPlayerPilot(pilot)) continue;

    let xpGained = calculateMissionXP(extracted.kills, extracted.assists);
    const hasEjectionBonus = ejectedPilotIds.has(pilot.id);
    if (hasEjectionBonus) {
      xpGained += XP_EJECTION_SURVIVAL;
    }

    const bonusText = hasEjectionBonus
      ? ' (includes ejection survival bonus)'
      : '';
    logDebug(`Pilot ${pilot.name} gains ${xpGained} XP${bonusText}`);

    // Note: XP is now pooled for manual spending - no auto-promotion
  }

  // Also update pilots embedded in ships (data is denormalized)
  const updatedShips = syncPilotsToShips(state.ships, applyStats);

  return {
    ...state,
    pilots: updatedPilots,
    ships: updatedShips,
  };
}
