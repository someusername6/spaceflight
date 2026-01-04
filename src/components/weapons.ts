/**
 * Weapon components - primary and secondary weapon loadouts.
 */

import type { ComponentBase, Entity } from '../core/types';
import { PRIMARY_WEAPONS, type WeaponCategory } from '../data/weapons';

// Re-export for convenience
export type { WeaponCategory, WeaponStats } from '../data/weapons';
export { PRIMARY_WEAPONS } from '../data/weapons';

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
  /** Bank size (1, 2, or 3) - affects heat efficiency and ammo capacity */
  bankSize: number;
  /** Flak explosion radius - explodes when enemies within range */
  flakRadius?: number;
  /** Number of shrapnel projectiles on flak explosion */
  shrapnelCount?: number;
  /** Pulse beam - fires in discrete pulses instead of continuous */
  isPulseBeam?: boolean;
  /** Interval between pulse beam shots (seconds) */
  pulseInterval?: number;
  /** No damage falloff (constant damage at any range) */
  noFalloff?: boolean;
  /** Autoaim FOV in degrees - projectiles correct toward target within cone */
  autoaimFov?: number;
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
  /** Bank size (1, 2, or 3) - affects ammo capacity */
  bankSize: number;
  aoeRadius?: number; // Area of effect radius (undefined = no AoE)
  isNuke?: boolean; // Special nuke explosion effects
  isDecoy?: boolean; // Countermeasure - distracts missiles
}

/** Decoy weapon definition (bankSize, count, maxCount set at creation) */
export const DECOY_DEF: Omit<
  SecondaryWeapon,
  'count' | 'maxCount' | 'bankSize'
> = {
  name: 'Decoy',
  requiresLock: false,
  speed: 50, // Slow movement
  turnRate: 0,
  range: 0, // Not used (lifetime-based)
  damage: 0, // Non-damaging
  fireRate: 0.5, // 2 per second max
  lockSpeed: 0,
  isDecoy: true,
};

/** Creates a decoy secondary weapon (count is scaled by bankSize) */
export function createDecoyWeapon(
  baseCount: number,
  bankSize = 1,
): SecondaryWeapon {
  const count = baseCount * bankSize;
  return { ...DECOY_DEF, count, maxCount: count, bankSize };
}

/** Primary weapons component */
export interface PrimaryWeapons extends ComponentBase {
  readonly type: 'primaryWeapons';
  weapons: PrimaryWeapon[];
  currentIndex: number;
  lastFireTime: number; // Timestamp of last fire (for fire rate)
  linked: boolean; // true = fire all weapons together, false = fire selected only
  /** Cached: true if any weapon is a beam (computed at creation) */
  readonly hasBeams: boolean;
  /** Cached: true if ALL weapons are beams (computed at creation) */
  readonly hasOnlyBeams: boolean;
}

/** Secondary weapons component */
export interface SecondaryWeapons extends ComponentBase {
  readonly type: 'secondaryWeapons';
  weapons: SecondaryWeapon[];
  currentIndex: number;
  lastFireTime: number;
  lockTarget: Entity | undefined;
  lockProgress: number; // 0-1, 1 = locked
  lockWeaponIndex: number; // Which weapon the current lock is for (-1 = none)
}

/**
 * Weapon definitions - derived from data/weapons.ts (single source of truth).
 * @deprecated Use PRIMARY_WEAPONS directly instead.
 */
export const WEAPON_DEFS = PRIMARY_WEAPONS;

/** Weapon bank specification (name + size) */
export interface WeaponBankSpec {
  name: string;
  size: number;
}

/** Creates a PrimaryWeapons component from bank specs */
export function createPrimaryWeapons(
  bankSpecs: WeaponBankSpec[] | string[],
): PrimaryWeapons {
  const weapons: PrimaryWeapon[] = bankSpecs.map((spec) => {
    // Support both old string[] format (size=1) and new WeaponBankSpec format
    const name = typeof spec === 'string' ? spec : spec.name;
    const bankSize = typeof spec === 'string' ? 1 : spec.size;

    const def = WEAPON_DEFS[name as keyof typeof WEAPON_DEFS];
    if (!def) {
      throw new Error(`Unknown weapon: ${name}`);
    }

    // Apply bank size scaling to ammo (ballistic weapons only)
    const baseAmmo = 'ammo' in def ? (def.ammo as number) : undefined;
    if (baseAmmo !== undefined) {
      const scaledAmmo = baseAmmo * bankSize;
      return { ...def, bankSize, ammo: scaledAmmo, maxAmmo: scaledAmmo };
    }

    return { ...def, bankSize };
  });

  // Compute cached beam flags
  let beamCount = 0;
  for (const weapon of weapons) {
    if (weapon.category === 'beam') beamCount++;
  }

  return {
    type: 'primaryWeapons',
    weapons,
    currentIndex: 0,
    lastFireTime: 0,
    linked: false, // Default to single-fire mode
    hasBeams: beamCount > 0,
    hasOnlyBeams: beamCount === weapons.length,
  };
}

/** Get effective heat per shot (accounts for bank size) */
export function getEffectiveHeat(weapon: PrimaryWeapon): number {
  return weapon.heatPerShot / weapon.bankSize;
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
    lockWeaponIndex: -1, // No weapon locked yet
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

/** Find decoy weapon in secondary weapons (returns index and weapon) */
export function findDecoyWeapon(
  weapons: SecondaryWeapons,
): { index: number; weapon: SecondaryWeapon } | undefined {
  for (let i = 0; i < weapons.weapons.length; i++) {
    const weapon = weapons.weapons[i] as SecondaryWeapon;
    if (weapon.isDecoy && weapon.count > 0) {
      return { index: i, weapon };
    }
  }
  return undefined;
}

/** Check if primary weapons include any beam weapons (uses cached value) */
export function hasBeamWeapons(weapons: PrimaryWeapons): boolean {
  return weapons.hasBeams;
}
