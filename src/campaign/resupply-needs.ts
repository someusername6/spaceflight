/**
 * Resupply Needs - Status checking and needs calculation for ships.
 */

import { getMaxAmmoCapacity } from './store-ammo';
import type { EquippedPrimary, OwnedShip } from './types';

/** Get max ammo capacity for a primary weapon (convenience wrapper) */
export function getMaxPrimaryAmmo(primary: EquippedPrimary): number {
  return getMaxAmmoCapacity(primary.weaponType, primary.bankSize);
}

/** Check if a ship needs attention (empty slots or needs ammo/missiles) */
export function needsAttention(ship: OwnedShip): boolean {
  // Check for empty weapon slots
  for (const primary of ship.primaryWeapons) {
    if (primary === null) return true;
  }
  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) return true;
  }

  // Also check for low ammo/missiles
  return needsAmmoResupply(ship);
}

/** Check if a ship needs ammo or missile resupply (not empty slots) */
export function needsAmmoResupply(ship: OwnedShip): boolean {
  for (const primary of ship.primaryWeapons) {
    if (primary === null || primary.currentAmmo === undefined) continue;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    if (primary.currentAmmo < maxAmmo) return true;
  }

  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) continue;
    if (secondary.count < secondary.maxCount) return true;
  }

  return false;
}

/** @deprecated Use needsAttention for warnings, needsAmmoResupply for resupply button */
export function needsResupply(ship: OwnedShip): boolean {
  return needsAttention(ship);
}

/** Get specific reasons why a ship needs attention */
export function getAttentionReasons(ship: OwnedShip): string[] {
  const reasons: string[] = [];

  // Check for empty primary slots
  const emptyPrimary = ship.primaryWeapons.filter((p) => p === null).length;
  if (emptyPrimary > 0) {
    reasons.push(
      `${emptyPrimary} empty primary slot${emptyPrimary > 1 ? 's' : ''}`,
    );
  }

  // Check for empty secondary slots
  const emptySecondary = ship.secondaryWeapons.filter((s) => s === null).length;
  if (emptySecondary > 0) {
    reasons.push(
      `${emptySecondary} empty secondary slot${emptySecondary > 1 ? 's' : ''}`,
    );
  }

  // Check for low ammo on each weapon type
  const lowAmmo: string[] = [];
  for (const primary of ship.primaryWeapons) {
    if (primary === null || primary.currentAmmo === undefined) continue;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    if (primary.currentAmmo < maxAmmo) {
      const pct = Math.round((primary.currentAmmo / maxAmmo) * 100);
      lowAmmo.push(`${primary.weaponType} (${pct}%)`);
    }
  }
  if (lowAmmo.length > 0) {
    reasons.push(`Low ammo: ${lowAmmo.join(', ')}`);
  }

  // Check for low missiles on each weapon type
  const lowMissiles: string[] = [];
  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) continue;
    if (secondary.count < secondary.maxCount) {
      lowMissiles.push(
        `${secondary.weaponType} (${secondary.count}/${secondary.maxCount})`,
      );
    }
  }
  if (lowMissiles.length > 0) {
    reasons.push(`Low missiles: ${lowMissiles.join(', ')}`);
  }

  return reasons;
}

/** Get detailed resupply needs for a single ship */
export interface ShipResupplyNeeds {
  ammo: Map<string, number>;
  missiles: Map<string, number>;
  totalNeeded: number;
}

export function getShipResupplyNeeds(ship: OwnedShip): ShipResupplyNeeds {
  const ammo = new Map<string, number>();
  const missiles = new Map<string, number>();
  let totalNeeded = 0;

  for (const primary of ship.primaryWeapons) {
    if (primary === null || primary.currentAmmo === undefined) continue;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    const needed = Math.max(0, maxAmmo - primary.currentAmmo);
    if (needed > 0) {
      ammo.set(
        primary.weaponType,
        (ammo.get(primary.weaponType) ?? 0) + needed,
      );
      totalNeeded += needed;
    }
  }

  for (const secondary of ship.secondaryWeapons) {
    if (secondary === null) continue;
    const needed = Math.max(0, secondary.maxCount - secondary.count);
    if (needed > 0) {
      missiles.set(
        secondary.weaponType,
        (missiles.get(secondary.weaponType) ?? 0) + needed,
      );
      totalNeeded += needed;
    }
  }

  return { ammo, missiles, totalNeeded };
}
