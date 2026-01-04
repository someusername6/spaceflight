/**
 * Ship Archetypes - Predefined ship configurations and stats.
 */

import type { WeaponBankSpec } from '../components/weapons';

/** Secondary weapon bank specification */
export interface SecondaryBankSpec {
  name: string;
  count: number;
  size: number;
}

/** Ship archetype stats */
export interface ShipStats {
  hull: number;
  shields: number;
  shieldRegen: number;
  shieldDelay: number;
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  rollRate: number;
  collisionRadius: number;
  maxHeat: number;
  coolingRate: number;
  afterburnerHeatRate: number;
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
  /**
   * Preferred combat range for AI. If specified, AI will actively close
   * to this distance during engagement. Ships with short-range weapons
   * should have lower values to ensure weapons are in range.
   */
  preferredCombatRange?: number;
}

/**
 * Expected weapon bank specs per archetype.
 * Validates both bank count AND sizes for each bank.
 * Primary: array of sizes. Secondary: array of { count, size }.
 */
export const ARCHETYPE_WEAPON_SPECS: Record<
  string,
  {
    primarySizes: number[];
    secondarySpecs: Array<{ count: number; size: number }>;
  }
> = {
  scout: {
    primarySizes: [1, 1],
    secondarySpecs: [{ count: 6, size: 1 }],
  },
  interceptor: {
    primarySizes: [1, 1, 2],
    secondarySpecs: [
      { count: 8, size: 1 },
      { count: 6, size: 2 },
      { count: 4, size: 1 },
    ],
  },
  striker: {
    primarySizes: [2, 2, 2, 1, 1],
    secondarySpecs: [{ count: 4, size: 1 }],
  },
  bomber: {
    primarySizes: [2],
    secondarySpecs: [
      { count: 4, size: 2 },
      { count: 8, size: 2 },
      { count: 8, size: 2 },
      { count: 6, size: 1 },
      { count: 6, size: 1 },
      { count: 4, size: 1 },
      { count: 4, size: 1 },
    ],
  },
  defender: {
    primarySizes: [2, 2],
    secondarySpecs: [
      { count: 8, size: 2 },
      { count: 8, size: 2 },
      { count: 6, size: 1 },
      { count: 4, size: 1 },
      { count: 4, size: 1 },
    ],
  },
  raider: {
    primarySizes: [3, 3, 1, 1], // BIGGER PRIMARIES: plasma(3), autocannon(3)
    secondarySpecs: [
      { count: 2, size: 1 }, // Reduced dart
      { count: 2, size: 1 }, // Reduced rocket
      { count: 4, size: 1 },
    ],
  },
  sentinel: {
    primarySizes: [3, 2, 1],
    secondarySpecs: [
      { count: 8, size: 2 },
      { count: 2, size: 2 },
      { count: 6, size: 1 },
      { count: 4, size: 1 },
      { count: 4, size: 1 },
    ],
  },
};

/**
 * Validates that a ship archetype has the expected weapon bank counts AND sizes.
 * Throws an error if the loadout doesn't match expected constraints.
 */
export function validateArchetypeLoadout(archetypeName: string): void {
  const stats = SHIP_ARCHETYPES[archetypeName];
  const expected = ARCHETYPE_WEAPON_SPECS[archetypeName];

  if (!stats || !expected) {
    return; // Unknown archetype, skip validation
  }

  // Validate primary weapon count
  if (stats.primaryWeapons.length !== expected.primarySizes.length) {
    throw new Error(
      `Ship archetype '${archetypeName}' has ${stats.primaryWeapons.length} ` +
        `primary banks, expected ${expected.primarySizes.length}.`,
    );
  }

  // Validate primary weapon sizes
  for (let i = 0; i < stats.primaryWeapons.length; i++) {
    const weapon = stats.primaryWeapons[i];
    const expectedSize = expected.primarySizes[i];
    if (weapon && expectedSize !== undefined && weapon.size !== expectedSize) {
      throw new Error(
        `Ship '${archetypeName}' primary bank ${i} has size ${weapon.size}, ` +
          `expected ${expectedSize}.`,
      );
    }
  }

  // Validate secondary weapon count
  const actualSecondary = stats.secondaryWeapons?.length ?? 0;
  if (actualSecondary !== expected.secondarySpecs.length) {
    throw new Error(
      `Ship archetype '${archetypeName}' has ${actualSecondary} ` +
        `secondary banks, expected ${expected.secondarySpecs.length}.`,
    );
  }

  // Validate secondary weapon specs (count and size)
  if (stats.secondaryWeapons) {
    for (let i = 0; i < stats.secondaryWeapons.length; i++) {
      const actual = stats.secondaryWeapons[i];
      const expectedSpec = expected.secondarySpecs[i];
      if (!actual || !expectedSpec) continue;

      if (actual.count !== expectedSpec.count) {
        throw new Error(
          `Ship '${archetypeName}' secondary bank ${i} has count ${actual.count}, ` +
            `expected ${expectedSpec.count}.`,
        );
      }
      if (actual.size !== expectedSpec.size) {
        throw new Error(
          `Ship '${archetypeName}' secondary bank ${i} has size ${actual.size}, ` +
            `expected ${expectedSpec.size}.`,
        );
      }
    }
  }
}

