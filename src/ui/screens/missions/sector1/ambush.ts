/**
 * Sector 1: Ambush Missions (target rates by difficulty)
 * - Easy: 75-95% win rate, 75-90% squad survival
 * - Medium: 60-80% win rate, 60-75% squad survival
 * - Hard: 45-65% win rate, 45-60% squad survival
 *
 * Convoy interception missions - attack enemy convoy protected by escorts.
 * Victory: All convoy destroyed or stopped (no escorts nearby + player nearby)
 * Defeat: Any convoy escapes OR player dies
 *
 * Reward calculation:
 * - Stopped convoy: 100% credit (cargo captured intact)
 * - Destroyed convoy: 50% credit (cargo lost)
 *
 * Sector 1 enemies: gnat (rookie), mantis (regular/veteran)
 * Sector 1 wingmen: 4x regular fighters
 * Escort roles: aggressive (proactive engagement) vs defensive (reactive only)
 */

import type { Contract } from '../types';

export const SECTOR_1_AMBUSH: Contract[] = [
  {
    id: 's1-jackpot',
    name: 'Jackpot',
    description:
      'Intercept enemy supply convoy. Light escort protection - ideal for first ambush.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 600,
      escapeZoneDistance: 9300, // (180 - 10) * 55 m/s transport speed
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Easy: 2 defensive gnats + 2 aggressive mantis (rookie)
      escorts: [
        { archetype: 'gnat', skill: 'regular', count: 2, role: 'defensive' },
        { archetype: 'mantis', skill: 'rookie', count: 2, role: 'aggressive' },
      ],
    },
    reward: 1409,
  },
  {
    id: 's1-smash-and-grab',
    name: 'Smash and Grab',
    description:
      'Raid enemy cargo convoy. Mixed escorts with ion-armed Shockers.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 700,
      escapeZoneDistance: 9200, // (180 - 12) * 55 m/s transport speed
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Medium: 2 defensive + 2 aggressive
      escorts: [
        { archetype: 'gnat', skill: 'rookie', count: 2, role: 'defensive' },
        { archetype: 'mantis', skill: 'regular', count: 2, role: 'aggressive' },
      ],
    },
    reward: 3073,
  },
  {
    id: 's1-fools-gold',
    name: "Fool's Gold",
    description:
      'Heavy enemy transport convoy with experienced escort wing. Expect strong resistance.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 800,
      escapeZoneDistance: 9100, // (180 - 12) * 55 m/s transport speed
      escapeZoneRadius: 350,
      convoyStopDistance: 400,
      // Hard: 2 defensive gnats + 4 aggressive wasps (veteran)
      escorts: [
        { archetype: 'gnat', skill: 'rookie', count: 2, role: 'defensive' },
        { archetype: 'wasp', skill: 'veteran', count: 4, role: 'aggressive' },
      ],
    },
    reward: 3725,
  },
];
