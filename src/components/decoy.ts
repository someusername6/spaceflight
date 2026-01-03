/**
 * Decoy component - Countermeasure to distract missiles.
 *
 * Decoys launch backward from the ship, travel at low speed,
 * and can seduce missiles away from their intended targets.
 */

import type { ComponentBase, Entity, Vector3 } from '../core/types';

/** Decoy properties */
export const DECOY_SPEED = 50; // m/s (slow movement)
export const DECOY_LIFETIME = 10; // seconds before despawning
export const DECOY_SEDUCE_CHANCE = 0.5; // 50% chance to distract missile
export const DECOY_SEDUCE_RANGE = 200; // Range at which decoys attract missiles

/** Decoy component - active countermeasure */
export interface Decoy extends ComponentBase {
  readonly type: 'decoy';
  owner: Entity;
  direction: Vector3;
  timeRemaining: number;
}

/** Creates a Decoy component */
export function createDecoy(owner: Entity, direction: Vector3): Decoy {
  return {
    type: 'decoy',
    owner,
    direction: direction.clone().normalize(),
    timeRemaining: DECOY_LIFETIME,
  };
}

/** Check if decoy has expired */
export function isDecoyExpired(decoy: Decoy): boolean {
  return decoy.timeRemaining <= 0;
}
