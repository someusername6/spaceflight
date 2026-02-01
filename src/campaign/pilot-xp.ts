/**
 * Pilot XP System - Experience tracking for wingmen.
 *
 * XP is earned by:
 * - Completing missions (victory or defeat): 10 XP
 * - Kills: 5 XP each
 * - Assists: 2 XP each
 * - Surviving an ejection (not retiring): 10 XP bonus
 *
 * NEW: XP accumulates and is manually spent to unlock/upgrade ship skills.
 * See pilot-skills.ts for the spending system.
 *
 * Note: Commander does not earn XP (always ace on all ships).
 * Note: Multiplayer player pilots don't earn XP (human-controlled).
 */

import type { Pilot } from './types';

/** XP values for different actions */
export const XP_MISSION_COMPLETE = 10;
export const XP_PER_KILL = 5;
export const XP_PER_ASSIST = 2;
export const XP_EJECTION_SURVIVAL = 10;

/**
 * Calculate XP earned from a mission.
 * Does not include ejection survival bonus (handled separately).
 */
export function calculateMissionXP(kills: number, assists: number): number {
  return XP_MISSION_COMPLETE + kills * XP_PER_KILL + assists * XP_PER_ASSIST;
}

/**
 * Add XP to a pilot's pool.
 * XP is no longer auto-spent on promotions - pilots manually spend XP.
 */
export function applyXP(pilot: Pilot, xpGained: number): Pilot {
  if (xpGained <= 0) return pilot;

  return {
    ...pilot,
    xp: pilot.xp + xpGained,
  };
}
