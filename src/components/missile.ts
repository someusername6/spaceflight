/**
 * Missile component - tracking missiles in flight.
 */

import type { ComponentBase, Entity, Vector3 } from '../core/types';
import { MISSILES } from '../data/missiles';
import type { SecondaryWeapon } from './weapons';

// Re-export for convenience
export type { MissileStats } from '../data/missiles';
export { MISSILES } from '../data/missiles';

/** Missile type for visual differentiation */
export type MissileType =
  | 'rocket'
  | 'starburst'
  | 'seeker'
  | 'dart'
  | 'cluster'
  | 'swarm'
  | 'torpedo'
  | 'nuke';

/** Missile in-flight component */
export interface Missile extends ComponentBase {
  readonly type: 'missile';
  owner: Entity;
  target: Entity | undefined;
  damage: number;
  speed: number;
  turnRate: number; // Radians per second
  range: number;
  distanceTraveled: number;
  direction: Vector3;
  aoeRadius: number; // Area of effect radius (0 = no AoE)
  isNuke: boolean; // For visual effects (larger explosion)
  missileType: MissileType; // Visual appearance type
  resistedDecoys: Set<Entity>; // Decoys this missile already resisted (no re-roll)
  /** Previous frame's closest distance to enemy (for AoE proximity detonation) */
  previousClosestEnemyDistance?: number;
  /** Proximity detonation radius - explodes when enemies within range */
  flakRadius?: number;
  /** Number of shrapnel projectiles on detonation */
  shrapnelCount?: number;
  /** Shrapnel damage per piece */
  shrapnelDamage?: number;
  /** Shrapnel projectile speed (m/s) */
  shrapnelSpeed?: number;
  /** Shrapnel travel range before expiring */
  shrapnelRange?: number;
}

/** Optional shrapnel config for missiles */
export interface MissileShrapnelConfig {
  flakRadius?: number;
  shrapnelCount?: number;
  shrapnelDamage?: number;
  shrapnelSpeed?: number;
  shrapnelRange?: number;
}

/** Creates a Missile component */
export function createMissile(
  owner: Entity,
  target: Entity | undefined,
  damage: number,
  speed: number,
  turnRate: number,
  range: number,
  direction: Vector3,
  aoeRadius = 0,
  isNuke = false,
  missileType: MissileType = 'seeker',
  shrapnel?: MissileShrapnelConfig,
): Missile {
  const missile: Missile = {
    type: 'missile',
    owner,
    target,
    damage,
    speed,
    turnRate: (turnRate * Math.PI) / 180, // Convert deg/s to rad/s
    range,
    distanceTraveled: 0,
    direction: direction.clone().normalize(),
    aoeRadius,
    isNuke,
    missileType,
    resistedDecoys: new Set(),
  };

  // Only add shrapnel properties if defined (exactOptionalPropertyTypes)
  if (shrapnel?.flakRadius !== undefined)
    missile.flakRadius = shrapnel.flakRadius;
  if (shrapnel?.shrapnelCount !== undefined)
    missile.shrapnelCount = shrapnel.shrapnelCount;
  if (shrapnel?.shrapnelDamage !== undefined)
    missile.shrapnelDamage = shrapnel.shrapnelDamage;
  if (shrapnel?.shrapnelSpeed !== undefined)
    missile.shrapnelSpeed = shrapnel.shrapnelSpeed;
  if (shrapnel?.shrapnelRange !== undefined)
    missile.shrapnelRange = shrapnel.shrapnelRange;

  return missile;
}

/** Check if missile has exceeded its range */
export function isMissileExpired(missile: Missile): boolean {
  return missile.distanceTraveled >= missile.range;
}

/**
 * Missile definitions - derived from data/missiles.ts (single source of truth).
 * @deprecated Use MISSILES directly instead.
 */
export const MISSILE_DEFS = MISSILES;

/** Creates a SecondaryWeapon from a missile definition (count is scaled by bankSize) */
export function createSecondaryWeaponFromDef(
  name: string,
  baseCount: number,
  bankSize = 1,
): SecondaryWeapon {
  const def = MISSILE_DEFS[name];
  if (!def) throw new Error(`Unknown missile: ${name}`);
  const count = baseCount * bankSize;
  return { ...def, count, maxCount: count, bankSize };
}
