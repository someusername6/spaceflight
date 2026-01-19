/**
 * Sector 4: Escort Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.75-4.38 squad survival (5-ship scaled)
 * - Medium: 60-80% win rate, 3.13-3.75 squad survival (5-ship scaled)
 * - Hard: 45-65% win rate, 2.5-3.13 squad survival (5-ship scaled)
 *
 * Convoy protection missions - escort friendly ships to safety.
 * playerThreatRatio controls enemy targeting split.
 *
 * Sector 4 enemies: phantom, firefly, dragonfly, inferno, scorpion, wasp (regular/veteran)
 * Sector 4 wingmen: 5x (ace striker, veteran striker, veteran defender x2, regular sentinel)
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
      playerThreatRatio: 0.15,
      convoySize: 3,
      convoyType: 'transport',
      escapeZoneDistance: 9350, // (180 - 10) * 55
      escapeZoneRadius: 300,
      jumpChargeTime: 10,
      spawnInterval: 12,
      enemyPool: [
        { archetype: 'inferno', skill: 'regular', count: 1 },
        { archetype: 'firefly', skill: 'regular', count: 1 },
      ],
      maxConcurrentEnemies: 5,
      initialSpawnCount: 3,
      spawnBatchSize: 1,
    },
    reward: 4053,
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
      playerThreatRatio: 0.25,
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
    reward: 14286,
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
      playerThreatRatio: 0.35,
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
    reward: 14733,
  },
];
