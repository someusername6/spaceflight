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
 * Reconstitute SlotArrays from loaded JSON.
 * JSON.parse creates plain arrays - we need to wrap them in proper SlotArrays.
 */
export function reconstituteCampaignState(state: CampaignState): CampaignState {
  return {
    ...state,
    ships: state.ships.map((ship) => ({
      ...ship,
      primaryWeapons: slotArrayFromJSON<EquippedPrimary>(
        ship.primaryWeapons as unknown as (EquippedPrimary | null)[],
      ),
      secondaryWeapons: slotArrayFromJSON<EquippedSecondary>(
        ship.secondaryWeapons as unknown as (EquippedSecondary | null)[],
      ),
    })),
  };
}
