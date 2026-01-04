/**
 * AI Weapon Categories - Range classification for weapon selection.
 *
 * Provides utilities for categorizing weapons and distances
 * by effective range for tactical decision making.
 */

import type { PrimaryWeapon } from '../../components/weapons';

/** Range categories for weapon selection */
export enum RangeCategory {
  VeryLong = 'veryLong', // 1500+ (railgun, nuclear lance)
  Long = 'long', // 800-1500 (blue/green laser, plasma)
  Medium = 'medium', // 400-800 (ion, flak, pulse)
  Short = 'short', // <400 (red laser, autocannon, lightning)
}

/** Thresholds for range categories */
export const RANGE_THRESHOLDS = {
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
