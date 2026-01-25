/**
 * Faction component - team affiliation for friend/foe identification.
 */

import type { ComponentBase } from '../core/types';
import { Faction } from '../core/types';

export interface FactionComponent extends ComponentBase {
  readonly type: 'faction';
  faction: Faction;
}

/** Creates a Faction component */
export function createFaction(faction: Faction): FactionComponent {
  return {
    type: 'faction',
    faction,
  };
}

/** Check if two factions are enemies */
export function areEnemies(a: Faction, b: Faction): boolean {
  if (a === Faction.Neutral || b === Faction.Neutral) return false;
  return a !== b;
}

/** Check if two factions are allies */
export function areAllies(a: Faction, b: Faction): boolean {
  if (a === Faction.Neutral || b === Faction.Neutral) return false;
  return a === b;
}

export { Faction };

// =============================================================================
// Serialization
// =============================================================================

export interface SerializedFaction {
  t: 5; // Component type ID
  f: Faction; // faction (already numeric)
}

export function serializeFaction(c: FactionComponent): SerializedFaction {
  return { t: 5, f: c.faction };
}

export function deserializeFaction(s: SerializedFaction): FactionComponent {
  return { type: 'faction', faction: s.f };
}
