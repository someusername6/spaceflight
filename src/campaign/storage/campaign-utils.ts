/**
 * Campaign Storage Utilities
 *
 * Shared helpers for campaign storage operations.
 */

import { slotArrayFromJSON } from '../slot-array';
import type {
  CampaignState,
  EquippedPrimary,
  EquippedSecondary,
} from '../types';

/**
 * Migrate pilot data to include ejection and XP fields if missing.
 * Handles saves from before the ejection/XP systems were added.
 */
function migratePilot<
  T extends {
    ejectionCount?: number;
    injuredMissionsLeft?: number;
    xp?: number;
  },
>(pilot: T): T {
  if (
    pilot.ejectionCount === undefined ||
    pilot.injuredMissionsLeft === undefined ||
    pilot.xp === undefined
  ) {
    return {
      ...pilot,
      ejectionCount: pilot.ejectionCount ?? 0,
      injuredMissionsLeft: pilot.injuredMissionsLeft ?? 0,
      xp: pilot.xp ?? 0,
    };
  }
  return pilot;
}

/**
 * Reconstitute SlotArrays from loaded JSON.
 * JSON.parse creates plain arrays - we need to wrap them in proper SlotArrays.
 * Also migrates old saves to add new fields (ejection system).
 */
export function reconstituteCampaignState(state: CampaignState): CampaignState {
  // Migrate top-level pilots array
  const migratedPilots = state.pilots.map(migratePilot);

  // Migrate ships (including embedded pilots)
  const migratedShips = state.ships.map((ship) => ({
    ...ship,
    pilot: ship.pilot ? migratePilot(ship.pilot) : null,
    primaryWeapons: slotArrayFromJSON<EquippedPrimary>(
      ship.primaryWeapons as unknown as (EquippedPrimary | null)[],
    ),
    secondaryWeapons: slotArrayFromJSON<EquippedSecondary>(
      ship.secondaryWeapons as unknown as (EquippedSecondary | null)[],
    ),
  }));

  return {
    ...state,
    pilots: migratedPilots,
    ships: migratedShips,
  };
}
