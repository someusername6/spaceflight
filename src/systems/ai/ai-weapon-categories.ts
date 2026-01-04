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

/** Transform with position and rotation for angle calculations */
interface TransformLike {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

/**
 * Calculate firing angle between shooter and target.
 * Returns angle in degrees (0 = dead ahead, 180 = behind).
 */
export function calculateFiringAngle(
  shooterTransform: TransformLike,
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
