/**
 * Campaign state - mission ammo usage application.
 *
 * Persists remaining ammo from missions back to campaign state.
 */

import { mapSlots } from './slot-array';
import type { CampaignState } from './types';

/** Apply extracted ammo from mission back to campaign state */
export function applyAmmoUsage(
  state: CampaignState,
  ammoData: Array<{
    campaignShipId: string;
    primaryAmmo: Map<number, number>;
    secondaryAmmo: Map<number, number>;
  }>,
): CampaignState {
  // Create a map for quick lookup
  const ammoByShipId = new Map(ammoData.map((a) => [a.campaignShipId, a]));

  // Update ships with remaining ammo
  const updatedShips = state.ships.map((ship) => {
    const extracted = ammoByShipId.get(ship.id);
    if (!extracted) return ship;

    // Update primary weapon ammo (mapSlots skips null slots automatically)
    const updatedPrimaries = mapSlots(ship.primaryWeapons, (primary, index) => {
      const remaining = extracted.primaryAmmo.get(index);
      return remaining !== undefined
        ? { ...primary, currentAmmo: remaining }
        : primary;
    });

    // Update secondary weapon ammo (mapSlots skips null slots automatically)
    const updatedSecondaries = mapSlots(
      ship.secondaryWeapons,
      (secondary, index) => {
        const remaining = extracted.secondaryAmmo.get(index);
        return remaining !== undefined
          ? { ...secondary, count: remaining }
          : secondary;
      },
    );

    return {
      ...ship,
      primaryWeapons: updatedPrimaries,
      secondaryWeapons: updatedSecondaries,
    };
  });

  return {
    ...state,
    ships: updatedShips,
  };
}
