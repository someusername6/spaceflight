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
  /** Shield damage multiplier (e.g., 3 for Ion = 3× damage to shields) */
  shieldDamageMultiplier?: number;
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
  return projectile;
}

/** Check if projectile is out of range */
export function isExpired(projectile: Projectile): boolean {
  return projectile.distanceTraveled >= projectile.range;
}
