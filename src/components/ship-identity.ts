/**
 * Ship Identity component - stores ship type and callsign for HUD display.
 */

import type { ComponentBase } from '../core/types';

export interface ShipIdentity extends ComponentBase {
  readonly type: 'shipIdentity';
  /** Ship archetype (e.g., 'interceptor', 'scout') */
  archetype: string;
  /** Display callsign (e.g., 'Alpha 2', 'Bandit 1') */
  callsign: string;
}

/** Callsign counters for each prefix */
const callsignCounters: Record<string, number> = {};

/** Reset callsign counters (call at mission start) */
export function resetCallsignCounters(): void {
  for (const key of Object.keys(callsignCounters)) {
    delete callsignCounters[key];
  }
}

/** Generate next callsign for a given prefix */
export function generateCallsign(prefix: string): string {
  const count = (callsignCounters[prefix] ?? 0) + 1;
  callsignCounters[prefix] = count;
  return `${prefix} ${count}`;
}

/** Create a ShipIdentity component */
export function createShipIdentity(
  archetype: string,
  callsign: string,
): ShipIdentity {
  return {
    type: 'shipIdentity',
    archetype,
    callsign,
  };
}
