/**
 * Shield component - regenerating protection layer.
 *
 * Shields regenerate after a delay when not taking damage.
 * Ion weapons can "ionize" shields, doubling the regen delay duration.
 */

import type { ComponentBase } from '../core/types';

/** Duration of ionized state after being hit by Ion weapon */
export const IONIZE_DURATION = 8;

export interface Shields extends ComponentBase {
  readonly type: 'shields';
  current: number;
  max: number;
  regenRate: number; // Points per second
  regenDelay: number; // Seconds after damage before regen starts
  lastDamageTime: number; // Game time when last damaged
  /** Game time when ionized state ends (Ion weapons double regen delay) */
  ionizedUntil: number;
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
    ionizedUntil: -Infinity, // Not ionized initially
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

/** Check if shields are currently ionized */
export function isIonized(shields: Shields, gameTime: number): boolean {
  return gameTime < shields.ionizedUntil;
}

/** Apply ionized effect (from Ion weapons) - doubles regen delay duration */
export function ionizeShields(shields: Shields, gameTime: number): void {
  shields.ionizedUntil = gameTime + IONIZE_DURATION;
}

/** Regenerate shields if delay has passed and not ionized */
export function regenerateShields(
  shields: Shields,
  gameTime: number,
  dt: number,
): void {
  if (shields.current >= shields.max) return;

  // Calculate effective regen delay (doubled if ionized)
  const effectiveDelay = isIonized(shields, gameTime)
    ? shields.regenDelay * 2
    : shields.regenDelay;

  if (gameTime - shields.lastDamageTime < effectiveDelay) return;

  shields.current = Math.min(
    shields.max,
    shields.current + shields.regenRate * dt,
  );
}

// =============================================================================
// Serialization
// =============================================================================

export interface SerializedShields {
  t: 18; // Component type ID
  c: number; // current
  m: number; // max
  rr: number; // regenRate
  rd: number; // regenDelay
  ld: number; // lastDamageTime
  iu: number; // ionizedUntil
}

export function serializeShields(c: Shields): SerializedShields {
  return {
    t: 18,
    c: c.current,
    m: c.max,
    rr: c.regenRate,
    rd: c.regenDelay,
    ld: c.lastDamageTime,
    iu: c.ionizedUntil,
  };
}

export function deserializeShields(s: SerializedShields): Shields {
  return {
    type: 'shields',
    current: s.c,
    max: s.m,
    regenRate: s.rr,
    regenDelay: s.rd,
    lastDamageTime: s.ld,
    ionizedUntil: s.iu,
  };
}
