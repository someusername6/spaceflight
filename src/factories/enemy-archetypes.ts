/**
 * Enemy Ship Archetypes - Defines enemy-specific ship configurations.
 *
 * Separate from player archetypes in ship-archetypes.ts.
 * Uses the same createArchetype helper and ShipStats structure.
 */

import type { WeaponBankSpec } from '../components/weapons';
import { SHIP_CLASSES, type ShipClassStats } from '../data/ships';
import type { AIPlaystyle } from './ship-archetypes';

/**
 * AI Playstyles:
 * - 'brawler': Standard combat, skill improves aim and composure. Default.
 * - 'escape': Hit-and-run, skill improves flee timing and survival.
 * - 'kiting': Ranged combat, skill improves range maintenance. Uses fleeDistance.
 */

/** Secondary weapon bank specification */
export interface SecondaryBankSpec {
  name: string;
  count: number;
  size: number;
}

/** Weapon loadout for an archetype */
interface WeaponLoadout {
  primaryWeapons: WeaponBankSpec[];
  secondaryWeapons?: SecondaryBankSpec[];
  playstyle?: AIPlaystyle;
  preferredCombatRange?: number;
  fleeDistance?: number;
}

/** Complete ship archetype (ship class stats + loadout) */
export interface EnemyShipStats extends ShipClassStats, WeaponLoadout {
  shipClassName: string;
}

/** Helper to create an archetype from a ship class and loadout */
function createArchetype(
  shipClass: string,
  loadout: WeaponLoadout,
): EnemyShipStats {
  const classStats = SHIP_CLASSES[shipClass];
  if (!classStats) {
    throw new Error(`Unknown ship class: ${shipClass}`);
  }
  return { ...classStats, ...loadout, shipClassName: shipClass };
}

/**
 * Enemy ship archetypes.
 * Add new enemy types here.
 */
export const ENEMY_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Patrol craft with dual red lasers - close-range beam fighter
  firefly: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'redLaser', size: 1 },
      { name: 'redLaser', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 4, size: 1 }],
    preferredCombatRange: 300,
  }),

  // Patrol craft with dual pulse cannons - rapid-fire skirmisher
  dragonfly: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 4, size: 1 }],
  }),

  // Scout with dual autocannons - fast glass cannon, aggressive
  wasp: createArchetype('scout', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'autocannon', size: 1 },
      { name: 'autocannon', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 2, size: 1 }],
    preferredCombatRange: 350,
  }),

  // Scout with plasma - fast aggressive striker
  hornet: createArchetype('scout', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [{ name: 'seeker', count: 4, size: 1 }],
    preferredCombatRange: 400,
  }),

  // Fighter with plasma and seekers - balanced mid-tier threat
  mantis: createArchetype('fighter', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 2, size: 1 },
    ],
    preferredCombatRange: 500,
  }),

  // Raider with quad railguns - dedicated sniper
  scorpion: createArchetype('raider', {
    playstyle: 'kiting',
    primaryWeapons: [
      { name: 'railgun', size: 3 },
      { name: 'railgun', size: 3 },
      { name: 'railgun', size: 1 },
      { name: 'railgun', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 2, size: 1 },
      { name: 'decoy', count: 2, size: 1 },
    ],
    preferredCombatRange: 600,
  }),

  // Defender with plasma - tanky brawler with heavy missiles
  beetle: createArchetype('defender', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'plasma', size: 2 },
      { name: 'plasma', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'torpedo', count: 2, size: 2 },
      { name: 'seeker', count: 6, size: 2 },
      { name: 'decoy', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 500,
  }),

  // Patrol with lightning - close-range harasser
  moth: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'lightning', size: 1 },
      { name: 'lightning', size: 1 },
    ],
    secondaryWeapons: [{ name: 'swarm', count: 8, size: 1 }],
    preferredCombatRange: 200,
  }),

  // Fighter with ion cannons - shield disruptor, aggressive
  stinger: createArchetype('fighter', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'ion', size: 1 },
      { name: 'ion', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'dart', count: 4, size: 1 },
    ],
    preferredCombatRange: 500,
  }),

  // Patrol with torch - close-range heat injector, aggressive
  fireant: createArchetype('patrol', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'torch', size: 1 },
      { name: 'torch', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 4, size: 1 }],
    preferredCombatRange: 150,
  }),

  // Fighter with green lasers - mid-range beam fighter
  viper: createArchetype('fighter', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'greenLaser', size: 1 },
      { name: 'greenLaser', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 3, size: 1 },
    ],
    preferredCombatRange: 600,
  }),

  // Scout with cluster missiles - area suppression
  locust: createArchetype('scout', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'cluster', count: 8, size: 1 }],
    preferredCombatRange: 500,
  }),

  // ============================================================================
  // ELITE ARCHETYPES (Sectors 4-5)
  // ============================================================================

  // Striker with railguns - heavy assault, high damage output
  titan: createArchetype('striker', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'railgun', size: 2 },
      { name: 'railgun', size: 2 },
      { name: 'plasma', size: 2 },
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [{ name: 'torpedo', count: 4, size: 1 }],
    preferredCombatRange: 500,
  }),

  // Defender with nukes - tanky missile platform
  juggernaut: createArchetype('defender', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'redLaser', size: 2 },
      { name: 'redLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'nuke', count: 2, size: 2 },
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 6, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 450,
  }),

  // Sentinel with nuclear lance - long-range devastator
  wraith: createArchetype('sentinel', {
    playstyle: 'kiting',
    primaryWeapons: [
      { name: 'nuclearLance', size: 3 },
      { name: 'railgun', size: 2 },
      { name: 'railgun', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 6, size: 2 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 700,
    fleeDistance: 500,
  }),

  // Bomber with heavy ordnance - slow but devastating
  behemoth: createArchetype('bomber', {
    playstyle: 'brawler',
    primaryWeapons: [{ name: 'torch', size: 2 }],
    secondaryWeapons: [
      { name: 'nuke', count: 2, size: 2 },
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 4, size: 1 },
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 400,
  }),

  // Interceptor with green lasers - fast elite dogfighter
  phantom: createArchetype('interceptor', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'greenLaser', size: 2 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 6, size: 1 },
      { name: 'seeker', count: 4, size: 2 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 500,
  }),

  // Raider with quad railguns + seekers - elite sniper
  specter: createArchetype('raider', {
    playstyle: 'kiting',
    primaryWeapons: [
      { name: 'railgun', size: 3 },
      { name: 'railgun', size: 3 },
      { name: 'railgun', size: 1 },
      { name: 'railgun', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'torpedo', count: 2, size: 1 },
      { name: 'seeker', count: 6, size: 1 },
      { name: 'decoy', count: 4, size: 1 },
    ],
    preferredCombatRange: 650,
    fleeDistance: 450,
  }),
};
