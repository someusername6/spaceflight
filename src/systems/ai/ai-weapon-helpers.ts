/**
 * AI Weapon Helper Functions - utility functions for weapon selection.
 */

import type { PrimaryWeapon, PrimaryWeapons } from '../../components/weapons';
import { getEffectiveHeat } from '../../components/weapons';
import type { AIProfile } from '../../data/ai-profiles';
import {
  getDistanceCategory,
  getWeaponRangeCategory,
  RangeCategory,
} from './ai-weapon-categories';

/**
 * Maximum speed ratio for weapons to be considered "lead compatible".
 * 1.3 = 30% difference (e.g., 400 vs 520 m/s is compatible)
 */
const MAX_SPEED_RATIO = 1.3;

/** Check if two projectile speeds are "lead compatible". */
function areSpeedsCompatible(speed1: number, speed2: number): boolean {
  if (speed1 === 0 || speed2 === 0) return speed1 === 0 && speed2 === 0;
  const ratio = speed1 > speed2 ? speed1 / speed2 : speed2 / speed1;
  return ratio <= MAX_SPEED_RATIO;
}

/** Check if all projectile weapons have compatible speeds for linked fire. */
export function areProjectileSpeedsCompatible(
  weapons: PrimaryWeapons,
): boolean {
  let firstSpeed: number | null = null;
  for (const weapon of weapons.weapons) {
    if (!weapon || weapon.category === 'beam') continue;
    if (!hasAmmo(weapon)) continue;
    if (firstSpeed === null) {
      firstSpeed = weapon.projectileSpeed;
    } else if (!areSpeedsCompatible(firstSpeed, weapon.projectileSpeed)) {
      return false;
    }
  }
  return true;
}

/** Check if a weapon is suitable for the given distance. */
export function isWeaponInRange(
  weapon: PrimaryWeapon,
  distance: number,
): boolean {
  if (weapon.range < distance) return false;
  const weaponCategory = getWeaponRangeCategory(weapon);
  const distanceCategory = getDistanceCategory(distance);
  if (
    weaponCategory === RangeCategory.VeryLong &&
    distanceCategory === RangeCategory.Short
  ) {
    return false;
  }
  return true;
}

/** Check if weapon has ammo (or infinite ammo). */
export function hasAmmo(weapon: PrimaryWeapon): boolean {
  return weapon.ammo === undefined || weapon.ammo > 0;
}

/** Check if weapons include an Ion weapon. */
export function hasIonWeapon(weapons: PrimaryWeapons): boolean {
  return weapons.weapons.some((w) => w?.ionize === true);
}

/** Find the coolest (lowest heat) weapon that can reach the target. */
export function findCoolestWeapon(
  weapons: PrimaryWeapons,
  distance: number,
): number | null {
  let coolestIndex: number | null = null;
  let lowestHeat = Infinity;
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (!weapon || !isWeaponInRange(weapon, distance) || !hasAmmo(weapon))
      continue;
    const heat = getEffectiveHeat(weapon);
    if (heat < lowestHeat) {
      lowestHeat = heat;
      coolestIndex = i;
    }
  }
  return coolestIndex;
}

/** Find an infinite ammo weapon that can reach the target. */
export function findInfiniteAmmoWeapon(
  weapons: PrimaryWeapons,
  distance: number,
): number | null {
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (
      weapon &&
      weapon.ammo === undefined &&
      isWeaponInRange(weapon, distance)
    ) {
      return i;
    }
  }
  return null;
}

/** Find a finite ammo weapon with autoaim that can fire at the current angle. */
export function findAutoaimWeapon(
  weapons: PrimaryWeapons,
  distance: number,
  firingAngle: number,
  profile: AIProfile,
): number | null {
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (!weapon || weapon.category === 'beam') continue;
    if (!isWeaponInRange(weapon, distance)) continue;
    if (weapon.ammo !== undefined && weapon.ammo <= 0) continue;
    if (weapon.autoaimFov && weapon.autoaimFov > 0) {
      const effectiveThreshold = profile.minFiringAngle + weapon.autoaimFov;
      if (firingAngle <= effectiveThreshold) return i;
    }
  }
  return null;
}
