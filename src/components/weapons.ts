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
  /** Shrapnel travel range before expiring */
  shrapnelRange?: number;
  /** Shrapnel damage per piece */
  shrapnelDamage?: number;
  /** Shrapnel projectile speed (m/s) */
  shrapnelSpeed?: number;
  /** Pulse beam - fires in discrete pulses instead of continuous */
  isPulseBeam?: boolean;
  /** Interval between pulse beam shots (seconds) */
  pulseInterval?: number;
  /** No damage falloff (constant damage at any range) */
  noFalloff?: boolean;
  /** Autoaim FOV in degrees - projectiles correct toward target within cone */
  autoaimFov?: number;
  /** Beam width multiplier (default 1.0) */
  beamWidth?: number;
  /** Shield damage multiplier (default 1.0). */
  shieldDamageMultiplier?: number;
  /** Hull damage multiplier (default 1.0). */
  hullDamageMultiplier?: number;
  /** Ion effect - ionizes target shields, doubling regen delay for 8 seconds */
  ionize?: boolean;
  /** Heat injection rate (heat per second added to target ship by Torch) */
  heatInjection?: number;
  /**
   * Instant beam: fires once on press, applies all damage instantly to
   * all targets in beam path, consumes ammo, then fades out visually.
   * Uses fireRate as cooldown between shots.
   */
  isInstantBeam?: boolean;
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
  /** Lock cone half-angle in degrees - target must be within this angle of ship's forward */
  lockConeAngle: number;
  /** Bank size (1, 2, or 3) - affects ammo capacity */
  bankSize: number;
  /** Number of missiles spawned per shot (default 1) */
  projectilesPerShot?: number;
  aoeRadius?: number; // Area of effect radius (undefined = no AoE)
  isNuke?: boolean; // Special nuke explosion effects
  isDecoy?: boolean; // Countermeasure - distracts missiles
  /** Proximity detonation radius - explodes when enemies within range */
  flakRadius?: number;
  /** Number of shrapnel projectiles on detonation */
  shrapnelCount?: number;
  /** Shrapnel damage per piece */
  shrapnelDamage?: number;
  /** Shrapnel projectile speed (m/s) */
  shrapnelSpeed?: number;
  /** Shrapnel travel range before expiring */
  shrapnelRange?: number;
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
  lockConeAngle: 60, // Not used for decoys
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
  currentIndex: number; // Legacy - kept for beam system compatibility
  lastFireTime: number; // Timestamp of last fire (for fire rate)
  /** Link mode index: 0 to N-1 are weapon types, N is "all" */
  linkMode: number;
  /** Cached unique weapon type names in order, plus 'all' at the end */
  readonly linkModes: readonly string[];
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

/**
 * Build link modes for primary weapons.
 * Each bank gets an individual mode (index as string).
 * 'all' mode added if 2+ non-instant-beam weapons (fires all except instant beams).
 * Default is 'all' if it exists, otherwise first bank.
 */
export function buildLinkModes(weapons: PrimaryWeapon[]): {
  linkModes: string[];
  defaultLinkMode: number;
} {
  // Each bank is an individual mode (index as string)
  const linkModes: string[] = weapons.map((_, i) => String(i));

  // Count non-instant-beam weapons for 'all' mode eligibility
  let nonInstantCount = 0;
  for (const weapon of weapons) {
    if (!weapon.isInstantBeam) nonInstantCount++;
  }

  // Add 'all' mode if 2+ non-instant-beam weapons
  if (nonInstantCount >= 2) {
    linkModes.push('all');
  }

  // Default to 'all' if it exists, otherwise first non-instant-beam, otherwise 0
  let defaultLinkMode = linkModes.indexOf('all');
  if (defaultLinkMode === -1) {
    // Find first non-instant-beam weapon
    for (let i = 0; i < weapons.length; i++) {
      if (!weapons[i]?.isInstantBeam) {
        defaultLinkMode = i;
        break;
      }
    }
    // If all are instant beams, default to 0
    if (defaultLinkMode === -1) defaultLinkMode = 0;
  }

  return { linkModes, defaultLinkMode };
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

  // Build link modes: each bank individually, plus 'all' if 2+ non-instant-beam weapons
  const { linkModes, defaultLinkMode } = buildLinkModes(weapons);

  return {
    type: 'primaryWeapons',
    weapons,
    currentIndex: 0,
    lastFireTime: 0,
    linkMode: defaultLinkMode,
    linkModes,
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

/** Cycle to next primary weapon link mode (weapon type or 'all') */
export function cycleNextLinkMode(weapons: PrimaryWeapons): void {
  if (weapons.linkModes.length > 0) {
    weapons.linkMode = (weapons.linkMode + 1) % weapons.linkModes.length;
  }
}

// Re-export secondary weapon utilities from split module
export {
  cycleNextSecondary,
  findDecoyWeapon,
  switchToNonEmptySecondary,
} from './weapons-secondary';

/** Get current link mode name ('plasma', 'greenLaser', 'all', etc.) */
export function getCurrentLinkMode(weapons: PrimaryWeapons): string {
  return weapons.linkModes[weapons.linkMode] ?? 'all';
}

/** Check if current link mode is 'all' */
export function isAllLinked(weapons: PrimaryWeapons): boolean {
  return getCurrentLinkMode(weapons) === 'all';
}

/** Get indices of weapons that should fire in current link mode */
export function getWeaponIndicesForCurrentMode(
  weapons: PrimaryWeapons,
): number[] {
  const mode = getCurrentLinkMode(weapons);

  // 'all' mode: fire all non-instant-beam weapons
  if (mode === 'all') {
    const indices: number[] = [];
    for (let i = 0; i < weapons.weapons.length; i++) {
      if (!weapons.weapons[i]?.isInstantBeam) {
        indices.push(i);
      }
    }
    return indices;
  }

  // Individual bank mode: mode is bank index as string ('0', '1', etc.)
  const bankIndex = Number.parseInt(mode, 10);
  if (
    !Number.isNaN(bankIndex) &&
    bankIndex >= 0 &&
    bankIndex < weapons.weapons.length
  ) {
    return [bankIndex];
  }

  // Fallback: empty array (shouldn't happen with valid linkModes)
  return [];
}

/** Set link mode by weapon type name (for AI) */
export function setLinkModeByType(
  weapons: PrimaryWeapons,
  typeName: string,
): void {
  const index = weapons.linkModes.indexOf(typeName);
  if (index >= 0) {
    weapons.linkMode = index;
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

/** Check if primary weapons include any beam weapons (uses cached value) */
export function hasBeamWeapons(weapons: PrimaryWeapons): boolean {
  return weapons.hasBeams;
}
