/**
 * Weapon components - primary and secondary weapon loadouts.
 */

import type { ComponentBase, Entity } from '../core/types';

/** Weapon type categories */
export type WeaponCategory = 'energy' | 'ballistic' | 'beam';

/** Primary weapon definition */
export interface PrimaryWeapon {
  name: string;
  category: WeaponCategory;
  heatPerShot: number;
  projectileSpeed: number;
  fireRate: number; // Seconds between shots
  range: number;
  damage: number;
  ammo?: number; // Undefined = infinite
  maxAmmo?: number;
}

/** Secondary weapon definition */
export interface SecondaryWeapon {
  name: string;
  requiresLock: boolean;
  speed: number;
  turnRate: number; // Degrees per second
  range: number;
  damage: number;
  count: number; // Missiles remaining
  maxCount: number;
  fireRate: number; // Seconds between shots
  lockSpeed: number; // Lock acquisition speed (0-1 per second, 0 = no lock needed)
}

/** Primary weapons component */
export interface PrimaryWeapons extends ComponentBase {
  readonly type: 'primaryWeapons';
  weapons: PrimaryWeapon[];
  currentIndex: number;
  lastFireTime: number; // Timestamp of last fire (for fire rate)
  linked: boolean; // true = fire all weapons together, false = fire selected only
}

/** Secondary weapons component */
export interface SecondaryWeapons extends ComponentBase {
  readonly type: 'secondaryWeapons';
  weapons: SecondaryWeapon[];
  currentIndex: number;
  lastFireTime: number;
  lockTarget: Entity | undefined;
  lockProgress: number; // 0-1, 1 = locked
}

/** Weapon definitions - all stats from WEAPONS.md */
export const WEAPON_DEFS = {
  // Energy weapons (infinite ammo)
  plasma: {
    name: 'Plasma',
    category: 'energy' as WeaponCategory,
    heatPerShot: 8,
    projectileSpeed: 400,
    fireRate: 0.2, // 200ms
    range: 800,
    damage: 25,
  },
  pulse: {
    name: 'Pulse',
    category: 'energy' as WeaponCategory,
    heatPerShot: 5,
    projectileSpeed: 600,
    fireRate: 0.1, // 100ms
    range: 500,
    damage: 12,
  },
  ion: {
    name: 'Ion',
    category: 'energy' as WeaponCategory,
    heatPerShot: 6,
    projectileSpeed: 400,
    fireRate: 0.18, // 180ms
    range: 700,
    damage: 15,
  },

  // Ballistic weapons (finite ammo)
  autocannon: {
    name: 'Autocannon',
    category: 'ballistic' as WeaponCategory,
    heatPerShot: 2,
    projectileSpeed: 500,
    fireRate: 0.065, // 65ms
    range: 400,
    damage: 8,
    ammo: 200,
    maxAmmo: 200,
  },
  railgun: {
    name: 'Railgun',
    category: 'ballistic' as WeaponCategory,
    heatPerShot: 3,
    projectileSpeed: 2000,
    fireRate: 0.8, // 800ms
    range: 2000,
    damage: 80,
    ammo: 20,
    maxAmmo: 20,
  },

  // Beam weapons (projectileSpeed=0 means instant hit, damage is per second)
  redLaser: {
    name: 'Red Laser',
    category: 'beam' as WeaponCategory,
    heatPerShot: 15, // Per second
    projectileSpeed: 0, // Instant
    fireRate: 0, // Continuous
    range: 400,
    damage: 60, // Per second
  },
  greenLaser: {
    name: 'Green Laser',
    category: 'beam' as WeaponCategory,
    heatPerShot: 12,
    projectileSpeed: 0,
    fireRate: 0,
    range: 800,
    damage: 40,
  },
  blueLaser: {
    name: 'Blue Laser',
    category: 'beam' as WeaponCategory,
    heatPerShot: 10,
    projectileSpeed: 0,
    fireRate: 0,
    range: 1200,
    damage: 25,
  },
} as const;

/** Creates a PrimaryWeapons component */
export function createPrimaryWeapons(weaponNames: string[]): PrimaryWeapons {
  const weapons: PrimaryWeapon[] = weaponNames.map((name) => {
    const def = WEAPON_DEFS[name as keyof typeof WEAPON_DEFS];
    if (!def) {
      throw new Error(`Unknown weapon: ${name}`);
    }
    return { ...def };
  });

  return {
    type: 'primaryWeapons',
    weapons,
    currentIndex: 0,
    lastFireTime: 0,
    linked: false, // Default to single-fire mode
  };
}

/** Creates a SecondaryWeapons component */
export function createSecondaryWeapons(
  weapons: SecondaryWeapon[],
): SecondaryWeapons {
  return {
    type: 'secondaryWeapons',
    weapons,
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: undefined,
    lockProgress: 0,
  };
}

/** Get current primary weapon, or undefined if none */
export function getCurrentPrimary(
  weapons: PrimaryWeapons,
): PrimaryWeapon | undefined {
  return weapons.weapons[weapons.currentIndex];
}

/** Get current secondary weapon, or undefined if none */
export function getCurrentSecondary(
  weapons: SecondaryWeapons,
): SecondaryWeapon | undefined {
  return weapons.weapons[weapons.currentIndex];
}

/** Cycle to next primary weapon */
export function cycleNextPrimary(weapons: PrimaryWeapons): void {
  if (weapons.weapons.length > 0) {
    weapons.currentIndex = (weapons.currentIndex + 1) % weapons.weapons.length;
  }
}

/** Cycle to previous primary weapon */
export function cyclePrevPrimary(weapons: PrimaryWeapons): void {
  if (weapons.weapons.length > 0) {
    weapons.currentIndex =
      (weapons.currentIndex - 1 + weapons.weapons.length) %
      weapons.weapons.length;
  }
}

/** Check if weapon can fire (fire rate cooldown) */
export function canFire(
  weapon: PrimaryWeapon | SecondaryWeapon,
  lastFire: number,
  now: number,
): boolean {
  const fireRate = 'fireRate' in weapon ? weapon.fireRate : 0.5;
  return now - lastFire >= fireRate;
}
