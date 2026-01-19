/**
 * Sector 5: Escort Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 4.5-5.25 squad survival (6-ship scaled)
 * - Medium: 60-80% win rate, 3.75-4.5 squad survival (6-ship scaled)
 * - Hard: 45-65% win rate, 3.0-3.75 squad survival (6-ship scaled)
 *
 * Convoy protection missions - escort friendly ships to safety.
 * playerThreatRatio controls enemy targeting split.
 *
 * Sector 5 enemies: phantom, scorpion, wraith, dragonfly, firefly (veteran/ace)
 * Sector 5 wingmen: 6x (ace striker x2, ace defender x2, ace sentinel x2)
 * Convoy speed: 55 m/s. Distance = (180 - jumpChargeTime) * 55 for ~180s missions.
 */

import type { Contract } from '../types';

export const SECTOR_5_ESCORT: Contract[] = [
  {
    id: 's5-ace-corridor',
    name: 'Ace Corridor',
    description:
      'Escort convoy through elite space. Ace Phantoms and Dragonflies on patrol.',
    difficulty: 'easy',
    sector: 5,
    missionType: 'escort',
    escortData: {
      playerThreatRatio: 0.15,
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 16,
      enemyPool: [
        { archetype: 'phantom', skill: 'veteran', count: 1 },
        { archetype: 'dragonfly', skill: 'veteran', count: 1 },
      ],
      maxConcurrentEnemies: 4,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 6352,
  },
  {
    id: 's5-railgun-run',
    name: 'Railgun Run',
    description:
      'Navigate sniper gauntlet. Scorpions with ace Dragonfly support.',
    difficulty: 'medium',
    sector: 5,
    missionType: 'escort',
    escortData: {
      playerThreatRatio: 0.15,
      convoySize: 4,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 11,
      enemyPool: [
        { archetype: 'scorpion', skill: 'veteran', count: 1 },
        { archetype: 'dragonfly', skill: 'veteran', count: 1 },
      ],
      maxConcurrentEnemies: 6,
      initialSpawnCount: 4,
      spawnBatchSize: 1,
    },
    reward: 14152,
  },
  {
    id: 's5-wraith-hunt',
    name: 'Wraith Hunt',
    description:
      'Survive nuclear lance carrier. A Wraith with Phantom escorts.',
    difficulty: 'hard',
    sector: 5,
    missionType: 'escort',
    escortData: {
      playerThreatRatio: 0.25,
      convoySize: 5,
      convoyType: 'transport',
      escapeZoneDistance: 9240, // (180 - 12) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 12,
      spawnInterval: 10,
      enemyPool: [
        { archetype: 'wraith', skill: 'veteran', count: 1 },
        { archetype: 'phantom', skill: 'veteran', count: 1 },
        { archetype: 'dragonfly', skill: 'ace', count: 1 },
      ],
      maxConcurrentEnemies: 7,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 23706,
  },
];
