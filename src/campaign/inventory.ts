/**
 * Inventory types - store stock and stored items.
 */

/** Store inventory - stock of items available for purchase */
export interface StoreStock {
  ships: Record<string, number>; // shipClass -> count
  primaries: Record<string, number>; // weaponType -> count
  secondaries: Record<string, number>; // weaponType -> count (missiles)
  ammo: Record<string, number>; // weaponType -> count (rounds)
}

/** A weapon in storage (not equipped) */
export interface StoredWeapon {
  weaponType: string;
  category: 'primary' | 'secondary';
  count: number; // for secondaries, missiles count; for primaries, always 1
}

/** Ammo in storage (for ballistic primaries) */
export interface StoredAmmo {
  weaponType: string; // 'autocannon', 'railgun', 'flak', 'nuclearLance'
  count: number;
}
