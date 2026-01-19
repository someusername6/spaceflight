/**
 * Sector 3: Escort Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Convoy protection missions - escort friendly ships to safety.
 * playerThreatRatio controls enemy targeting split.
 *
 * Sector 3 enemies: rocketeer, moth, dragonfly, firefly, phantom, wasp, fireant (regular/veteran/ace)
 * Sector 3 wingmen: 4x regular fighters
 * Convoy speed: 55 m/s. Distance = (180 - jumpChargeTime) * 55 for ~180s missions.
 */

import type { Contract } from '../types';

export const SECTOR_3_ESCORT: Contract[] = [
  {
    id: 's3-lightning-run',
    name: 'Lightning Run',
    description:
      'Escort convoy through electric storm. Moths and Dragonflies on intercept.',
    difficulty: 'easy',
    sector: 3,
    missionType: 'escort',
    escortData: {
      playerThreatRatio: 0.05,
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 6,
      enemyPool: [
        { archetype: 'moth', skill: 'regular', count: 1 },
        { archetype: 'dragonfly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 7,
      initialSpawnCount: 4,
      spawnBatchSize: 1,
    },
    reward: 5089,
  },
  {
    id: 's3-rocket-gauntlet',
    name: 'Rocket Gauntlet',
    description:
      'Navigate through rocket fire. Rocketeers and Fireflies attacking the convoy.',
    difficulty: 'medium',
    sector: 3,
    missionType: 'escort',
    escortData: {
      playerThreatRatio: 0.1,
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 10,
      enemyPool: [
        { archetype: 'rocketeer', skill: 'regular', count: 1 },
        { archetype: 'firefly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 6156,
  },
  {
    id: 's3-phantom-menace',
    name: 'Phantom Menace',
    description:
      'Defend against elite interceptors. Phantoms and Fireflies hunting convoys.',
    difficulty: 'hard',
    sector: 3,
    missionType: 'escort',
    escortData: {
      playerThreatRatio: 0.2,
      convoySize: 5,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 12,
      enemyPool: [
        { archetype: 'phantom', skill: 'regular', count: 1 },
        { archetype: 'firefly', skill: 'regular', count: 1 },
        { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        { archetype: 'sparkler', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 12376,
  },
];
