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

// =============================================================================
// Serialization
// =============================================================================

import {
  deserializeVector3,
  type SerializedVector3,
  serializeVector3,
} from '../core/serialization';

/** Category as numeric */
const CategoryToNum: Record<ProjectileCategory, number> = {
  energy: 0,
  ballistic: 1,
};
const NumToCategory: ProjectileCategory[] = ['energy', 'ballistic'];

export interface SerializedProjectile {
  t: 12; // Component type ID
  o: Entity; // owner
  dm: number; // damage
  sp: number; // speed
  rg: number; // range
  dt: number; // distanceTraveled
  dr: SerializedVector3; // direction
  ct: number; // category
  wn: string; // weaponName
  vn?: string; // visualName
  fr?: number; // flakRadius
  sc?: number; // shrapnelCount
  sd?: number; // shrapnelDamage
  ss?: number; // shrapnelSpeed
  sr?: number; // shrapnelRange
  sm?: number; // shieldDamageMultiplier
  iz?: boolean; // ionize
  ac?: number; // acceleration
  ms?: number; // maxSpeed
  tr?: number; // trackingRate
  tc?: number; // trackingCone
  sds?: boolean; // speedDamageScale
  bd?: number; // baseDamage
  tt?: Entity | null; // trackingTarget
  pc?: number; // previousClosestEnemyDistance
  is?: boolean; // isShrapnel
}

export function serializeProjectile(c: Projectile): SerializedProjectile {
  const result: SerializedProjectile = {
    t: 12,
    o: c.owner,
    dm: c.damage,
    sp: c.speed,
    rg: c.range,
    dt: c.distanceTraveled,
    dr: serializeVector3(c.direction),
    ct: CategoryToNum[c.category],
    wn: c.weaponName,
  };
  if (c.visualName !== undefined) result.vn = c.visualName;
  if (c.flakRadius !== undefined) result.fr = c.flakRadius;
  if (c.shrapnelCount !== undefined) result.sc = c.shrapnelCount;
  if (c.shrapnelDamage !== undefined) result.sd = c.shrapnelDamage;
  if (c.shrapnelSpeed !== undefined) result.ss = c.shrapnelSpeed;
  if (c.shrapnelRange !== undefined) result.sr = c.shrapnelRange;
  if (c.shieldDamageMultiplier !== undefined)
    result.sm = c.shieldDamageMultiplier;
  if (c.ionize !== undefined) result.iz = c.ionize;
  if (c.acceleration !== undefined) result.ac = c.acceleration;
  if (c.maxSpeed !== undefined) result.ms = c.maxSpeed;
  if (c.trackingRate !== undefined) result.tr = c.trackingRate;
  if (c.trackingCone !== undefined) result.tc = c.trackingCone;
  if (c.speedDamageScale !== undefined) result.sds = c.speedDamageScale;
  if (c.baseDamage !== undefined) result.bd = c.baseDamage;
  if (c.trackingTarget !== undefined) result.tt = c.trackingTarget ?? null;
  if (c.previousClosestEnemyDistance !== undefined)
    result.pc = c.previousClosestEnemyDistance;
  if (c.isShrapnel !== undefined) result.is = c.isShrapnel;
  return result;
}

export function deserializeProjectile(s: SerializedProjectile): Projectile {
  const result: Projectile = {
    type: 'projectile',
    owner: s.o,
    damage: s.dm,
    speed: s.sp,
    range: s.rg,
    distanceTraveled: s.dt,
    direction: deserializeVector3(s.dr),
    category: NumToCategory[s.ct] ?? 'energy',
    weaponName: s.wn,
  };
  if (s.vn !== undefined) result.visualName = s.vn;
  if (s.fr !== undefined) result.flakRadius = s.fr;
  if (s.sc !== undefined) result.shrapnelCount = s.sc;
  if (s.sd !== undefined) result.shrapnelDamage = s.sd;
  if (s.ss !== undefined) result.shrapnelSpeed = s.ss;
  if (s.sr !== undefined) result.shrapnelRange = s.sr;
  if (s.sm !== undefined) result.shieldDamageMultiplier = s.sm;
  if (s.iz !== undefined) result.ionize = s.iz;
  if (s.ac !== undefined) result.acceleration = s.ac;
  if (s.ms !== undefined) result.maxSpeed = s.ms;
  if (s.tr !== undefined) result.trackingRate = s.tr;
  if (s.tc !== undefined) result.trackingCone = s.tc;
  if (s.sds !== undefined) result.speedDamageScale = s.sds;
  if (s.bd !== undefined) result.baseDamage = s.bd;
  if (s.tt !== undefined) result.trackingTarget = s.tt ?? undefined;
  if (s.pc !== undefined) result.previousClosestEnemyDistance = s.pc;
  if (s.is !== undefined) result.isShrapnel = s.is;
  return result;
}
