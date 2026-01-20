/**
 * Sector-Specific Enemy Archetypes (S1-S3)
 *
 * Archetypes that use weapons available in specific sectors.
 */

import { createArchetype, type EnemyShipStats } from './types';

// ============================================================================
// SECTOR 1 ARCHETYPES (S1 weapons only + redLaser exception)
// ============================================================================

export const S1_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Patrol with blue lasers - long-range sniper harasser
  glowworm: createArchetype('patrol', {
    playstyle: 'kiting',
    primaryWeapons: [
      { name: 'blueLaser', size: 1 },
      { name: 'blueLaser', size: 1 },
    ],
    secondaryWeapons: [{ name: 'seeker', count: 4, size: 1 }],
    preferredCombatRange: 800,
    fleeDistance: 600,
  }),

  // Scout with swarm missiles - missile spammer
  gnat: createArchetype('scout', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'pulse', size: 1 },
      { name: 'pulse', size: 1 },
    ],
    secondaryWeapons: [{ name: 'swarm', count: 20, size: 1 }],
    preferredCombatRange: 400,
  }),

  // Patrol with red lasers and rockets - aggressive close-range (redLaser exception)
  ember: createArchetype('patrol', {
    playstyle: 'beam', // Beam weapon - constant defensive thresholds
    primaryWeapons: [
      { name: 'redLaser', size: 1 },
      { name: 'redLaser', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 6, size: 1 }],
    preferredCombatRange: 300,
  }),

  // Fighter with ion cannons - shield disruptor (S1-only version without dart)
  shocker: createArchetype('fighter', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'ion', size: 1 },
      { name: 'ion', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 500,
  }),
};

// ============================================================================
// SECTOR 2 ARCHETYPES (S1-S2 weapons)
// ============================================================================

export const S2_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Fighter with slug cannons - heavy hitter
  // Fighter banks: primary [1,1], secondary [1,1]
  bruiser: createArchetype('fighter', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'slugCannon', size: 1 },
      { name: 'slugCannon', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 5, size: 1 },
      { name: 'dart', count: 5, size: 1 },
    ],
    preferredCombatRange: 600,
  }),

  // Raider with flak cannons - anti-fighter screen
  // Raider banks: primary [3,3,1,1], secondary [1,1,1]
  shredder: createArchetype('raider', {
    playstyle: 'gunboat', // 4 primaries - constant firing constraints
    primaryWeapons: [
      { name: 'flak', size: 3 },
      { name: 'flak', size: 3 },
      { name: 'flak', size: 1 },
      { name: 'flak', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 400,
  }),

  // Scout with starburst missiles - area denial
  sparkler: createArchetype('scout', {
    playstyle: 'brawler', // Flak burst damage
    primaryWeapons: [
      { name: 'flak', size: 1 },
      { name: 'flak', size: 1 },
    ],
    secondaryWeapons: [{ name: 'starburst', count: 6, size: 1 }],
    preferredCombatRange: 400,
  }),
};

// ============================================================================
// SECTOR 3 ARCHETYPES (S1-S3 weapons)
// ============================================================================

export const S3_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Fighter with gyrojets - accelerating rocket fighter
  rocketeer: createArchetype('fighter', {
    playstyle: 'kiting',
    primaryWeapons: [
      { name: 'gyrojet', size: 1 },
      { name: 'gyrojet', size: 1 },
    ],
    secondaryWeapons: [
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 800,
    fleeDistance: 500,
  }),
};

/** All sector-specific archetypes combined */
export const SECTOR_ARCHETYPES: Record<string, EnemyShipStats> = {
  ...S1_ARCHETYPES,
  ...S2_ARCHETYPES,
  ...S3_ARCHETYPES,
};
