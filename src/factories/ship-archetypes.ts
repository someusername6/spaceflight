/**
 * Ship Archetypes/Builds - Combines ship classes with weapon loadouts.
 *
 * Ship classes (chassis stats) are defined in data/ships.ts.
 * This file defines loadouts and creates complete archetypes.
 */

import type { WeaponBankSpec } from '../components/weapons';
import { SHIP_CLASSES, type ShipClassStats } from '../data/ships';

/** Secondary weapon bank specification */
export interface SecondaryBankSpec {
  name: string;
  count: number;
  size: number;
}

/**
 * AI playstyle determines how skill parameters scale.
 * - brawler: Standard combat, skill improves aim and composure
 * - escape: Hit-and-run, skill improves flee timing and survival
 * - kiting: Ranged combat, skill improves range maintenance
 */
export type AIPlaystyle = 'brawler' | 'escape' | 'kiting';

/** Weapon loadout for an archetype */
interface WeaponLoadout {
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
  /**
   * AI playstyle for skill parameter scaling.
   * Defaults to 'brawler' if not specified.
   */
  playstyle?: AIPlaystyle;
  /**
   * Preferred combat range for AI. If specified, AI will actively close
   * to this distance during engagement. Ships with short-range weapons
   * should have lower values to ensure weapons are in range.
   */
  preferredCombatRange?: number;
  /**
   * Distance at which AI will flee (enter EVADE). Used for kiting ships
   * that want to maintain range. AI returns to ENGAGE when distance
   * exceeds preferredCombatRange.
   */
  fleeDistance?: number;
}

/** Complete ship archetype (ship class stats + loadout) */
export interface ShipStats extends ShipClassStats, WeaponLoadout {
  /** The ship class this archetype is based on */
  shipClassName: string;
}

/** Helper to create an archetype from a ship class and loadout */
function createArchetype(shipClass: string, loadout: WeaponLoadout): ShipStats {
  const classStats = SHIP_CLASSES[shipClass];
  if (!classStats) {
    throw new Error(`Unknown ship class: ${shipClass}`);
  }
  return { ...classStats, ...loadout, shipClassName: shipClass };
}

/**
 * Predefined ship archetypes - ship class + weapon loadout combinations.
 * Each archetype uses createArchetype() to derive stats from SHIP_CLASSES.
 */
export const SHIP_ARCHETYPES: Record<string, ShipStats> = {
  // === BASE ARCHETYPES (one per ship class, standard loadout) ===

  // Scout: Fast escape ship - hit-and-run playstyle
  scout: createArchetype('scout', {
    playstyle: 'escape', // Skilled scouts know when to run
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'redLaser', size: 1 }, // Close-range beam for fast brawler
    ],
    secondaryWeapons: [{ name: 'dart', count: 6, size: 1 }],
  }),

  // Interceptor: Balanced fighter - BALANCED focus
  interceptor: createArchetype('interceptor', {
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
  }),

  // Striker: Heavy gun platform - GUNS focus with medium-range beam
  striker: createArchetype('striker', {
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'autocannon', size: 2 },
      { name: 'greenLaser', size: 2 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 4, size: 1 }],
  }),

  // Bomber: Dedicated missile boat - MISSILES focus
  bomber: createArchetype('bomber', {
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
  }),

  // Defender: Tanky platform with sustained fire - beam for suppression
  defender: createArchetype('defender', {
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 8, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'rocket', count: 6, size: 1 },
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  }),

  // Raider: Glass cannon gun platform - GUNS focus (BIGGER PRIMARIES)
  raider: createArchetype('raider', {
    primaryWeapons: [
      { name: 'plasma', size: 3 },
      { name: 'autocannon', size: 3 },
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 2, size: 1 },
      { name: 'rocket', count: 2, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  }),

  // Sentinel: Beam specialist - all red lasers for beam focus
  sentinel: createArchetype('sentinel', {
    primaryWeapons: [
      { name: 'redLaser', size: 3 },
      { name: 'redLaser', size: 2 },
      { name: 'redLaser', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 2 },
      { name: 'torpedo', count: 2, size: 2 },
      { name: 'decoy', count: 4, size: 1 },
    ],
  }),

  // === VARIANT ARCHETYPES (different loadout on existing ship class) ===

  // Sniper: Raider chassis with railgun loadout - fast alpha striker
  // Uses distance-flee: engages from range, flees when enemy closes
  // Raider has speed 280 (only scout at 300 is faster) + glass cannon profile
  sniper: createArchetype('raider', {
    playstyle: 'kiting', // Skilled snipers maintain range
    primaryWeapons: [
      { name: 'railgun', size: 2 },
      { name: 'railgun', size: 2 },
    ],
    secondaryWeapons: [{ name: 'decoy', count: 4, size: 1 }],
    preferredCombatRange: 900, // Long range for railgun effectiveness
    fleeDistance: 400, // Flee when enemy closes
  }),

  // Lancer: Sentinel chassis with green laser loadout - mid-range beam brawler
  // Engages at medium range where beam falloff is manageable
  lancer: createArchetype('sentinel', {
    playstyle: 'brawler', // Mid-range beam fighter, not a kiter
    primaryWeapons: [
      { name: 'greenLaser', size: 3 }, // Sentinel bank 1 is size 3
      { name: 'greenLaser', size: 2 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 400, // Close enough for beam damage
  }),

  // Lancer Blue: Sentinel chassis with blue laser - mid-range beam fighter
  // Blue laser: 50 DPS base, 1200m range - but heavy falloff means close is better
  // Brawler playstyle at medium range balances reach vs damage output
  lancerBlue: createArchetype('sentinel', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'blueLaser', size: 3 },
      { name: 'blueLaser', size: 2 },
      { name: 'blueLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 450, // Close enough for decent damage (50 / 4.5 = 11 DPS/beam)
  }),

  // Lancer Red: Sentinel chassis with red laser - close range high DPS variant
  // Red laser: 120 DPS, 400m range
  lancerRed: createArchetype('sentinel', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'redLaser', size: 3 },
      { name: 'redLaser', size: 2 },
      { name: 'redLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 300, // Close range for red laser effectiveness
  }),
};
