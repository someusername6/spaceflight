/**
 * Pilot skill system - ship-specific skills with manual XP spending.
 *
 * Pilots have separate skill levels per ship class. XP is earned from missions
 * and manually spent to unlock new ships or upgrade existing skills.
 */

import {
  isHumanControlled,
  isPlayerPilot,
} from '../multiplayer/ship-assignment';
import type { Pilot, SkillLevel } from './types';

// XP costs for skill progression
export const XP_COSTS = {
  unlock: 25, // Unlock new ship at rookie
  rookieToRegular: 50,
  regularToVeteran: 100,
  veteranToAce: 200,
  aceToElite: 400,
} as const;

// Cumulative XP invested at each level
export const XP_INVESTED = {
  rookie: 25,
  regular: 75,
  veteran: 175,
  ace: 375,
  elite: 775,
} as const;

// Bonus XP pool by advertised skill tier (for recruits)
export const RECRUIT_BONUS_XP = {
  rookie: 25,
  regular: 50,
  veteran: 75,
  ace: 100,
  elite: 150,
} as const;

// Salary per mission by skill level
export const PILOT_SALARIES = {
  rookie: 50,
  regular: 100,
  veteran: 200,
  ace: 400,
  elite: 800,
} as const;

/**
 * Check if pilot can fly a specific ship class.
 * - Commander can fly any ship (handled by caller checking commanderId)
 * - Human-controlled player pilots can fly any ship
 * - AI-converted player pilots and roster pilots need training
 */
export function canFlyShip(pilot: Pilot, shipClass: string): boolean {
  // Human-controlled player pilots can fly any ship
  if (isPlayerPilot(pilot) && isHumanControlled(pilot)) {
    return true;
  }
  return shipClass in pilot.shipSkills;
}

/**
 * Get pilot's skill level for a ship class.
 * - Commander is always ace
 * - Human-controlled player pilots return 'ace' (display as "PLAYER")
 * - AI-converted player pilots and roster pilots use shipSkills
 */
export function getShipSkill(
  pilot: Pilot,
  shipClass: string,
  commanderId: string,
): SkillLevel | null {
  // Commander is always ace on all ships
  if (pilot.id === commanderId) {
    return 'ace';
  }
  // Human-controlled player pilots are treated as ace (for AI purposes)
  // UI should display as "PLAYER" by checking isPlayerPilot && isHumanControlled
  if (isPlayerPilot(pilot) && isHumanControlled(pilot)) {
    return 'ace';
  }
  return pilot.shipSkills[shipClass] ?? null;
}

/** Get XP cost to upgrade or unlock a skill */
export function getUpgradeCost(currentSkill: SkillLevel | null): number {
  if (currentSkill === null) return XP_COSTS.unlock;
  if (currentSkill === 'rookie') return XP_COSTS.rookieToRegular;
  if (currentSkill === 'regular') return XP_COSTS.regularToVeteran;
  if (currentSkill === 'veteran') return XP_COSTS.veteranToAce;
  if (currentSkill === 'ace') return XP_COSTS.aceToElite;
  return Infinity; // Elite cannot upgrade
}

/** Get salary for a pilot flying a specific ship */
export function getPilotSalary(
  pilot: Pilot,
  shipClass: string,
  commanderId: string,
): number {
  // Commander has no salary
  if (pilot.id === commanderId) {
    return 0;
  }
  const skill = pilot.shipSkills[shipClass];
  if (!skill) return 0; // Should not happen if validation works
  return PILOT_SALARIES[skill as keyof typeof PILOT_SALARIES];
}

/** Get the next skill level after the current one */
function getNextSkillLevel(current: SkillLevel | null): SkillLevel {
  if (current === null) return 'rookie';
  if (current === 'rookie') return 'regular';
  if (current === 'regular') return 'veteran';
  if (current === 'veteran') return 'ace';
  if (current === 'ace') return 'elite';
  return 'elite';
}

/**
 * Unlock or upgrade a ship skill for a pilot.
 * Deducts XP and returns updated pilot.
 * Throws if insufficient XP or already at elite.
 */
export function spendXPOnShip(pilot: Pilot, shipClass: string): Pilot {
  const currentSkill = pilot.shipSkills[shipClass] ?? null;

  // Check elite first (before calculating cost which returns Infinity for elite)
  if (currentSkill === 'elite') {
    throw new Error('Already at elite level');
  }

  const cost = getUpgradeCost(currentSkill);
  if (pilot.xp < cost) {
    throw new Error(`Insufficient XP: need ${cost}, have ${pilot.xp}`);
  }

  const nextSkill = getNextSkillLevel(currentSkill);

  return {
    ...pilot,
    xp: pilot.xp - cost,
    shipSkills: {
      ...pilot.shipSkills,
      [shipClass]: nextSkill,
    },
  };
}
