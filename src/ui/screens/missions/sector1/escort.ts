/**
 * Sector 1: Escort Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Convoy protection missions - escort friendly ships to safety.
 * playerThreatRatio controls enemy targeting split.
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
      playerThreatRatio: 0.35,
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 16,
      enemyPool: [
        { archetype: 'gnat', skill: 'regular', count: 1 },
        { archetype: 'ember', skill: 'regular', count: 1 },
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
      playerThreatRatio: 0.3,
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 7,
      enemyPool: [
        { archetype: 'shocker', skill: 'regular', count: 1 },
        { archetype: 'gnat', skill: 'regular', count: 1 },
        { archetype: 'ember', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 4,
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
      playerThreatRatio: 0.4,
      convoySize: 5,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 6,
      enemyPool: [
        { archetype: 'mantis', skill: 'regular', count: 1 },
        { archetype: 'ember', skill: 'regular', count: 1 },
        { archetype: 'shocker', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 4,
      spawnBatchSize: 1,
    },
    reward: 17576,
  },
];
