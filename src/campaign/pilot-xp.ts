/**
 * Pilot XP System - Experience tracking and skill progression for wingmen.
 *
 * XP is earned by:
 * - Completing missions (victory or defeat): 10 XP
 * - Kills: 5 XP each
 * - Assists: 2 XP each
 * - Surviving an ejection (not retiring): 10 XP bonus
 *
 * Level up occurs at 100 XP, which promotes the pilot to the next skill level:
 * rookie → regular → veteran → ace → elite
 *
 * Once a pilot reaches elite, they no longer track XP (already at max).
 * Average level-up rate: ~5 missions (based on ~2 kills/mission average).
 *
 * Note: Commander/player pilot does not track XP.
 */

import type { Pilot, SkillLevel } from './types';

/** XP required to reach the next skill level */
export const XP_PER_LEVEL = 100;

/** XP values for different actions */
export const XP_MISSION_COMPLETE = 10;
export const XP_PER_KILL = 5;
export const XP_PER_ASSIST = 2;
export const XP_EJECTION_SURVIVAL = 10;

/** Skill progression order (excluding green which isn't used for recruits) */
const SKILL_PROGRESSION: SkillLevel[] = [
  'rookie',
  'regular',
  'veteran',
  'ace',
  'elite',
];

/** Check if a pilot is at max skill level (elite) */
export function isMaxSkillLevel(pilot: Pilot): boolean {
  return pilot.skill === 'elite';
}

/** Get the next skill level, or null if already at max */
function getNextSkillLevel(current: SkillLevel): SkillLevel | null {
  const currentIndex = SKILL_PROGRESSION.indexOf(current);
  if (currentIndex === -1 || currentIndex >= SKILL_PROGRESSION.length - 1) {
    return null; // Already at max or unknown skill
  }
  const next = SKILL_PROGRESSION[currentIndex + 1];
  return next ?? null;
}

/**
 * Calculate XP earned from a mission.
 * Does not include ejection survival bonus (handled separately).
 */
export function calculateMissionXP(kills: number, assists: number): number {
  return XP_MISSION_COMPLETE + kills * XP_PER_KILL + assists * XP_PER_ASSIST;
}

/**
 * Apply XP to a pilot, handling skill level promotions.
 * Returns a new pilot object with updated xp and potentially upgraded skill.
 *
 * If pilot is already elite, returns unchanged (no XP tracking at max level).
 */
export function applyXP(pilot: Pilot, xpGained: number): Pilot {
  // Elite pilots don't track XP
  if (isMaxSkillLevel(pilot)) {
    return pilot;
  }

  if (xpGained <= 0) return pilot;

  let newXP = pilot.xp + xpGained;
  let newSkill = pilot.skill;

  // Handle level-ups (XP resets on each promotion)
  while (newXP >= XP_PER_LEVEL) {
    const nextSkill = getNextSkillLevel(newSkill);
    if (!nextSkill) {
      // Already at elite trying to level again - cap XP at 0
      newXP = 0;
      break;
    }
    newXP -= XP_PER_LEVEL;
    newSkill = nextSkill;

    // Just reached elite - no more XP tracking
    if (newSkill === 'elite') {
      newXP = 0;
      break;
    }
  }

  return {
    ...pilot,
    xp: newXP,
    skill: newSkill,
  };
}

/**
 * Get XP progress as a percentage (0-100) for display.
 * Returns 100 for elite pilots (maxed out).
 */
export function getXPProgress(pilot: Pilot): number {
  if (isMaxSkillLevel(pilot)) {
    return 100;
  }
  return Math.floor((pilot.xp / XP_PER_LEVEL) * 100);
}
