/**
 * Sector 2: Escort Missions
 * Convoy protection missions - escort friendly ships to safety.
 *
 * Sector 2 enemies: dragonfly, firefly, stinger, locust, bruiser, sparkler (rookie/regular/veteran)
 * Sector 2 wingmen: veteran fighter, regular fighter, regular interceptor, regular defender
 * Convoy speed: 55 m/s. Distance = (180 - jumpChargeTime) * 55 for ~180s missions.
 */

import type { Contract } from '../types';

export const SECTOR_2_ESCORT: Contract[] = [
  {
    id: 's2-border-crossing',
    name: 'Border Crossing',
    description:
      'Escort freighters through contested space. Fireflies and Dragonflies patrolling.',
    difficulty: 'easy',
    sector: 2,
    missionType: 'escort',
    escortData: {
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 10,
      enemyPool: [
        { archetype: 'firefly', skill: 'rookie', count: 1 },
        { archetype: 'dragonfly', skill: 'rookie', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 4,
      spawnBatchSize: 1,
    },
    reward: 3839,
  },
  {
    id: 's2-cluster-run',
    name: 'Cluster Run',
    description:
      'Protect convoy from missile boats. Locusts with cluster missiles inbound.',
    difficulty: 'medium',
    sector: 2,
    missionType: 'escort',
    escortData: {
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 11,
      enemyPool: [
        { archetype: 'locust', skill: 'rookie', count: 1 },
        { archetype: 'firefly', skill: 'rookie', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 5826,
  },
  {
    id: 's2-heavy-escort',
    name: 'Heavy Escort',
    description:
      'Defend against heavy assault. Bruisers and Stingers targeting the convoy.',
    difficulty: 'hard',
    sector: 2,
    missionType: 'escort',
    escortData: {
      convoySize: 5,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 10,
      enemyPool: [
        { archetype: 'bruiser', skill: 'rookie', count: 1 },
        { archetype: 'stinger', skill: 'rookie', count: 1 },
        { archetype: 'dragonfly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 10494,
  },
];
