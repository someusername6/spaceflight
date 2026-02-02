/**
 * Campaign state - the full persistent state between missions.
 */

import type { CampaignSettings } from './campaign-settings';
import type { StoredAmmo, StoredWeapon, StoreStock } from './inventory';
import type { HireablePilot, Pilot } from './pilot';
import type { OwnedShip, StoredShip } from './ship';

/** Full campaign state */
export interface CampaignState {
  /** Campaign settings chosen at creation (immutable after creation) */
  settings: CampaignSettings;
  /** Master seed for deterministic randomness (set at campaign creation) */
  seed: number;
  /** Next ID for entity generation (persisted for determinism) */
  nextId: number;
  credits: number;
  commanderId: string; // ID of the commander pilot (player)
  ships: OwnedShip[];
  pilots: Pilot[]; // all pilots (assigned and unassigned)
  storedShips: StoredShip[]; // ships in storage (no pilot/weapons)
  storedWeapons: StoredWeapon[]; // weapons in storage
  storedAmmo: StoredAmmo[]; // ammo in storage (for ballistic primaries)
  storedScrap: Record<string, number>; // shipClass -> scrap count
  storeStock: StoreStock; // store inventory (finite stock)
  availableRecruits: HireablePilot[]; // pilots available for hire
  currentSector: number;
  /** Missions completed in current sector (resets on sector advance) */
  sectorMissionsCompleted: number;
  completedContracts: string[];
  /** Contract IDs that have been attempted (win or lose) - for "fresh" indicator */
  attemptedContracts: string[];
  /** Number of contract refreshes used in current sector (resets on sector advance) */
  contractRefreshCount: number;
  missionCount: number;
  /** Version counter for optimistic concurrency control (multiplayer) */
  stateVersion: number;
}
