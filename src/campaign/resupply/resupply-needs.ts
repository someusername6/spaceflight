/**
 * Resupply Needs - Status checking and needs calculation for ships.
 */

import { getMissileDisplayName } from '../../data/missiles';
import { getWeaponDisplayName } from '../../data/weapons';
import { countEmpty, forEachSlot, someSlot } from '../slot-array';
import { getMaxAmmoCapacity } from '../store/store-ammo';
import type { EquippedPrimary, OwnedShip } from '../types';

/** Get max ammo capacity for a primary weapon (convenience wrapper) */
export function getMaxPrimaryAmmo(primary: EquippedPrimary): number {
  return getMaxAmmoCapacity(primary.weaponType, primary.bankSize);
}

/** Check if a ship needs attention (empty slots or needs ammo/missiles) */
export function needsAttention(ship: OwnedShip): boolean {
  return needsPrimaryAttention(ship) || needsSecondaryAttention(ship);
}

/** Check if primary weapons need attention (empty slots or low ammo) */
export function needsPrimaryAttention(ship: OwnedShip): boolean {
  // Check for empty slots
  if (countEmpty(ship.primaryWeapons) > 0) return true;

  // Check for low ammo
  return someSlot(ship.primaryWeapons, (primary) => {
    if (primary.currentAmmo === undefined) return false;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    return primary.currentAmmo < maxAmmo;
  });
}

/** Check if secondary weapons need attention (empty slots or low missiles) */
export function needsSecondaryAttention(ship: OwnedShip): boolean {
  // Check for empty slots
  if (countEmpty(ship.secondaryWeapons) > 0) return true;

  // Check for low missiles
  return someSlot(
    ship.secondaryWeapons,
    (secondary) => secondary.count < secondary.maxCount,
  );
}

/** Check if a ship needs ammo or missile resupply (not empty slots) */
export function needsAmmoResupply(ship: OwnedShip): boolean {
  // Check primaries for low ammo
  const needsPrimaryAmmo = someSlot(ship.primaryWeapons, (primary) => {
    if (primary.currentAmmo === undefined) return false;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    return primary.currentAmmo < maxAmmo;
  });
  if (needsPrimaryAmmo) return true;

  // Check secondaries for low missiles
  return someSlot(
    ship.secondaryWeapons,
    (secondary) => secondary.count < secondary.maxCount,
  );
}

/** @deprecated Use needsAttention for warnings, needsAmmoResupply for resupply button */
export function needsResupply(ship: OwnedShip): boolean {
  return needsAttention(ship);
}

/** Get specific reasons why a ship needs attention */
export function getAttentionReasons(ship: OwnedShip): string[] {
  const reasons: string[] = [];

  // Check for empty primary slots
  const emptyPrimary = countEmpty(ship.primaryWeapons);
  if (emptyPrimary > 0) {
    reasons.push(
      `${emptyPrimary} empty primary slot${emptyPrimary > 1 ? 's' : ''}`,
    );
  }

  // Check for empty secondary slots
  const emptySecondary = countEmpty(ship.secondaryWeapons);
  if (emptySecondary > 0) {
    reasons.push(
      `${emptySecondary} empty secondary slot${emptySecondary > 1 ? 's' : ''}`,
    );
  }

  // Check for low ammo on each weapon type
  const lowAmmo: string[] = [];
  forEachSlot(ship.primaryWeapons, (primary) => {
    if (primary.currentAmmo === undefined) return;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    if (primary.currentAmmo < maxAmmo) {
      const pct = Math.round((primary.currentAmmo / maxAmmo) * 100);
      lowAmmo.push(`${getWeaponDisplayName(primary.weaponType)} (${pct}%)`);
    }
  });
  if (lowAmmo.length > 0) {
    reasons.push(`Low ammo: ${lowAmmo.join(', ')}`);
  }

  // Check for low missiles on each weapon type
  const lowMissiles: string[] = [];
  forEachSlot(ship.secondaryWeapons, (secondary) => {
    if (secondary.count < secondary.maxCount) {
      lowMissiles.push(
        `${getMissileDisplayName(secondary.weaponType)} (${secondary.count}/${secondary.maxCount})`,
      );
    }
  });
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

  forEachSlot(ship.primaryWeapons, (primary) => {
    if (primary.currentAmmo === undefined) return;
    const maxAmmo = getMaxPrimaryAmmo(primary);
    const needed = Math.max(0, maxAmmo - primary.currentAmmo);
    if (needed > 0) {
      ammo.set(
        primary.weaponType,
        (ammo.get(primary.weaponType) ?? 0) + needed,
      );
      totalNeeded += needed;
    }
  });

  forEachSlot(ship.secondaryWeapons, (secondary) => {
    const needed = Math.max(0, secondary.maxCount - secondary.count);
    if (needed > 0) {
      missiles.set(
        secondary.weaponType,
        (missiles.get(secondary.weaponType) ?? 0) + needed,
      );
      totalNeeded += needed;
    }
  });

  return { ammo, missiles, totalNeeded };
}
