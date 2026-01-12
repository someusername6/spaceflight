/**
 * Core Enemy Archetypes
 *
 * Patrol, Scout, Fighter, Raider, Defender class enemies.
 * These form the foundation of enemy encounters across all sectors.
 */

import { createArchetype, type EnemyShipStats } from './types';

/**
 * Enemy missile counts are intentionally half-loaded for balance.
 * Full capacity would overwhelm players. Decoys remain at full.
 */
export const CORE_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Patrol craft with dual red lasers - close-range beam fighter
  firefly: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'redLaser', size: 1 },
      { name: 'redLaser', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 5, size: 1 }],
    preferredCombatRange: 300,
  }),

  // Patrol craft with dual pulse cannons - rapid-fire skirmisher
  dragonfly: createArchetype('patrol', {
    playstyle: 'escape',
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'dart', count: 5, size: 1 }],
  }),

  // Scout with dual autocannons - fast glass cannon, aggressive
  wasp: createArchetype('scout', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'autocannon', size: 1 },
      { name: 'autocannon', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 6, size: 1 }],
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
      { name: 'decoy', count: 6, size: 1 },
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
      { name: 'decoy', count: 6, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
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
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'decoy', count: 6, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
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
    secondaryWeapons: [{ name: 'swarm', count: 10, size: 1 }],
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
      { name: 'dart', count: 5, size: 1 },
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
    secondaryWeapons: [{ name: 'rocket', count: 6, size: 1 }],
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
      { name: 'decoy', count: 6, size: 1 },
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
    secondaryWeapons: [{ name: 'cluster', count: 5, size: 1 }],
    preferredCombatRange: 500,
  }),
};
