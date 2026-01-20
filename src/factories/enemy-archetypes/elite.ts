/**
 * Elite Enemy Archetypes (Sectors 4-5)
 *
 * Heavy-class enemies for late-game encounters.
 * Striker, Defender, Sentinel, Bomber, Interceptor, Raider classes.
 */

import { createArchetype, type EnemyShipStats } from './types';

export const ELITE_ARCHETYPES: Record<string, EnemyShipStats> = {
  // Striker with torches - heavy heat injection assault
  inferno: createArchetype('striker', {
    playstyle: 'brawler',
    primaryWeapons: [
      { name: 'torch', size: 2 },
      { name: 'torch', size: 2 },
      { name: 'torch', size: 2 },
      { name: 'torch', size: 1 },
      { name: 'torch', size: 1 },
    ],
    secondaryWeapons: [{ name: 'rocket', count: 6, size: 1 }],
    preferredCombatRange: 200,
  }),

  // Striker with railguns - heavy assault, high damage output
  titan: createArchetype('striker', {
    playstyle: 'gunboat', // 5 primaries - constant firing constraints
    primaryWeapons: [
      { name: 'railgun', size: 2 },
      { name: 'railgun', size: 2 },
      { name: 'plasma', size: 2 },
      { name: 'plasma', size: 1 },
      { name: 'plasma', size: 1 },
    ],
    secondaryWeapons: [{ name: 'torpedo', count: 2, size: 1 }],
    preferredCombatRange: 500,
  }),

  // Defender with nukes - tanky missile platform
  // Defender banks: secondary [2,2,1,1,1]
  juggernaut: createArchetype('defender', {
    playstyle: 'beam', // Beam weapon - constant defensive thresholds
    primaryWeapons: [
      { name: 'redLaser', size: 2 },
      { name: 'redLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'nuke', count: 2, size: 2 },
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 450,
  }),

  // Sentinel with nuclear lance - long-range devastator
  // Sentinel banks: secondary [2,2,1]
  wraith: createArchetype('sentinel', {
    playstyle: 'kiting',
    primaryWeapons: [
      { name: 'nuclearLance', size: 3 },
      { name: 'railgun', size: 2 },
      { name: 'railgun', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 8, size: 2 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 700,
    fleeDistance: 500,
  }),

  // Bomber with heavy ordnance - slow but devastating
  // Bomber banks: secondary [2,2,2,1,1,1,1]
  behemoth: createArchetype('bomber', {
    playstyle: 'brawler',
    primaryWeapons: [{ name: 'torch', size: 2 }],
    secondaryWeapons: [
      { name: 'nuke', count: 2, size: 2 },
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'torpedo', count: 4, size: 2 },
      { name: 'seeker', count: 4, size: 1 },
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 400,
  }),

  // Interceptor with green lasers - fast elite dogfighter
  // Interceptor banks: primary [2,2], secondary [1,2,1]
  phantom: createArchetype('interceptor', {
    playstyle: 'beam', // Beam weapon - constant defensive thresholds
    primaryWeapons: [
      { name: 'greenLaser', size: 2 },
      { name: 'greenLaser', size: 2 },
    ],
    secondaryWeapons: [
      { name: 'dart', count: 5, size: 1 },
      { name: 'dart', count: 10, size: 2 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 500,
  }),

  // Raider with quad railguns + seekers - elite sniper
  // Raider banks: secondary [1,1,1]
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
      { name: 'seeker', count: 4, size: 1 },
      { name: 'decoy', count: 6, size: 1 },
    ],
    preferredCombatRange: 650,
    fleeDistance: 450,
  }),
};
