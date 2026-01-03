/**
 * Shield component - regenerating protection layer.
 */

import type { ComponentBase } from '../core/types';

export interface Shields extends ComponentBase {
  readonly type: 'shields';
  current: number;
  max: number;
  regenRate: number; // Points per second
  regenDelay: number; // Seconds after damage before regen starts
  lastDamageTime: number; // Game time when last damaged
}

/** Creates a Shields component */
export function createShields(
  max: number,
  regenRate: number,
  regenDelay: number,
): Shields {
  return {
    type: 'shields',
    current: max,
    max,
    regenRate,
    regenDelay,
    lastDamageTime: -Infinity, // Start regenerating immediately
  };
}

/** Apply damage to shields, returns damage that passed through */
export function damageShields(
  shields: Shields,
  damage: number,
  gameTime: number,
): number {
  shields.lastDamageTime = gameTime;

  if (shields.current >= damage) {
    shields.current -= damage;
    return 0; // All damage absorbed
  }

  // Shields depleted, some damage passes through
  const passThrough = damage - shields.current;
  shields.current = 0;
  return passThrough;
}

/** Check if shields are up */
export function hasShields(shields: Shields): boolean {
  return shields.current > 0;
}

/** Regenerate shields if delay has passed */
export function regenerateShields(
  shields: Shields,
  gameTime: number,
  dt: number,
): void {
  if (shields.current >= shields.max) return;
  if (gameTime - shields.lastDamageTime < shields.regenDelay) return;

  shields.current = Math.min(
    shields.max,
    shields.current + shields.regenRate * dt,
  );
}