/**
 * Validates all ship archetypes on module load.
 * This catches loadout errors immediately rather than at runtime.
 */
export function validateAllArchetypes(): void {
  for (const name of Object.keys(SHIP_ARCHETYPES)) {
    validateArchetypeLoadout(name);
  }
}

/** Predefined ship archetypes - all stats from SHIPS.md */
export const SHIP_ARCHETYPES: Record<string, ShipStats> = {
  // Scout: Fast, fragile brawler - close-range beam + guns
  scout: {
    hull: 50,
    shields: 30,
    shieldRegen: 8,
    shieldDelay: 2,
    maxSpeed: 300,
    acceleration: 150,
    turnRate: 120,
    rollRate: 180,
    collisionRadius: 4,
    maxHeat: 80,
    coolingRate: 15,
    afterburnerHeatRate: 25,
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'redLaser', size: 1 }, // Close-range beam for fast brawler
    ],
    secondaryWeapons: [{ name: 'dart', count: 6, size: 1 }],
  },
  // Interceptor: Balanced fighter - BALANCED focus
  interceptor: {
    hull: 80,
    shields: 60,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 250,
    acceleration: 100,
    turnRate: 100,
    rollRate: 150,
    collisionRadius: 5,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 40,
    primaryWeapons: [
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 1 },
      { name: 'rocket', count: 6, size: 2 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  },
  // Striker: Heavy gun platform - GUNS focus with medium-range beam
  striker: {
    hull: 120,
    shields: 80,
    shieldRegen: 12,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 80,
    turnRate: 80,
    rollRate: 120,
    collisionRadius: 6,
    maxHeat: 150,
    coolingRate: 25,
    afterburnerHeatRate: 60,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'greenLaser', size: 2 }, // Medium-range beam (was red, too short for heavy assault)
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 4, size: 1 }],
  },
  // Bomber: Dedicated missile boat - MISSILES focus
  bomber: {
    hull: 100,
    shields: 70,
    shieldRegen: 10,
    shieldDelay: 3,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 75,
    rollRate: 110,
    collisionRadius: 7,
    maxHeat: 80,
    coolingRate: 12,
    afterburnerHeatRate: 55,
    primaryWeapons: [{ name: 'plasma', size: 2 }],
    secondaryWeapons: [
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  },
  // Defender: Tanky platform with sustained fire - beam for suppression
  defender: {
    hull: 150,
    shields: 120,
    shieldRegen: 18,
    shieldDelay: 2.5,
    maxSpeed: 180,
    acceleration: 70,
    turnRate: 70,
    rollRate: 100,
    collisionRadius: 7,
    maxHeat: 100,
    coolingRate: 18,
    afterburnerHeatRate: 50,
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'greenLaser', size: 2 }, // Replaced pulse - sustained beam for defense
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  },
  // Raider: Glass cannon gun platform - GUNS focus (BIGGER PRIMARIES variant)
  raider: {
    hull: 60,
    shields: 40,
    shieldRegen: 6,
    shieldDelay: 4,
    maxSpeed: 280,
    acceleration: 120,
    turnRate: 110,
    rollRate: 160,
    collisionRadius: 5,
    maxHeat: 140,
    coolingRate: 22,
    afterburnerHeatRate: 35,
    primaryWeapons: [
      { name: 'plasma', size: 3 }, // Bigger primary guns
      { name: 'autocannon', size: 3 }, // Bigger primary guns
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 2, size: 1 }, // Reduced for less missile dependency
      { name: 'rocket', count: 2, size: 1 }, // Reduced for less missile dependency
      { name: 'decoy', count: 4, size: 1 },
    ],
  },
  // Sentinel: Long-range support - BALANCED (beam-optimized)
  sentinel: {
    hull: 100,
    shields: 100,
    shieldRegen: 15,
    shieldDelay: 3,
    maxSpeed: 200,
    acceleration: 90,
    turnRate: 90,
    rollRate: 130,
    collisionRadius: 6,
    maxHeat: 130,
    coolingRate: 22,
    afterburnerHeatRate: 45,
    primaryWeapons: [
      { name: 'blueLaser', size: 3 },
      { name: 'greenLaser', size: 2 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'torpedo', count: 2, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  },
};

// Validate all archetypes on module load - catches loadout errors immediately
validateAllArchetypes();
