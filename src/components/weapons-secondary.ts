/**
 * Secondary Weapon Utilities
 *
 * Functions for cycling, switching, and finding secondary weapons.
 * Split from weapons.ts for file size management.
 */

import type { SecondaryWeapon, SecondaryWeapons } from './weapons';

/** Cycle to next secondary weapon */
export function cycleNextSecondary(weapons: SecondaryWeapons): void {
  if (weapons.weapons.length > 1) {
    weapons.currentIndex = (weapons.currentIndex + 1) % weapons.weapons.length;
    // Reset lock progress when switching weapons
    weapons.lockProgress = 0;
    weapons.lockWeaponIndex = -1;
  }
}

/**
 * Auto-switch to next non-empty secondary weapon (skipping decoys).
 * Used when current weapon becomes empty after firing.
 * Returns true if switched, false if no valid weapon found.
 */
export function switchToNonEmptySecondary(weapons: SecondaryWeapons): boolean {
  if (weapons.weapons.length <= 1) return false;

  const startIndex = weapons.currentIndex;
  let index = (startIndex + 1) % weapons.weapons.length;

  // Search for next non-empty, non-decoy weapon
  while (index !== startIndex) {
    const weapon = weapons.weapons[index];
    if (weapon && weapon.count > 0 && !weapon.isDecoy) {
      weapons.currentIndex = index;
      weapons.lockProgress = 0;
      weapons.lockWeaponIndex = -1;
      return true;
    }
    index = (index + 1) % weapons.weapons.length;
  }

  return false;
}

/** Find decoy weapon in secondary weapons (returns index and weapon) */
export function findDecoyWeapon(
  weapons: SecondaryWeapons,
): { index: number; weapon: SecondaryWeapon } | undefined {
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i] as SecondaryWeapon;
    if (weapon.isDecoy && weapon.count > 0) {
      return { index: i, weapon };
    }
  }
  return undefined;
}
