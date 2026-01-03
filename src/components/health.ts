/**
 * Health component - hull points for damage tracking.
 */

import type { ComponentBase } from '../core/types';

export interface Health extends ComponentBase {
  readonly type: 'health';
  hull: number;
  maxHull: number;
  /** Time remaining before entity is removed after death (undefined = not dying yet) */
  deathDelay?: number;
}

/** Creates a Health component */
export function createHealth(maxHull: number, currentHull?: number): Health {
  return {
    type: 'health',
    hull: currentHull ?? maxHull,
    maxHull,
  };
}

/** Check if entity is dead (hull <= 0) */
export function isDead(health: Health): boolean {
  return health.hull <= 0;
}

/** Check if entity is dying (dead but waiting for removal during death delay) */
export function isDying(health: Health): boolean {
  return health.hull <= 0 && health.deathDelay !== undefined && health.deathDelay > 0;
}

/** Apply damage to health, returns actual damage dealt */
export function applyDamage(health: Health, damage: number): number {
  const actualDamage = Math.min(health.hull, damage);
  health.hull -= actualDamage;
  return actualDamage;
}
