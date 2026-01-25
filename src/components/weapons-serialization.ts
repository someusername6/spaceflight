/**
 * Weapons serialization - separate file to keep weapons.ts under 400 lines.
 */

import type { Entity } from '../core/types';
import { MISSILES } from '../data/missiles';
import { PRIMARY_WEAPONS } from '../data/weapons';
import type {
  PrimaryWeapon,
  PrimaryWeapons,
  SecondaryWeapon,
  SecondaryWeapons,
} from './weapons';
import { buildLinkModes, DECOY_DEF } from './weapons';

// =============================================================================
// Primary Weapon Serialization
// =============================================================================

/** Serialized primary weapon (only runtime state, stats from name) */
export interface SerializedPrimaryWeapon {
  n: string; // name (lookup stats)
  bs: number; // bankSize
  a?: number; // ammo (if finite)
  ma?: number; // maxAmmo (if finite)
}

/** Serialized primary weapons component */
export interface SerializedPrimaryWeapons {
  t: 10; // Component type ID
  w: SerializedPrimaryWeapon[]; // weapons
  ci: number; // currentIndex
  lf: number; // lastFireTime
  lm: number; // linkMode
}

function serializePrimaryWeapon(w: PrimaryWeapon): SerializedPrimaryWeapon {
  const result: SerializedPrimaryWeapon = { n: w.name, bs: w.bankSize };
  if (w.ammo !== undefined) result.a = w.ammo;
  if (w.maxAmmo !== undefined) result.ma = w.maxAmmo;
  return result;
}

function deserializePrimaryWeapon(s: SerializedPrimaryWeapon): PrimaryWeapon {
  // Look up by lowercase key (PRIMARY_WEAPONS uses lowercase keys, names are capitalized)
  const key = s.n.toLowerCase();
  const def = PRIMARY_WEAPONS[key as keyof typeof PRIMARY_WEAPONS];
  if (!def) throw new Error(`Unknown weapon: ${s.n}`);
  const result: PrimaryWeapon = { ...def, bankSize: s.bs };
  if (s.a !== undefined) result.ammo = s.a;
  if (s.ma !== undefined) result.maxAmmo = s.ma;
  return result;
}

export function serializePrimaryWeapons(
  c: PrimaryWeapons,
): SerializedPrimaryWeapons {
  return {
    t: 10,
    w: c.weapons.map(serializePrimaryWeapon),
    ci: c.currentIndex,
    lf: c.lastFireTime,
    lm: c.linkMode,
  };
}

export function deserializePrimaryWeapons(
  s: SerializedPrimaryWeapons,
): PrimaryWeapons {
  const weapons = s.w.map(deserializePrimaryWeapon);

  // Recompute cached beam flags
  let beamCount = 0;
  for (const weapon of weapons) {
    if (weapon.category === 'beam') beamCount++;
  }

  // Rebuild link modes
  const { linkModes } = buildLinkModes(weapons);

  return {
    type: 'primaryWeapons',
    weapons,
    currentIndex: s.ci,
    lastFireTime: s.lf,
    linkMode: s.lm,
    linkModes,
    hasBeams: beamCount > 0,
    hasOnlyBeams: beamCount === weapons.length,
  };
}

// =============================================================================
// Secondary Weapon Serialization
// =============================================================================

/** Serialized secondary weapon (only runtime state, stats from name) */
export interface SerializedSecondaryWeapon {
  n: string; // name (lookup stats)
  bs: number; // bankSize
  c: number; // count
  mc: number; // maxCount
}

/** Serialized secondary weapons component */
export interface SerializedSecondaryWeapons {
  t: 11; // Component type ID
  w: SerializedSecondaryWeapon[]; // weapons
  ci: number; // currentIndex
  lf: number; // lastFireTime
  lt: Entity | null; // lockTarget
  lp: number; // lockProgress
  lwi: number; // lockWeaponIndex
}

function serializeSecondaryWeapon(
  w: SecondaryWeapon,
): SerializedSecondaryWeapon {
  return { n: w.name, bs: w.bankSize, c: w.count, mc: w.maxCount };
}

function deserializeSecondaryWeapon(
  s: SerializedSecondaryWeapon,
): SecondaryWeapon {
  // Check if it's a decoy
  if (s.n === 'Decoy') {
    return { ...DECOY_DEF, bankSize: s.bs, count: s.c, maxCount: s.mc };
  }
  // Look up missile definition (MISSILES uses lowercase keys, names are capitalized)
  const key = s.n.toLowerCase();
  const def = MISSILES[key];
  if (!def) throw new Error(`Unknown secondary weapon: ${s.n}`);
  return { ...def, bankSize: s.bs, count: s.c, maxCount: s.mc };
}

export function serializeSecondaryWeapons(
  c: SecondaryWeapons,
): SerializedSecondaryWeapons {
  return {
    t: 11,
    w: c.weapons.map(serializeSecondaryWeapon),
    ci: c.currentIndex,
    lf: c.lastFireTime,
    lt: c.lockTarget ?? null,
    lp: c.lockProgress,
    lwi: c.lockWeaponIndex,
  };
}

export function deserializeSecondaryWeapons(
  s: SerializedSecondaryWeapons,
): SecondaryWeapons {
  return {
    type: 'secondaryWeapons',
    weapons: s.w.map(deserializeSecondaryWeapon),
    currentIndex: s.ci,
    lastFireTime: s.lf,
    lockTarget: s.lt ?? undefined,
    lockProgress: s.lp,
    lockWeaponIndex: s.lwi,
  };
}
