/**
 * Ship ammo extraction and replay loadout conversion.
 *
 * Utilities for extracting remaining ammo from world entities
 * and converting campaign ship loadouts to replay format.
 */

import { getComponent, queryEntities } from '../core/ecs';
import type { World } from '../core/types';
import type {
  ReplayPrimaryWeapon,
  ReplaySecondaryWeapon,
  ReplayShipLoadout,
} from '../replay/types';
import { getOccupiedWeapons } from './slot-array';
import type { EquippedPrimary, EquippedSecondary, OwnedShip } from './types';

/** Result of extracting ammo from a ship entity */
export interface ExtractedAmmo {
  campaignShipId: string;
  primaryAmmo: Map<number, number>; // bankIndex -> remaining ammo
  secondaryAmmo: Map<number, number>; // bankIndex -> remaining count
}

/** Extract remaining ammo from all player faction ships */
export function extractAmmoFromWorld(world: World): ExtractedAmmo[] {
  const results: ExtractedAmmo[] = [];

  // Query all entities with shipIdentity
  for (const entity of queryEntities(world, ['shipIdentity'])) {
    const identity = getComponent(world, entity, 'shipIdentity');
    if (!identity?.campaignShipId) continue;

    const extracted: ExtractedAmmo = {
      campaignShipId: identity.campaignShipId,
      primaryAmmo: new Map(),
      secondaryAmmo: new Map(),
    };

    // Extract primary ammo
    const primaries = getComponent(world, entity, 'primaryWeapons');
    if (primaries) {
      for (let i = 0; i < primaries.weapons.length; i++) {
        const weapon = primaries.weapons[i];
        if (weapon?.ammo !== undefined) {
          extracted.primaryAmmo.set(i, weapon.ammo);
        }
      }
    }

    // Extract secondary ammo
    const secondaries = getComponent(world, entity, 'secondaryWeapons');
    if (secondaries) {
      for (let i = 0; i < secondaries.weapons.length; i++) {
        const weapon = secondaries.weapons[i];
        if (weapon) {
          extracted.secondaryAmmo.set(i, weapon.count);
        }
      }
    }

    results.push(extracted);
  }

  return results;
}

/**
 * Convert campaign ship loadout to replay format.
 * Used when recording replays to capture exact weapon configurations.
 */
export function shipToReplayLoadout(ship: OwnedShip): ReplayShipLoadout {
  const primaries = getOccupiedWeapons(ship.primaryWeapons);
  const secondaries = getOccupiedWeapons(ship.secondaryWeapons);

  return {
    shipClass: ship.shipClass,
    primaryWeapons: primaries.map((p: EquippedPrimary): ReplayPrimaryWeapon => {
      const weapon: ReplayPrimaryWeapon = {
        weaponId: p.weaponType,
        bankSize: p.bankSize,
      };
      // Only include ammo for ballistic weapons (has finite ammo)
      if (p.currentAmmo !== undefined) {
        weapon.ammo = p.currentAmmo;
        weapon.maxAmmo = p.currentAmmo; // At mission start, current = max
      }
      return weapon;
    }),
    secondaryWeapons: secondaries.map(
      (s: EquippedSecondary): ReplaySecondaryWeapon => ({
        weaponId: s.weaponType,
        bankSize: s.bankSize,
        ammo: s.count,
        maxAmmo: s.maxCount,
      }),
    ),
  };
}
