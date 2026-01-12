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
  weaponName: WeaponName; // For stats attribution
  visualName?: WeaponName; // For visual appearance (defaults to weaponName)
  /** Flak explosion radius - if set, projectile explodes into shrapnel when enemies are within this range */
  flakRadius?: number;
  /** Number of shrapnel projectiles to spawn on flak explosion */
  shrapnelCount?: number;
  /** Shrapnel damage per piece */
  shrapnelDamage?: number;
  /** Shrapnel projectile speed (m/s) */
  shrapnelSpeed?: number;
  /** Shrapnel travel range before expiring */
  shrapnelRange?: number;
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
  /** Previous frame's closest distance to enemy (for flak proximity detonation) */
  previousClosestEnemyDistance?: number;
  /** True if this is shrapnel from a flak explosion (for stats tracking) */
  isShrapnel?: boolean;
}

/** Extended options for projectile creation */
export interface CreateProjectileOptions {
  flakRadius?: number;
  shrapnelCount?: number;
  shrapnelDamage?: number;
  shrapnelSpeed?: number;
  shrapnelRange?: number;
  shieldDamageMultiplier?: number;
  ionize?: boolean;
  // Gyrojet-style options
  acceleration?: number;
  maxSpeed?: number;
  trackingRate?: number;
  trackingCone?: number;
  speedDamageScale?: boolean;
  trackingTarget?: Entity;
  isShrapnel?: boolean;
  visualName?: WeaponName;
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

  // Apply options
  if (options) {
    if (options.flakRadius !== undefined)
      projectile.flakRadius = options.flakRadius;
    if (options.shrapnelCount !== undefined)
      projectile.shrapnelCount = options.shrapnelCount;
    if (options.shrapnelDamage !== undefined)
      projectile.shrapnelDamage = options.shrapnelDamage;
    if (options.shrapnelSpeed !== undefined)
      projectile.shrapnelSpeed = options.shrapnelSpeed;
    if (options.shrapnelRange !== undefined)
      projectile.shrapnelRange = options.shrapnelRange;
    if (options.shieldDamageMultiplier !== undefined)
      projectile.shieldDamageMultiplier = options.shieldDamageMultiplier;
    if (options.ionize !== undefined) projectile.ionize = options.ionize;
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
    if (options.isShrapnel !== undefined)
      projectile.isShrapnel = options.isShrapnel;
    if (options.visualName !== undefined)
      projectile.visualName = options.visualName;
  }

  return projectile;
}

/** Check if projectile is out of range */
export function isExpired(projectile: Projectile): boolean {
  return projectile.distanceTraveled >= projectile.range;
}
