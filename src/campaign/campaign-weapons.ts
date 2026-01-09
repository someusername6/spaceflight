/**
 * Campaign weapon conversion - converts campaign loadouts to game components.
 */

import {
  buildLinkModes,
  type PrimaryWeapon,
  type PrimaryWeapons,
  type SecondaryWeapon,
  type SecondaryWeapons,
} from '../components/weapons';
import { MISSILES } from '../data/missiles';
import { PRIMARY_WEAPONS } from '../data/weapons';
import type { EquippedPrimary, EquippedSecondary } from './types';

/** Convert campaign EquippedPrimary to game PrimaryWeapon */
function createPrimaryFromEquipped(equipped: EquippedPrimary): PrimaryWeapon {
  const stats = PRIMARY_WEAPONS[equipped.weaponType];
  if (!stats) {
    throw new Error(`Unknown weapon type: ${equipped.weaponType}`);
  }

  const weapon: PrimaryWeapon = {
    name: stats.name, // Use display name from PRIMARY_WEAPONS, not the lookup key
    category: stats.category,
    heatPerShot: stats.heatPerShot / equipped.bankSize,
    projectileSpeed: stats.projectileSpeed,
    fireRate: stats.fireRate,
    range: stats.range,
    damage: stats.damage,
    bankSize: equipped.bankSize,
  };

  // Handle finite ammo
  if (stats.ammo !== undefined) {
    weapon.maxAmmo = stats.ammo * equipped.bankSize;
    weapon.ammo = equipped.currentAmmo ?? weapon.maxAmmo;
  }

  // Copy optional properties
  if (stats.flakRadius) weapon.flakRadius = stats.flakRadius;
  if (stats.shrapnelCount) weapon.shrapnelCount = stats.shrapnelCount;
  if (stats.isPulseBeam) weapon.isPulseBeam = stats.isPulseBeam;
  if (stats.pulseInterval) weapon.pulseInterval = stats.pulseInterval;
  if (stats.noFalloff) weapon.noFalloff = stats.noFalloff;
  if (stats.autoaimFov) weapon.autoaimFov = stats.autoaimFov;
  if (stats.beamWidth) weapon.beamWidth = stats.beamWidth;
  if (stats.shieldDamageMultiplier)
    weapon.shieldDamageMultiplier = stats.shieldDamageMultiplier;
  if (stats.hullDamageMultiplier)
    weapon.hullDamageMultiplier = stats.hullDamageMultiplier;
  if (stats.ionize) weapon.ionize = stats.ionize;
  if (stats.heatInjection) weapon.heatInjection = stats.heatInjection;
  if (stats.isInstantBeam) weapon.isInstantBeam = stats.isInstantBeam;

  return weapon;
}

/** Convert campaign EquippedSecondary to game SecondaryWeapon */
function createSecondaryFromEquipped(
  equipped: EquippedSecondary,
): SecondaryWeapon {
  const stats = MISSILES[equipped.weaponType];
  if (!stats) {
    throw new Error(`Unknown secondary type: ${equipped.weaponType}`);
  }

  const weapon: SecondaryWeapon = {
    name: stats.name, // Use display name from MISSILES, not the lookup key
    requiresLock: stats.requiresLock,
    speed: stats.speed,
    turnRate: stats.turnRate,
    range: stats.range,
    damage: stats.damage,
    count: equipped.count,
    maxCount: equipped.maxCount,
    fireRate: stats.fireRate,
    lockSpeed: stats.lockSpeed,
    lockConeAngle: stats.lockConeAngle ?? 30,
    bankSize: equipped.bankSize,
  };

  // Only add optional properties if they have values
  if (stats.aoeRadius !== undefined) weapon.aoeRadius = stats.aoeRadius;
  if (stats.isNuke) weapon.isNuke = stats.isNuke;
  if (stats.isDecoy) weapon.isDecoy = stats.isDecoy;

  return weapon;
}

/** Create PrimaryWeapons component from campaign loadout */
export function createPrimaryWeaponsFromCampaign(
  primaries: EquippedPrimary[],
): PrimaryWeapons {
  const weapons = primaries.map(createPrimaryFromEquipped);

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

/** Create SecondaryWeapons component from campaign loadout */
export function createSecondaryWeaponsFromCampaign(
  secondaries: EquippedSecondary[],
): SecondaryWeapons {
  return {
    type: 'secondaryWeapons',
    weapons: secondaries.map(createSecondaryFromEquipped),
    currentIndex: 0,
    lastFireTime: 0,
    lockTarget: undefined,
    lockProgress: 0,
    lockWeaponIndex: -1,
  };
}
