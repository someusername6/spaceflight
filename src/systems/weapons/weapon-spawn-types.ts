/**
 * Weapon Spawn Types - Type definitions and helpers for projectile spawning.
 *
 * Contains the ProjectileWeaponInfo interface and buildProjectileOptions helper
 * used by weapon-spawning.ts to create projectile entities.
 */

import type { CreateProjectileOptions } from '../../components/projectile';
import type { Entity } from '../../core/types';

/** Weapon info for projectile spawning */
export interface ProjectileWeaponInfo {
  name: string;
  damage: number;
  projectileSpeed: number;
  range: number;
  category?: string; // WeaponCategory includes 'beam' but we filter that out
  flakRadius?: number;
  shrapnelCount?: number;
  shrapnelDamage?: number;
  shrapnelSpeed?: number;
  shrapnelRange?: number;
  shieldDamageMultiplier?: number;
  ionize?: boolean;
  // Gyrojet-style fields
  initialSpeed?: number;
  acceleration?: number;
  trackingRate?: number;
  trackingCone?: number;
  speedDamageScale?: boolean;
  autoaimFov?: number;
}

/** Build projectile options from weapon stats */
export function buildProjectileOptions(
  weapon: ProjectileWeaponInfo,
  target?: Entity,
): CreateProjectileOptions | undefined {
  const options: CreateProjectileOptions = {};

  // Copy optional fields (only add if defined)
  if (weapon.flakRadius !== undefined) options.flakRadius = weapon.flakRadius;
  if (weapon.shrapnelCount !== undefined)
    options.shrapnelCount = weapon.shrapnelCount;
  if (weapon.shrapnelDamage !== undefined)
    options.shrapnelDamage = weapon.shrapnelDamage;
  if (weapon.shrapnelSpeed !== undefined)
    options.shrapnelSpeed = weapon.shrapnelSpeed;
  if (weapon.shrapnelRange !== undefined)
    options.shrapnelRange = weapon.shrapnelRange;
  if (weapon.shieldDamageMultiplier !== undefined)
    options.shieldDamageMultiplier = weapon.shieldDamageMultiplier;
  if (weapon.ionize !== undefined) options.ionize = weapon.ionize;
  if (weapon.speedDamageScale)
    options.speedDamageScale = weapon.speedDamageScale;

  // Gyrojet-style acceleration
  if (weapon.acceleration !== undefined) {
    options.acceleration = weapon.acceleration;
    options.maxSpeed = weapon.projectileSpeed;
  }

  // Tracking (gyrojet)
  if (weapon.trackingRate !== undefined) {
    options.trackingRate = weapon.trackingRate;
    if (weapon.trackingCone !== undefined)
      options.trackingCone = weapon.trackingCone;
    if (target !== undefined) options.trackingTarget = target;
  }

  return Object.keys(options).length > 0 ? options : undefined;
}
