/**
 * Store trickle - per-mission stock replenishment.
 *
 * Ships and primaries have a probabilistic chance to restock (+1).
 * Missiles and ammo have guaranteed trickle based on capacity/consumption.
 */

import { createDerivedPRNG, random } from '../../core/prng';
import { MISSILES } from '../../data/missiles';
import { PRIMARY_WEAPONS } from '../../data/weapons';
import type { CampaignState } from '../types';
import {
  AMMO_TRICKLE_REFILLS,
  getAmmoStockCap,
  getAvailableAmmo,
  getAvailablePrimaries,
  getAvailableSecondaries,
  getAvailableShips,
  getMissileStockCap,
  getTrickleProbability,
  MISSILE_TRICKLE_LOADS,
} from './store-catalog';
import {
  PRIMARY_UNLOCK_SECTOR,
  SECONDARY_UNLOCK_SECTOR,
  SHIP_UNLOCK_SECTOR,
} from './store-unlocks';

/**
 * Apply store trickle after a mission.
 * Ships and primaries have a random chance to restock (+1).
 * Missiles and ammo have guaranteed trickle based on capacity/consumption.
 * Uses derived PRNG from campaign seed for determinism (prevents save scumming).
 */
export function applyStoreTrickle(state: CampaignState): CampaignState {
  // Derive PRNG from campaign seed + mission count for deterministic results
  const rng = createDerivedPRNG(
    state.seed,
    'store-trickle',
    state.missionCount,
  );
  const sector = state.currentSector;

  const newStock = {
    ships: { ...state.storeStock.ships },
    primaries: { ...state.storeStock.primaries },
    secondaries: { ...state.storeStock.secondaries },
    ammo: { ...state.storeStock.ammo },
  };

  // Ships: probabilistic trickle based on unlock tier
  for (const { shipClass } of getAvailableShips()) {
    const unlockSector = SHIP_UNLOCK_SECTOR[shipClass] ?? 1;
    if (unlockSector <= sector) {
      const prob = getTrickleProbability(unlockSector);
      if (random(rng) < prob) {
        newStock.ships[shipClass] = (newStock.ships[shipClass] ?? 0) + 1;
      }
    }
  }

  // Primaries: probabilistic trickle based on unlock tier
  for (const { weaponType } of getAvailablePrimaries()) {
    const unlockSector = PRIMARY_UNLOCK_SECTOR[weaponType] ?? 1;
    if (unlockSector <= sector) {
      const prob = getTrickleProbability(unlockSector);
      if (random(rng) < prob) {
        newStock.primaries[weaponType] =
          (newStock.primaries[weaponType] ?? 0) + 1;
      }
    }
  }

  // Missiles: guaranteed trickle based on capacity (capped)
  for (const { weaponType } of getAvailableSecondaries()) {
    const unlockSector = SECONDARY_UNLOCK_SECTOR[weaponType] ?? 1;
    if (unlockSector <= sector) {
      const capacity = MISSILES[weaponType]?.capacity ?? 10;
      const trickle = Math.floor(MISSILE_TRICKLE_LOADS * capacity);
      const sectorsAvailable = sector - unlockSector;
      const cap = getMissileStockCap(capacity, sectorsAvailable);
      const current = newStock.secondaries[weaponType] ?? 0;
      newStock.secondaries[weaponType] = Math.min(current + trickle, cap);
    }
  }

  // Ammo: guaranteed trickle based on weapon's base ammo (capped)
  for (const { weaponType } of getAvailableAmmo()) {
    const unlockSector = PRIMARY_UNLOCK_SECTOR[weaponType] ?? 1;
    if (unlockSector <= sector) {
      const baseAmmo = PRIMARY_WEAPONS[weaponType]?.ammo ?? 100;
      const trickle = Math.round(AMMO_TRICKLE_REFILLS * baseAmmo);
      const sectorsAvailable = sector - unlockSector;
      const cap = getAmmoStockCap(baseAmmo, sectorsAvailable);
      const current = newStock.ammo[weaponType] ?? 0;
      newStock.ammo[weaponType] = Math.min(current + trickle, cap);
    }
  }

  return {
    ...state,
    storeStock: newStock,
  };
}
