/**
 * Slot Utilities - Shared constants and helpers for weapon slot rendering.
 */

import { getMaxAmmoCapacity } from '../../campaign/store/store-ammo';
import type { EquippedPrimary, EquippedSecondary } from '../../campaign/types';
import { weaponUsesAmmo } from '../../data/prices';

/**
 * Available width inside each slot size (slot width minus 8px padding).
 * Index 0 = bank size 1, index 1 = bank size 2, index 2 = bank size 3.
 * Must match CSS: .schematic-slot width (96/140/184px) minus left+right padding.
 */
export const SLOT_INNER_WIDTHS = [88, 132, 176] as const;

/**
 * Minimum width per ammo segment (4px segment + 1px gap).
 * Used to determine if segmented or continuous bar should be rendered.
 * Must match CSS: .slot-ammo-bar.segmented gap + .slot-ammo-segment min-width.
 */
export const AMMO_SEGMENT_SIZE = 5;

/** Ammo info extracted from a weapon */
export interface AmmoInfo {
  current: number;
  max: number;
}

/** Get ammo info from an equipped weapon */
export function getWeaponAmmoInfo(
  weapon: EquippedPrimary | EquippedSecondary,
  slotType: 'primary' | 'secondary',
): AmmoInfo {
  if (slotType === 'primary') {
    const primary = weapon as EquippedPrimary;
    if (!weaponUsesAmmo(primary.weaponType)) {
      return { current: 0, max: 0 };
    }
    return {
      current: primary.currentAmmo ?? 0,
      max: getMaxAmmoCapacity(primary.weaponType, primary.bankSize),
    };
  }
  const secondary = weapon as EquippedSecondary;
  return {
    current: secondary.count,
    max: secondary.maxCount,
  };
}

/** Check if ammo bar should use segmented display */
export function shouldUseSegmentedBar(max: number, bankSize: number): boolean {
  const availableWidth =
    SLOT_INNER_WIDTHS[bankSize - 1] ?? SLOT_INNER_WIDTHS[0];
  return max <= Math.floor(availableWidth / AMMO_SEGMENT_SIZE);
}
