/**
 * Ship Identity component - stores ship type and callsign for HUD display.
 */

import type { ComponentBase, World } from '../core/types';

export interface ShipIdentity extends ComponentBase {
  readonly type: 'shipIdentity';
  /** Ship archetype (e.g., 'interceptor', 'scout') */
  archetype: string;
  /** Display callsign (e.g., 'Alpha 2', 'Bandit 1') */
  callsign: string;
}

/** Reset callsign counters (call at mission start) */
export function resetCallsignCounters(world: World): void {
  const counters = world.systemState.shipIdentity.callsignCounters;
  for (const key of Object.keys(counters)) {
    delete counters[key];
  }
}

/** Generate next callsign for a given prefix (uses world state for determinism) */
export function generateCallsign(world: World, prefix: string): string {
  const counters = world.systemState.shipIdentity.callsignCounters;
  const count = (counters[prefix] ?? 0) + 1;
  counters[prefix] = count;
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
