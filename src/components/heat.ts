/**
 * Heat component - tracks weapon heat buildup and cooling.
 */

import type { ComponentBase } from '../core/types';

export interface Heat extends ComponentBase {
  readonly type: 'heat';
  current: number;
  max: number;
  coolingRate: number; // Heat units per second
}

/** Creates a Heat component */
export function createHeat(max: number, coolingRate: number): Heat {
  return {
    type: 'heat',
    current: 0,
    max,
    coolingRate,
  };
}

/** Check if overheated (cannot fire) */
export function isOverheated(heat: Heat): boolean {
  return heat.current >= heat.max;
}

/** Add heat from firing, returns true if allowed (not overheated) */
export function addHeat(heat: Heat, amount: number): boolean {
  if (heat.current >= heat.max) {
    return false;
  }
  heat.current = Math.min(heat.max, heat.current + amount);
  return true;
}

/** Cool down over time */
export function coolDown(heat: Heat, dt: number): void {
  heat.current = Math.max(0, heat.current - heat.coolingRate * dt);
}
