/**
 * Sector 1: Escort Missions
 * Convoy protection missions - escort friendly ships to safety.
 */

import type { Contract } from '../types';

export const SECTOR_1_ESCORT: Contract[] = [
  {
    id: 's1-safe-passage',
    name: 'Safe Passage',
    description:
      'Escort transport convoy to jump point. Light enemy resistance expected.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'escort',
    escortData: {
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 4000,
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 8,
      enemyPool: [
        { archetype: 'gnat', skill: 'rookie', count: 1 },
        { archetype: 'ember', skill: 'rookie', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 2,
      spawnBatchSize: 1,
    },
    reward: 3200,
  },
  {
    id: 's1-supply-run',
    name: 'Supply Run',
    description:
      'Defend supply transports. Enemy scouts hunting for easy targets.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'escort',
    escortData: {
      convoySize: 2,
      convoyType: 'transport',
      escapeZoneDistance: 3500,
      escapeZoneRadius: 250,
      jumpChargeTime: 8,
      spawnInterval: 10,
      enemyPool: [
        { archetype: 'ember', skill: 'rookie', count: 1 },
        { archetype: 'gnat', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 4,
      initialSpawnCount: 2,
      spawnBatchSize: 1,
    },
    reward: 2800,
  },
  {
    id: 's1-convoy-defense',
    name: 'Convoy Defense',
    description:
      'Heavy transport convoy under attack. Multiple hostiles inbound.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'escort',
    escortData: {
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 5000,
      escapeZoneRadius: 350,
      jumpChargeTime: 12,
      spawnInterval: 6,
      enemyPool: [
        { archetype: 'mantis', skill: 'rookie', count: 1 },
        { archetype: 'ember', skill: 'regular', count: 1 },
        { archetype: 'gnat', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 8,
      initialSpawnCount: 3,
      spawnBatchSize: 2,
    },
    reward: 4500,
  },
];
