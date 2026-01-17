/**
 * Sector 1: Escort Missions
 * Convoy protection missions - escort friendly ships to safety.
 *
 * Sector 1 enemies: gnat, ember, shocker, mantis (rookie/regular skill)
 * Sector 1 wingmen: 4x regular fighters
 * Convoy speed: 55 m/s. Distance = (180 - jumpChargeTime) * 55 for ~180s missions.
 */

import type { Contract } from '../types';

export const SECTOR_1_ESCORT: Contract[] = [
  {
    id: 's1-safe-passage',
    name: 'Safe Passage',
    description:
      'Escort transport convoy to jump point. Light resistance from rookie scouts.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'escort',
    escortData: {
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 16,
      enemyPool: [
        { archetype: 'gnat', skill: 'rookie', count: 1 },
        { archetype: 'ember', skill: 'rookie', count: 1 },
      ],
      maxConcurrentEnemies: 4,
      initialSpawnCount: 2,
      spawnBatchSize: 1,
    },
    reward: 1898,
  },
  {
    id: 's1-supply-run',
    name: 'Supply Run',
    description:
      'Defend supply transports. Ion-armed Shockers hunting our cargo ships.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'escort',
    escortData: {
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 8,
      enemyPool: [
        { archetype: 'shocker', skill: 'rookie', count: 1 },
        { archetype: 'gnat', skill: 'regular', count: 1 },
        { archetype: 'ember', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 7764,
  },
  {
    id: 's1-convoy-defense',
    name: 'Convoy Defense',
    description:
      'Heavy transport convoy under attack. Mantis fighters with decoy countermeasures.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'escort',
    escortData: {
      convoySize: 5,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 12,
      enemyPool: [
        { archetype: 'mantis', skill: 'rookie', count: 1 },
        { archetype: 'ember', skill: 'regular', count: 1 },
        { archetype: 'shocker', skill: 'rookie', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 17576,
  },
];
