/**
 * Damage Tracking component - tracks damage sources for AI aggro responses.
 *
 * Used in ambush missions for escorts to react when:
 * - Convoy ships are attacked
 * - Self is attacked
 * - Nearby ally is attacked
 */

import type { ComponentBase, Entity } from '../core/types';

/** Track damage sources for AI aggro */
export interface DamageTracking extends ComponentBase {
  readonly type: 'damageTracking';
  /** Entity that last dealt damage */
  lastAttacker: Entity | null;
  /** Time of last damage (game time) */
  lastDamageTime: number;
}

/** Create a DamageTracking component */
export function createDamageTracking(): DamageTracking {
  return {
    type: 'damageTracking',
    lastAttacker: null,
    lastDamageTime: 0,
  };
}

// =============================================================================
// Serialization
// =============================================================================

export interface SerializedDamageTracking {
  t: 23; // Component type ID
  la: Entity | null; // lastAttacker
  ld: number; // lastDamageTime
}

export function serializeDamageTracking(
  c: DamageTracking,
): SerializedDamageTracking {
  return { t: 23, la: c.lastAttacker, ld: c.lastDamageTime };
}

export function deserializeDamageTracking(
  s: SerializedDamageTracking,
): DamageTracking {
  return { type: 'damageTracking', lastAttacker: s.la, lastDamageTime: s.ld };
}
