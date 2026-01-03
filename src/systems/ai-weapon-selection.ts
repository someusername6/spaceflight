/**
 * AI Weapon Selection - Smart weapon choice based on tactical situation.
 *
 * AI selects weapons based on:
 * - Range to target (match weapon range to distance)
 * - Heat level (prefer cooler weapons when hot)
 * - Ammo conservation (don't waste finite ammo at poor angles)
 * - Target shields (prefer Ion against shielded targets)
 * - Missile selection (pick optimal missile for situation)
 *
 * Uses AIProfile for per-entity behavior thresholds.
 */

import type { Heat } from '../components/heat';
import { getHeatPercent, HEAT_WARNING_THRESHOLD } from '../components/heat';
import type { Shields } from '../components/shields';
import type { Transform } from '../components/transform';
import type { PrimaryWeapon, PrimaryWeapons } from '../components/weapons';
import { getEffectiveHeat } from '../components/weapons';
import type { AIProfile } from '../data/ai-profiles';

/** Result of weapon selection */
export interface WeaponSelection {
  mode: 'linked' | 'single' | 'none';
  index?: number; // Weapon index for single mode
}

/** Range categories for weapon selection */
export enum RangeCategory {
  VeryLong = 'veryLong', // 1500+ (railgun, nuclear lance)
  Long = 'long', // 800-1500 (blue/green laser, plasma)
  Medium = 'medium', // 400-800 (ion, flak, pulse)
  Short = 'short', // <400 (red laser, autocannon, lightning)
}

/** Thresholds for range categories */
const RANGE_THRESHOLDS = {
  veryLong: 1500,
  long: 800,
  medium: 400,
};

/**
 * Categorize distance into range category.
 */
export function getDistanceCategory(distance: number): RangeCategory {
  if (distance >= RANGE_THRESHOLDS.veryLong) return RangeCategory.VeryLong;
  if (distance >= RANGE_THRESHOLDS.long) return RangeCategory.Long;
  if (distance >= RANGE_THRESHOLDS.medium) return RangeCategory.Medium;
  return RangeCategory.Short;
}

/**
 * Get the effective range category for a weapon.
 */
export function getWeaponRangeCategory(weapon: PrimaryWeapon): RangeCategory {
  if (weapon.range >= RANGE_THRESHOLDS.veryLong) return RangeCategory.VeryLong;
  if (weapon.range >= RANGE_THRESHOLDS.long) return RangeCategory.Long;
  if (weapon.range >= RANGE_THRESHOLDS.medium) return RangeCategory.Medium;
  return RangeCategory.Short;
}

/**
 * Check if a weapon is suitable for the given distance.
 */
function isWeaponInRange(weapon: PrimaryWeapon, distance: number): boolean {
  // Weapon must reach the target
  if (weapon.range < distance) return false;

  // For very long range weapons, don't use at close range (waste)
  const weaponCategory = getWeaponRangeCategory(weapon);
  const distanceCategory = getDistanceCategory(distance);

  // Very long range weapons (railgun) shouldn't be used at short range
  if (
    weaponCategory === RangeCategory.VeryLong &&
    distanceCategory === RangeCategory.Short
  ) {
    return false;
  }

  return true;
}

/**
 * Check if weapon has ammo (or infinite ammo).
 */
function hasAmmo(weapon: PrimaryWeapon): boolean {
  return weapon.ammo === undefined || weapon.ammo > 0;
}

/**
 * Calculate a weapon's suitability score for the current situation.
 * Higher score = better choice.
 */
function scoreWeapon(
  weapon: PrimaryWeapon,
  distance: number,
  heatPercent: number,
  targetHasShields: boolean,
  profile: AIProfile,
): number {
  let score = 0;

  // Base: weapon must be in range
  if (!isWeaponInRange(weapon, distance)) return -1000;
  if (!hasAmmo(weapon)) return -1000;

  // Range match bonus (prefer weapons that match the distance)
  const weaponCategory = getWeaponRangeCategory(weapon);
  const distanceCategory = getDistanceCategory(distance);
  if (weaponCategory === distanceCategory) {
    score += 50; // Perfect range match
  } else if (
    (weaponCategory === RangeCategory.Long &&
      distanceCategory === RangeCategory.Medium) ||
    (weaponCategory === RangeCategory.Medium &&
      distanceCategory === RangeCategory.Short)
  ) {
    score += 25; // Adjacent range match
  }

  // Heat efficiency bonus (prefer low-heat weapons when hot)
  const heatPerShot = getEffectiveHeat(weapon);
  if (heatPercent > profile.heatSwitchThreshold) {
    // When hot, strongly prefer low-heat weapons
    score += Math.max(0, 30 - heatPerShot * 2);
  } else {
    // Normal: slight preference for efficiency
    score += Math.max(0, 10 - heatPerShot);
  }

  // Ammo conservation: prefer infinite ammo weapons
  if (weapon.ammo === undefined) {
    score += 15;
  }

  // Shield targeting: Ion gets bonus against shields
  if (targetHasShields && weapon.name === 'Ion') {
    score += 40;
  }

  // Beam weapons get bonus at short range (hitscan advantage)
  if (weapon.category === 'beam' && distanceCategory === RangeCategory.Short) {
    score += 20;
  }

  // High DPS weapons preferred at close range
  if (distanceCategory === RangeCategory.Short) {
    score += weapon.damage * 0.5;
  }

  return score;
}

