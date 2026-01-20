/**
 * Sector 2: Ambush Missions (target rates by difficulty)
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
 * Sector 2 enemies: dragonfly, stinger, firefly, viper, locust, bruiser, shredder, sparkler
 * Sector 2 wingmen: veteran fighter, regular fighter/interceptor/defender
 * Escort roles: aggressive (proactive engagement) vs defensive (reactive only)
 */

import type { Contract } from '../types';

export const SECTOR_2_AMBUSH: Contract[] = [
  {
    id: 's2-quick-draw',
    name: 'Quick Draw',
    description:
      'Intercept cargo convoy in contested space. Light escort protection expected.',
    difficulty: 'easy',
    sector: 2,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 700,
      escapeZoneDistance: 9200,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Easy: 3 defensive dragonflies + 4 aggressive stingers (veteran)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'veteran',
          count: 3,
          role: 'defensive',
        },
        {
          archetype: 'stinger',
          skill: 'veteran',
          count: 4,
          role: 'aggressive',
        },
      ],
    },
    reward: 2041,
  },
  {
    id: 's2-five-finger-discount',
    name: 'Five Finger Discount',
    description:
      'Raid merchant convoy with mixed escort wing. Watch for cluster missiles.',
    difficulty: 'medium',
    sector: 2,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 600,
      escapeZoneDistance: 9300,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Medium: 2 defensive dragonflies + 5 aggressive wasps (ace)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'veteran',
          count: 2,
          role: 'defensive',
        },
        { archetype: 'wasp', skill: 'ace', count: 5, role: 'aggressive' },
      ],
    },
    reward: 3661,
  },
  {
    id: 's2-high-noon',
    name: 'High Noon',
    description:
      'Heavy convoy with veteran escorts. Phantoms and Bruisers guard the prize.',
    difficulty: 'hard',
    sector: 2,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 900,
      escapeZoneDistance: 9000,
      escapeZoneRadius: 350,
      convoyStopDistance: 400,
      // Hard: 8 aggressive wasps (ace) - all attack player squad
      escorts: [
        { archetype: 'wasp', skill: 'ace', count: 8, role: 'aggressive' },
      ],
    },
    reward: 4759,
  },
];
