/**
 * Store Unlock Tiers - defines which items are available at each sector.
 *
 * Items unlock progressively as players advance through sectors.
 * Once unlocked, items remain available in all future sectors.
 *
 * Sector 1 (Frontier): Basic starter gear
 * Sector 2 (Contested Zone): Mid-tier upgrades
 * Sector 3 (Warzone): Advanced equipment
 * Sector 4 (Core Systems): Elite gear
 * Sector 5 (Endless): Everything available
 */

/** Sector at which each ship class unlocks */
export const SHIP_UNLOCK_SECTOR: Record<string, number> = {
  // Sector 1: Basic ships
  patrol: 1,
  scout: 1,
  fighter: 1,

  // Sector 2: Mid-tier ships
  interceptor: 2,
  raider: 2,

  // Sector 3: Advanced ships
  bomber: 3,
  sentinel: 3,

  // Sector 4: Elite ships
  striker: 4,
  defender: 4,
};

/** Sector at which each primary weapon unlocks */
export const PRIMARY_UNLOCK_SECTOR: Record<string, number> = {
  // Sector 1: Basic energy weapons
  pulse: 1,
  ion: 1,
  plasma: 1,

  // Sector 2: Mid-tier weapons
  autocannon: 2,
  blueLaser: 2,
  greenLaser: 2,
  flak: 2,

  // Sector 3: Advanced weapons
  redLaser: 3,
  lightning: 3,
  torch: 3,

  // Sector 4: Elite weapons
  railgun: 4,

  // Sector 5: Ultimate weapons
  nuclearLance: 5,
};

/** Sector at which each secondary weapon unlocks */
export const SECONDARY_UNLOCK_SECTOR: Record<string, number> = {
  // Sector 1: Basic missiles and countermeasures
  rocket: 1,
  seeker: 1,
  swarm: 1,
  decoy: 1,

  // Sector 2: Mid-tier missiles
  dart: 2,
  cluster: 2,

  // Sector 3: Advanced missiles
  torpedo: 3,

  // Sector 4: Elite ordnance
  nuke: 4,
};

/**
 * Check if a ship class is unlocked at the given sector.
 */
export function isShipUnlocked(shipClass: string, sector: number): boolean {
  const unlockSector = SHIP_UNLOCK_SECTOR[shipClass];
  // If not defined, assume always available (safety fallback)
  if (unlockSector === undefined) return true;
  return sector >= unlockSector;
}

/**
 * Check if a primary weapon is unlocked at the given sector.
 */
export function isPrimaryUnlocked(weaponType: string, sector: number): boolean {
  const unlockSector = PRIMARY_UNLOCK_SECTOR[weaponType];
  if (unlockSector === undefined) return true;
  return sector >= unlockSector;
}

/**
 * Check if a secondary weapon is unlocked at the given sector.
 */
export function isSecondaryUnlocked(
  weaponType: string,
  sector: number,
): boolean {
  const unlockSector = SECONDARY_UNLOCK_SECTOR[weaponType];
  if (unlockSector === undefined) return true;
  return sector >= unlockSector;
}

/**
 * Check if ammo for a weapon is unlocked at the given sector.
 * Ammo unlocks when the weapon unlocks.
 */
export function isAmmoUnlocked(weaponType: string, sector: number): boolean {
  return isPrimaryUnlocked(weaponType, sector);
}

/**
 * Get the unlock sector for display purposes.
 * Returns 0 if item is not in the unlock table.
 */
export function getUnlockSector(
  category: 'ships' | 'primaries' | 'secondaries' | 'ammo',
  id: string,
): number {
  switch (category) {
    case 'ships':
      return SHIP_UNLOCK_SECTOR[id] ?? 0;
    case 'primaries':
      return PRIMARY_UNLOCK_SECTOR[id] ?? 0;
    case 'secondaries':
      return SECONDARY_UNLOCK_SECTOR[id] ?? 0;
    case 'ammo':
      return PRIMARY_UNLOCK_SECTOR[id] ?? 0;
  }
}
