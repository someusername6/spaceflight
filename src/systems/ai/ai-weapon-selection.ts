/**
 * AI Weapon Selection - Smart weapon choice based on tactical situation.
 * Considers range, heat, ammo, shields, and missile selection.
 * Uses AIProfile for per-entity behavior thresholds.
 */

import type { Heat } from '../../components/heat';
import { getHeatPercent, HEAT_WARNING_THRESHOLD } from '../../components/heat';
import type { Shields } from '../../components/shields';
import type { PrimaryWeapon, PrimaryWeapons } from '../../components/weapons';
import { getEffectiveHeat } from '../../components/weapons';
import type { AIProfile } from '../../data/ai-profiles';
import {
  getDistanceCategory,
  getWeaponRangeCategory,
  RangeCategory,
} from './ai-weapon-categories';
import {
  areProjectileSpeedsCompatible,
  findAutoaimWeapon,
  findCoolestWeapon,
  findInfiniteAmmoWeapon,
  hasAmmo,
  hasIonWeapon,
  isWeaponInRange,
} from './ai-weapon-helpers';

/** Result of weapon selection */
export interface WeaponSelection {
  mode: 'linked' | 'single' | 'none';
  index?: number; // Weapon index for single mode
}

/**
 * Calculate minimum safe firing distance for a weapon to avoid self-damage.
 * Returns 0 if no minimum distance restriction.
 *
 * For Flak/shrapnel weapons: safe distance = shrapnelRange
 * (shrapnel travels outward from detonation point; if target is closer than
 * shrapnel range, some pieces could travel back and hit the shooter)
 */
export function getMinSafeDistance(weapon: PrimaryWeapon): number {
  if (weapon.shrapnelCount && weapon.shrapnelCount > 0) {
    if (weapon.shrapnelRange === undefined) {
      throw new Error(
        `Weapon "${weapon.name}" has shrapnelCount but missing required shrapnelRange`,
      );
    }
    return weapon.shrapnelRange;
  }
  return 0;
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

  // Safety: don't fire shrapnel weapons when too close (self-damage risk)
  const minSafe = getMinSafeDistance(weapon);
  if (minSafe > 0 && distance < minSafe) return -1000;

  // Range match bonus (prefer weapons that match the distance)
  const weaponCategory = getWeaponRangeCategory(weapon);
  const distanceCategory = getDistanceCategory(distance);
  if (weaponCategory === distanceCategory) {
    score += 50; // Perfect range match
  } else if (
    (weaponCategory === RangeCategory.VeryLong &&
      distanceCategory === RangeCategory.Long) ||
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
    score += Math.max(0, 30 - heatPerShot * 2);
  } else {
    score += Math.max(0, 10 - heatPerShot);
  }

  // Ammo conservation: prefer infinite ammo weapons
  if (weapon.ammo === undefined) score += 15;

  // Shield targeting: Ion gets bonus against shields
  if (targetHasShields && weapon.ionize === true) score += 40;

  // Beam weapons get hitscan bonus at close-medium range
  if (weapon.category === 'beam' && distanceCategory === RangeCategory.Short) {
    score += 30;
  } else if (
    weapon.category === 'beam' &&
    distanceCategory === RangeCategory.Medium
  ) {
    score += 15;
  }

  // High DPS weapons preferred at close range
  if (distanceCategory === RangeCategory.Short) {
    score += weapon.damage * 0.5;
  }

  return score;
}

/**
 * Select optimal primary weapon for AI based on tactical situation.
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
    const coolWeapon = findCoolestWeapon(weapons, distance);
    if (
      coolWeapon !== null &&
      getEffectiveHeat(weapons.weapons[coolWeapon] as PrimaryWeapon) < 3
    ) {
      return { mode: 'single', index: coolWeapon };
    }
    return { mode: 'none' };
  }

  // Don't waste finite ammo at poor firing angles
  if (firingAngle > profile.minFiringAngle) {
    const infiniteWeapon = findInfiniteAmmoWeapon(weapons, distance);
    if (infiniteWeapon !== null) {
      return { mode: 'single', index: infiniteWeapon };
    }
    const autoaimWeapon = findAutoaimWeapon(
      weapons,
      distance,
      firingAngle,
      profile,
    );
    if (autoaimWeapon !== null) {
      return { mode: 'single', index: autoaimWeapon };
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

  if (validWeaponCount === 0) return { mode: 'none' };

  // LINKED MODE: Fire all weapons when conditions are favorable
  if (
    allWeaponsValid &&
    validWeaponCount > 1 &&
    heatPercent < profile.linkedFireHeatThreshold &&
    !(targetHasShields && hasIonWeapon(weapons)) &&
    areProjectileSpeedsCompatible(weapons)
  ) {
    return { mode: 'linked' };
  }

  // SINGLE MODE: Use best weapon
  if (bestIndex >= 0) {
    return { mode: 'single', index: bestIndex };
  }

  return { mode: 'none' };
}
