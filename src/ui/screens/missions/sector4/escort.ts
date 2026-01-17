/**
 * Sector 4: Escort Missions
 * Convoy protection missions - escort friendly ships to safety.
 *
 * Sector 4 enemies: phantom, firefly, dragonfly, inferno, scorpion, wasp (regular/veteran)
 * Sector 4 wingmen: ace striker, veteran striker, veteran defender x2, regular sentinel
 * Convoy speed: 55 m/s. Distance = (180 - jumpChargeTime) * 55 for ~180s missions.
 */

import type { Contract } from '../types';

export const SECTOR_4_ESCORT: Contract[] = [
  {
    id: 's4-heat-corridor',
    name: 'Heat Corridor',
    description:
      'Escort convoy through hot zone. Infernos with heat beams on patrol.',
    difficulty: 'easy',
    sector: 4,
    missionType: 'escort',
    escortData: {
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 13,
      enemyPool: [
        { archetype: 'inferno', skill: 'regular', count: 1 },
        { archetype: 'firefly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 3989,
  },
  {
    id: 's4-sniper-alley',
    name: 'Sniper Alley',
    description:
      'Navigate sniper territory. Scorpions with railguns targeting cargo ships.',
    difficulty: 'medium',
    sector: 4,
    missionType: 'escort',
    escortData: {
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 12,
      enemyPool: [
        { archetype: 'scorpion', skill: 'regular', count: 1 },
        { archetype: 'firefly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 10079,
  },
  {
    id: 's4-phantom-strike',
    name: 'Phantom Strike',
    description:
      'Defend against elite assault. Phantoms with Dragonfly support.',
    difficulty: 'hard',
    sector: 4,
    missionType: 'escort',
    escortData: {
      convoySize: 5,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 12,
      enemyPool: [
        { archetype: 'phantom', skill: 'regular', count: 1 },
        { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        { archetype: 'firefly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 13039,
  },
];
