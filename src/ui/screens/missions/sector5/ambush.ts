/**
 * Sector 5: Ambush Missions (target rates by difficulty)
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
 * Sector 5 enemies: phantom, scorpion, wraith, dragonfly, firefly, titan, beetle, sparkler
 * Sector 5 wingmen: ace striker x2, ace defender x2, ace sentinel x2
 * Escort roles: aggressive (proactive engagement) vs defensive (reactive only)
 */

import type { Contract } from '../types';

export const SECTOR_5_AMBUSH: Contract[] = [
  {
    id: 's5-no-quarter',
    name: 'No Quarter',
    description:
      'Intercept convoy beyond the frontier. Ace Phantom escorts await.',
    difficulty: 'easy',
    sector: 5,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 900,
      escapeZoneDistance: 9000,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Easy: 3 defensive dragonflies + 2 aggressive phantoms (veteran)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'veteran',
          count: 3,
          role: 'defensive',
        },
        {
          archetype: 'phantom',
          skill: 'veteran',
          count: 2,
          role: 'aggressive',
        },
      ],
    },
    reward: 4387,
  },
  {
    id: 's5-black-flag',
    name: 'Black Flag',
    description:
      'Hit convoy escorted by a Wraith. Nuclear lance carrier guards the cargo.',
    difficulty: 'medium',
    sector: 5,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 950,
      escapeZoneDistance: 8950,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Medium: 4 defensive dragonflies + 8 aggressive wasps (ace)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'ace',
          count: 4,
          role: 'defensive',
        },
        { archetype: 'wasp', skill: 'ace', count: 8, role: 'aggressive' },
      ],
    },
    reward: 7864,
  },
  {
    id: 's5-goliath',
    name: 'Goliath',
    description:
      'Heavy convoy with Titan escort. Railgun striker guards the prize.',
    difficulty: 'hard',
    sector: 5,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 1000,
      escapeZoneDistance: 8900,
      escapeZoneRadius: 350,
      convoyStopDistance: 400,
      // Hard: 3 defensive scorpions + 10 aggressive wasps (ace)
      escorts: [
        { archetype: 'scorpion', skill: 'ace', count: 3, role: 'defensive' },
        { archetype: 'wasp', skill: 'ace', count: 10, role: 'aggressive' },
      ],
    },
    reward: 9867,
  },
];