/**
 * Select optimal primary weapon for AI based on tactical situation.
 *
 * @param weapons - AI's primary weapons
 * @param distance - Distance to target
 * @param heat - AI's heat component
 * @param targetShields - Target's shields (or undefined)
 * @param firingAngle - Angle to target in degrees (0 = dead ahead)
 * @param profile - AI behavior profile with thresholds
 * @returns Weapon selection result
 */
export function selectOptimalPrimaryWeapon(
  weapons: PrimaryWeapons,
  distance: number,
  heat: Heat,
  targetShields: Shields | undefined,
  firingAngle: number,
  profile: AIProfile,
): WeaponSelection {
  const heatPercent = getHeatPercent(heat);
  const targetHasShields =
    targetShields !== undefined && targetShields.current > 0;

  // If heat is critical, don't fire at all
  if (heatPercent >= HEAT_WARNING_THRESHOLD) {
    // Only fire if we have a very low-heat option
    const coolWeapon = findCoolestWeapon(weapons, distance);
    if (
      coolWeapon !== null &&
      getEffectiveHeat(weapons.weapons[coolWeapon] as PrimaryWeapon) < 3
    ) {
      return { mode: 'single', index: coolWeapon };
    }
    return { mode: 'none' };
  }

  // Don't waste finite ammo at poor firing angles (use profile threshold)
  if (firingAngle > profile.minFiringAngle) {
    // Only fire infinite ammo weapons
    const infiniteWeapon = findInfiniteAmmoWeapon(weapons, distance);
    if (infiniteWeapon !== null) {
      return { mode: 'single', index: infiniteWeapon };
    }
    return { mode: 'none' };
  }

  // Count valid weapons and find best
  let bestScore = -Infinity;
  let bestIndex = -1;
  let validWeaponCount = 0;
  let allWeaponsValid = true;

  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (!weapon) continue;

    const score = scoreWeapon(
      weapon,
      distance,
      heatPercent,
      targetHasShields,
      profile,
    );
    const isValid = score > -500;

    if (isValid) {
      validWeaponCount++;
    } else {
      allWeaponsValid = false;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // No valid weapons
  if (validWeaponCount === 0) {
    return { mode: 'none' };
  }

  // LINKED MODE: Fire all weapons when conditions are favorable
  // - All weapons can reach target and have ammo
  // - Heat is manageable (use profile's linked fire threshold)
  // - Not targeting shields with Ion available (prefer focused fire)
  if (
    allWeaponsValid &&
    validWeaponCount > 1 &&
    heatPercent < profile.linkedFireHeatThreshold &&
    !(targetHasShields && hasIonWeapon(weapons))
  ) {
    return { mode: 'linked' };
  }

  // SINGLE MODE: Use best weapon when:
  // - Only one valid weapon
  // - Heat is high (conserve heat)
  // - Need focused fire (Ion vs shields)
  // - Some weapons out of range
  if (bestIndex >= 0) {
    return { mode: 'single', index: bestIndex };
  }

  return { mode: 'none' };
}

/**
 * Check if weapons include an Ion weapon.
 */
function hasIonWeapon(weapons: PrimaryWeapons): boolean {
  return weapons.weapons.some((w) => w?.name === 'Ion');
}

/**
 * Find the coolest (lowest heat) weapon that can reach the target.
 */
function findCoolestWeapon(
  weapons: PrimaryWeapons,
  distance: number,
): number | null {
  let coolestIndex: number | null = null;
  let lowestHeat = Infinity;

  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (!weapon || !isWeaponInRange(weapon, distance) || !hasAmmo(weapon)) {
      continue;
    }

    const heat = getEffectiveHeat(weapon);
    if (heat < lowestHeat) {
      lowestHeat = heat;
      coolestIndex = i;
    }
  }

  return coolestIndex;
}

/**
 * Find an infinite ammo weapon that can reach the target.
 */
function findInfiniteAmmoWeapon(
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

/**
 * Calculate firing angle between shooter and target.
 * Returns angle in degrees (0 = dead ahead, 180 = behind).
 */
export function calculateFiringAngle(
  shooterTransform: Transform,
  targetPosition: { x: number; y: number; z: number },
): number {
  // Get forward direction from quaternion (Three.js convention: -Z is forward)
  // Formula: rotate (0, 0, -1) by the quaternion
  const q = shooterTransform.rotation;
  const forward = {
    x: -2 * (q.x * q.z - q.w * q.y),
    y: -2 * (q.y * q.z + q.w * q.x),
    z: -(1 - 2 * (q.x * q.x + q.y * q.y)),
  };

  // Direction to target
  const toTarget = {
    x: targetPosition.x - shooterTransform.position.x,
    y: targetPosition.y - shooterTransform.position.y,
    z: targetPosition.z - shooterTransform.position.z,
  };

  // Normalize
  const toTargetLen = Math.sqrt(
    toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z,
  );
  if (toTargetLen < 0.001) return 0;

  toTarget.x /= toTargetLen;
  toTarget.y /= toTargetLen;
  toTarget.z /= toTargetLen;

  // Dot product gives cosine of angle
  const dot =
    forward.x * toTarget.x + forward.y * toTarget.y + forward.z * toTarget.z;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

  return angle;
}
