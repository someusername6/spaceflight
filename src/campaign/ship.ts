/**
 * Ship types - owned and stored ships with equipment.
 */

import type { Pilot } from './pilot';
import type { SlotArray } from './slot-array';

/** A weapon equipped in a primary bank */
export interface EquippedPrimary {
  weaponType: string; // e.g., 'plasma', 'autocannon'
  bankSize: number; // 1, 2, or 3
  currentAmmo?: number; // undefined = infinite, number = remaining
}

/** A weapon equipped in a secondary bank */
export interface EquippedSecondary {
  weaponType: string; // e.g., 'seeker', 'torpedo'
  bankSize: number;
  count: number; // remaining missiles/decoys
  maxCount: number; // for resupply reference
}

/**
 * A ship owned by the player's squadron (active, with pilot assigned).
 *
 * Note: SlotArray fields serialize via toJSON() and are reconstituted
 * automatically by the save system's reconstituteSave() function.
 */
export interface OwnedShip {
  id: string;
  shipClass: string; // 'interceptor', 'striker', etc. (from SHIP_CLASSES)
  /** Opaque slot array - use slot-array helpers for access */
  primaryWeapons: SlotArray<EquippedPrimary>;
  /** Opaque slot array - use slot-array helpers for access */
  secondaryWeapons: SlotArray<EquippedSecondary>;
  pilot: Pilot | null; // null = unassigned (ship in reserve)
}

/** A ship in storage (no pilot, no weapons equipped) */
export interface StoredShip {
  id: string;
  shipClass: string; // 'interceptor', 'striker', etc.
}
