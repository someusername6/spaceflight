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
    damage: 9, // Was 8, +12.5% for close-range advantage (not +25%, was too strong)
    ammo: 200,
    maxAmmo: 200,
  },
  railgun: {
    name: 'Railgun',
    category: 'ballistic' as WeaponCategory,
    heatPerShot: 3,
    projectileSpeed: 2000,
    fireRate: 1.0, // Was 0.8s, slower for alpha strike fantasy
    range: 2000,
    damage: 160, // Was 80, +100% for devastating alpha strikes
    ammo: 20,
    maxAmmo: 20,
  },
  flak: {
    name: 'Flak',
    category: 'ballistic' as WeaponCategory,
    heatPerShot: 4,
    projectileSpeed: 350,
    fireRate: 0.25, // Was 0.4s, faster for rapid area denial (120 DPS)
    range: 600,
    damage: 30, // Was 15, +100% for viable primary weapon
    ammo: 50,
    maxAmmo: 50,
    flakRadius: 100, // Was 80, larger AoE for area denial
    shrapnelCount: 8, // Spawns 8 shrapnel projectiles
  },

  // Beam weapons (projectileSpeed=0 means instant hit, damage is per second)
  // +100% damage buff to make beam specialization viable (see BALANCE_TESTING.md)
  redLaser: {
    name: 'Red Laser',
    category: 'beam' as WeaponCategory,
    heatPerShot: 15, // Per second
    projectileSpeed: 0, // Instant
    fireRate: 0, // Continuous
    range: 400,
    damage: 120, // Per second (was 60, +100% buff)
  },
  greenLaser: {
    name: 'Green Laser',
    category: 'beam' as WeaponCategory,
    heatPerShot: 12,
    projectileSpeed: 0,
    fireRate: 0,
    range: 800,
    damage: 80, // Was 40, +100% buff
  },
  blueLaser: {
    name: 'Blue Laser',
    category: 'beam' as WeaponCategory,
    heatPerShot: 10,
    projectileSpeed: 0,
    fireRate: 0,
    range: 1200,
    damage: 50, // Was 25, +100% buff
  },

  // Special beam weapons
  lightning: {
    name: 'Lightning',
    category: 'beam' as WeaponCategory,
    heatPerShot: 2, // 20/sec at 10 pulses/sec
    projectileSpeed: 0,
    fireRate: 0, // Continuous (pulse handled separately)
    range: 300,
    damage: 5, // 50/sec at 10 pulses/sec
    isPulseBeam: true,
    pulseInterval: 0.1, // 100ms between bolts
    noFalloff: true,
  },
  nuclearLance: {
    name: 'Nuclear Lance',
    category: 'beam' as WeaponCategory,
    heatPerShot: 0, // No heat
    projectileSpeed: 0,
    fireRate: 0.5, // Single shot with cooldown
    range: 3000,
    damage: 500, // Single massive hit
    ammo: 1, // Limited ammo
    maxAmmo: 1,
  },
} as const;

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

  return {
    type: 'primaryWeapons',
    weapons,
    currentIndex: 0,
    lastFireTime: 0,
    linked: false, // Default to single-fire mode
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
