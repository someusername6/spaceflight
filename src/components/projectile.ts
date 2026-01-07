/**
 * Projectile component - data for flying projectiles.
 */

import type { ComponentBase, Entity, Vector3 } from '../core/types';

/** Projectile category affects hit visual effects */
export type ProjectileCategory = 'energy' | 'ballistic';

/** Known weapon names for visual configuration */
export type WeaponName =
  | 'Plasma'
  | 'Pulse'
  | 'Ion'
  | 'Autocannon'
  | 'Railgun'
  | 'Flak'
  | 'Shrapnel'
  | string;

export interface Projectile extends ComponentBase {
  readonly type: 'projectile';
  owner: Entity; // Who fired this (for friendly fire checks)
  damage: number;
  speed: number;
  range: number;
  distanceTraveled: number;
  direction: Vector3; // Unit vector, direction of travel
  category: ProjectileCategory; // For hit effect visuals
  weaponName: WeaponName; // For specific visual appearance
  /** Flak explosion radius - if set, projectile explodes into shrapnel when enemies are within this range */
  flakRadius?: number;
  /** Number of shrapnel projectiles to spawn on flak explosion */
  shrapnelCount?: number;
  /** Shield damage multiplier (default 1.0) */
  shieldDamageMultiplier?: number;
  /** Ion effect - ionizes target shields, doubling regen delay for 8 seconds */
  ionize?: boolean;
}

/** Creates a Projectile component */
export function createProjectile(
  owner: Entity,
  damage: number,
  speed: number,
  range: number,
  direction: Vector3,
  category: ProjectileCategory = 'energy',
  weaponName: WeaponName = 'Plasma',
  flakRadius?: number,
  shrapnelCount?: number,
  shieldDamageMultiplier?: number,
  ionize?: boolean,
): Projectile {
  const projectile: Projectile = {
    type: 'projectile',
    owner,
    damage,
    speed,
    range,
    distanceTraveled: 0,
    direction: direction.clone().normalize(),
    category,
    weaponName,
  };
  if (flakRadius !== undefined) projectile.flakRadius = flakRadius;
  if (shrapnelCount !== undefined) projectile.shrapnelCount = shrapnelCount;
  if (shieldDamageMultiplier !== undefined)
    projectile.shieldDamageMultiplier = shieldDamageMultiplier;
  if (ionize !== undefined) projectile.ionize = ionize;
  return projectile;
}

/** Check if projectile is out of range */
export function isExpired(projectile: Projectile): boolean {
  return projectile.distanceTraveled >= projectile.range;
}
