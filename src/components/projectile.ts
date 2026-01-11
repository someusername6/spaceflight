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
  | 'Slug Cannon'
  | 'Gyrojet'
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
  // === Gyrojet-style accelerating projectiles ===
  /** Acceleration rate in m/s² (if set, projectile accelerates over time) */
  acceleration?: number;
  /** Maximum speed for accelerating projectiles */
  maxSpeed?: number;
  /** Tracking turn rate in degrees/sec (gentle in-flight tracking) */
  trackingRate?: number;
  /** Tracking cone in degrees - only tracks if target is within this angle */
  trackingCone?: number;
  /** If true, damage scales with speed ratio (speed/maxSpeed) */
  speedDamageScale?: boolean;
  /** Base damage at max speed (for speed-scaled projectiles) */
  baseDamage?: number;
  /** Target entity for in-flight tracking (undefined = no target/target died) */
  trackingTarget?: Entity | undefined;
}

/** Extended options for projectile creation */
export interface CreateProjectileOptions {
  flakRadius?: number;
  shrapnelCount?: number;
  shieldDamageMultiplier?: number;
  ionize?: boolean;
  // Gyrojet-style options
  acceleration?: number;
  maxSpeed?: number;
  trackingRate?: number;
  trackingCone?: number;
  speedDamageScale?: boolean;
  trackingTarget?: Entity;
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
  options?: CreateProjectileOptions,
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
  // Legacy parameters (for backwards compatibility)
  if (flakRadius !== undefined) projectile.flakRadius = flakRadius;
  if (shrapnelCount !== undefined) projectile.shrapnelCount = shrapnelCount;
  if (shieldDamageMultiplier !== undefined)
    projectile.shieldDamageMultiplier = shieldDamageMultiplier;
  if (ionize !== undefined) projectile.ionize = ionize;

  // Extended options (for gyrojet and future weapons)
  if (options) {
    // Override legacy params if also in options
    if (options.flakRadius !== undefined)
      projectile.flakRadius = options.flakRadius;
    if (options.shrapnelCount !== undefined)
      projectile.shrapnelCount = options.shrapnelCount;
    if (options.shieldDamageMultiplier !== undefined)
      projectile.shieldDamageMultiplier = options.shieldDamageMultiplier;
    if (options.ionize !== undefined) projectile.ionize = options.ionize;

    // Gyrojet-specific fields
    if (options.acceleration !== undefined)
      projectile.acceleration = options.acceleration;
    if (options.maxSpeed !== undefined) projectile.maxSpeed = options.maxSpeed;
    if (options.trackingRate !== undefined)
      projectile.trackingRate = options.trackingRate;
    if (options.trackingCone !== undefined)
      projectile.trackingCone = options.trackingCone;
    if (options.speedDamageScale !== undefined) {
      projectile.speedDamageScale = options.speedDamageScale;
      projectile.baseDamage = damage; // Store base damage for speed scaling
    }
    if (options.trackingTarget !== undefined)
      projectile.trackingTarget = options.trackingTarget;
  }

  return projectile;
}

/** Check if projectile is out of range */
export function isExpired(projectile: Projectile): boolean {
  return projectile.distanceTraveled >= projectile.range;
}
