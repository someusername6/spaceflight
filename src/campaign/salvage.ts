/**
 * Salvage System - calculates and applies salvage from destroyed ships.
 *
 * Salvage is computed at mission end from ALL destroyed ships (enemies and allies).
 * Each ship yields scrap, a chance at weapons, and a percentage of remaining ammo.
 */

import type { SalvageableShip } from '../components/combat-stats';
import {
  getAmmoPrice,
  getHullPrice,
  getPrimaryPrice,
  getSecondaryPrice,
} from '../data/prices';
import { mergeAmmoIntoStorage, mergeSecondaryIntoStorage } from './ship-utils';
import type { CampaignState, StoredAmmo, StoredWeapon } from './types';

/** Result of salvage calculation */
export interface SalvageResult {
  /** Scrap per ship class */
  scrap: Record<string, number>;
  /** Primary weapons recovered */
  weapons: StoredWeapon[];
  /** Ammo recovered */
  ammo: StoredAmmo[];
  /** Total estimated value of salvage (for display) */
  totalValue: number;
}

/** Create empty salvage result */
function createEmptySalvage(): SalvageResult {
  return {
    scrap: {},
    weapons: [],
    ammo: [],
    totalValue: 0,
  };
}

/**
 * Calculate salvage from destroyed ships.
 *
 * Each destroyed ship yields:
 * - Scrap: 0-10 pieces (5 average) based on random multiplier
 * - Weapons: Each primary has (multiplier) chance to drop
 * - Ammo/missiles: (multiplier) percentage of remaining
 *
 * @param destroyedShips - All ships destroyed in the mission
 * @param rng - Random function (0-1), must be seeded for determinism
 */
export function calculateSalvage(
  destroyedShips: SalvageableShip[],
  rng: () => number,
): SalvageResult {
  const result = createEmptySalvage();

  for (const ship of destroyedShips) {
    // Roll salvage multiplier: 0.0 to 0.1 (0-10% of ship value)
    const multiplier = rng() * 0.1;

    // Calculate scrap (0-10 pieces per ship)
    const scrapCount = Math.floor(100 * multiplier);
    if (scrapCount > 0) {
      result.scrap[ship.shipClass] =
        (result.scrap[ship.shipClass] ?? 0) + scrapCount;
      // Value: scrap * (hull price / 100)
      const hullPrice = getHullPrice(ship.shipClass, 'buy');
      result.totalValue += scrapCount * (hullPrice / 100);
    }

    // Primary weapons: each has (multiplier) chance to drop
    for (const weapon of ship.primaryWeapons) {
      if (rng() < multiplier) {
        // Weapon drops!
        result.weapons.push({
          weaponType: weapon.weaponType,
          category: 'primary',
          count: 1,
        });
        result.totalValue += getPrimaryPrice(weapon.weaponType, 'buy');
      }

      // Ammo recovery: (multiplier) of remaining ammo
      if (weapon.ammoRemaining !== undefined && weapon.ammoRemaining > 0) {
        const ammoRecovered = Math.floor(weapon.ammoRemaining * multiplier);
        if (ammoRecovered > 0) {
          // Merge into existing ammo entry or create new
          const existing = result.ammo.find(
            (a) => a.weaponType === weapon.weaponType,
          );
          if (existing) {
            existing.count += ammoRecovered;
          } else {
            result.ammo.push({
              weaponType: weapon.weaponType,
              count: ammoRecovered,
            });
          }
          result.totalValue +=
            ammoRecovered * getAmmoPrice(weapon.weaponType, 'buy');
        }
      }
    }

    // Secondary weapons (missiles/decoys): (multiplier) of remaining count
    for (const secondary of ship.secondaryWeapons) {
      if (secondary.count > 0) {
        const recovered = Math.floor(secondary.count * multiplier);
        if (recovered > 0) {
          // Merge into existing weapon entry or create new
          const existing = result.weapons.find(
            (w) =>
              w.category === 'secondary' &&
              w.weaponType === secondary.weaponType,
          );
          if (existing) {
            existing.count += recovered;
          } else {
            result.weapons.push({
              weaponType: secondary.weaponType,
              category: 'secondary',
              count: recovered,
            });
          }
          result.totalValue +=
            recovered * getSecondaryPrice(secondary.weaponType, 'buy');
        }
      }
    }
  }

  return result;
}

/**
 * Apply salvage to campaign state.
 * Adds scrap, weapons, and ammo to player's storage.
 */
export function applySalvage(
  state: CampaignState,
  salvage: SalvageResult,
): CampaignState {
  // Merge scrap
  const newStoredScrap = { ...state.storedScrap };
  for (const [shipClass, count] of Object.entries(salvage.scrap)) {
    newStoredScrap[shipClass] = (newStoredScrap[shipClass] ?? 0) + count;
  }

  // Merge weapons (primaries as discrete items, secondaries stack)
  let newStoredWeapons = [...state.storedWeapons];
  for (const weapon of salvage.weapons) {
    if (weapon.category === 'primary') {
      // Primary weapons are discrete items
      newStoredWeapons.push({ ...weapon });
    } else {
      // Secondary weapons stack
      newStoredWeapons = mergeSecondaryIntoStorage(
        newStoredWeapons,
        weapon.weaponType,
        weapon.count,
      );
    }
  }

  // Merge ammo
  let newStoredAmmo = state.storedAmmo;
  for (const ammo of salvage.ammo) {
    newStoredAmmo = mergeAmmoIntoStorage(
      newStoredAmmo,
      ammo.weaponType,
      ammo.count,
    );
  }

  return {
    ...state,
    storedScrap: newStoredScrap,
    storedWeapons: newStoredWeapons,
    storedAmmo: newStoredAmmo,
  };
}
