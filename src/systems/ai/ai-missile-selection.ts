/**
 * AI Missile Selection - Selects which missile to fire.
 *
 * Uses the SAME lock mechanics as the player:
 * - Lock progress is shared across all secondary weapons
 * - Lock is based on current target (not weapon selection)
 * - Lock-requiring missiles can only fire when lockProgress >= 1
 * - Dumbfire missiles can fire immediately
 *
 * The AI checks weapons in order (like player cycling) but selects
 * the first one that CAN fire, preferring:
 * 1. Dumbfire missiles when not locked (immediate option)
 * 2. Lock-requiring missiles when locked
 */

import type {
  SecondaryWeapon,
  SecondaryWeapons,
} from '../../components/weapons';

/** Result of missile selection */
export interface MissileSelection {
  shouldFire: boolean;
  index: number;
}

/**
 * Calculate minimum safe firing distance for a missile to avoid self-damage.
 * Returns 0 if no minimum distance restriction.
 *
 * For AoE missiles (Nukes): safe distance = aoeRadius
 * (the blast damages everything within the radius, including the shooter
 * if they're too close when the missile detonates on target)
 */
export function getMinSafeDistance(missile: SecondaryWeapon): number {
  if (missile.aoeRadius && missile.aoeRadius > 0) {
    return missile.aoeRadius;
  }
  return 0;
}

/**
 * Check if a missile can fire (same logic as player).
 */
function canMissileFire(
  missile: SecondaryWeapon,
  distance: number,
  isLocked: boolean,
): boolean {
  // Must have ammo
  if (missile.count <= 0) return false;

  // Must be in range
  if (missile.range < distance) return false;

  // Lock check - SAME as player logic
  if (missile.requiresLock && !isLocked) return false;

  // Safety: don't fire AoE missiles when too close (self-damage risk)
  const minSafe = getMinSafeDistance(missile);
  if (minSafe > 0 && distance < minSafe) return false;

  return true;
}

/**
 * Select missile for AI using same logic as player.
 *
 * Iterates through weapons in order (like player cycling) and returns
 * the first missile that can fire. This ensures AI and player use
 * identical firing logic.
 *
 * @param weapons - AI's secondary weapons
 * @param distance - Distance to target
 * @param isLocked - Whether lock-on is complete (weapons.lockProgress >= 1)
 * @returns Missile selection result
 */
export function selectOptimalMissile(
  weapons: SecondaryWeapons,
  distance: number,
  isLocked: boolean,
): MissileSelection {
  // When locked, prefer homing missiles (they track and are more effective)
  if (isLocked) {
    for (let i = 0; i < weapons.weapons.length; i++) {
      const weapon = weapons.weapons[i];
      if (!weapon || weapon.isDecoy) continue;
      if (weapon.requiresLock && canMissileFire(weapon, distance, isLocked)) {
        return { shouldFire: true, index: i };
      }
    }
  }

  // Fallback: dumbfire missiles (no lock needed, immediate option)
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i];
    if (!weapon || weapon.isDecoy) continue;
    if (!weapon.requiresLock && canMissileFire(weapon, distance, isLocked)) {
      return { shouldFire: true, index: i };
    }
  }

  return { shouldFire: false, index: 0 };
}
