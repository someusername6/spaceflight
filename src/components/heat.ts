/**
 * Heat component - tracks weapon heat buildup and cooling.
 *
 * Heat affects both weapons and afterburner with graduated thresholds:
 * - 90%: Warning state (AI considers regrouping)
 * - 95%: Afterburner locks (unlocks at 50%)
 * - 100%: Weapons lock (unlocks at 95%)
 *
 * Torch weapons can inject external heat into targets, pushing heat above
 * 100% max capacity. Ships must cool all the way down from overheat.
 */

import type { ComponentBase } from '../core/types';

/** Heat threshold constants - centralized for consistency */
export const HEAT_WARNING_THRESHOLD = 0.9; // 90% - HUD warning, AI regroups
export const AFTERBURNER_LOCK_THRESHOLD = 0.95; // 95% - Afterburner disabled
export const AFTERBURNER_UNLOCK_THRESHOLD = 0.5; // 50% - Afterburner re-enabled
export const WEAPON_LOCK_THRESHOLD = 1.0; // 100% - Weapons disabled
export const WEAPON_UNLOCK_THRESHOLD = 0.95; // 95% - Weapons re-enabled

export interface Heat extends ComponentBase {
  readonly type: 'heat';
  current: number;
  max: number;
  coolingRate: number; // Heat units per second
  weaponsLocked: boolean; // Locked due to overheating (hysteresis)
}

/** Creates a Heat component */
export function createHeat(max: number, coolingRate: number): Heat {
  return {
    type: 'heat',
    current: 0,
    max,
    coolingRate,
    weaponsLocked: false,
  };
}

/** Get heat as percentage (0-1+, can exceed 1.0 from external heat injection) */
export function getHeatPercent(heat: Heat): number {
  return heat.current / heat.max;
}

/** Get heat percentage capped at 1.0 for display purposes */
export function getHeatPercentCapped(heat: Heat): number {
  return Math.min(1, heat.current / heat.max);
}

/** Check if heat is at warning level (90%+) */
export function isHeatWarning(heat: Heat): boolean {
  return getHeatPercent(heat) >= HEAT_WARNING_THRESHOLD;
}

/** Check if overheated (weapons locked) */
export function isOverheated(heat: Heat): boolean {
  return heat.weaponsLocked;
}

/** Add heat from firing, returns true if allowed (not locked) */
export function addHeat(heat: Heat, amount: number): boolean {
  if (heat.weaponsLocked) {
    return false;
  }
  heat.current = Math.min(heat.max, heat.current + amount);
  // Lock weapons if we hit 100%
  if (heat.current >= heat.max) {
    heat.weaponsLocked = true;
  }
  return true;
}

/**
 * Inject external heat (from Torch weapons hitting this ship).
 * Unlike addHeat, this can push heat above max capacity and always applies.
 * Ships must cool all the way down from overheat state.
 */
export function injectExternalHeat(heat: Heat, amount: number): void {
  heat.current += amount; // No cap - can exceed max!
  // Lock weapons if at or above max
  if (heat.current >= heat.max) {
    heat.weaponsLocked = true;
  }
}

/** Cool down over time, handles weapon unlock hysteresis */
export function coolDown(heat: Heat, dt: number): void {
  heat.current = Math.max(0, heat.current - heat.coolingRate * dt);
  // Unlock weapons when cooled to 95%
  if (heat.weaponsLocked && getHeatPercent(heat) <= WEAPON_UNLOCK_THRESHOLD) {
    heat.weaponsLocked = false;
  }
}
