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
    id: 's5-endless-hunt',
    name: 'Endless Hunt',
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
      // Easy: 5 defensive dragonflies + 2 aggressive phantoms (regular)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'regular',
          count: 5,
          role: 'defensive',
        },
        {
          archetype: 'phantom',
          skill: 'regular',
          count: 2,
          role: 'aggressive',
        },
      ],
    },
    reward: 4807,
  },
  {
    id: 's5-wraith-convoy',
    name: 'Wraith Convoy',
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
      // Medium: 5 defensive dragonflies + 4 aggressive wasps (veteran)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'veteran',
          count: 5,
          role: 'defensive',
        },
        { archetype: 'wasp', skill: 'veteran', count: 4, role: 'aggressive' },
      ],
    },
    reward: 8871,
  },
  {
    id: 's5-titan-guard',
    name: 'Titan Guard',
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
      // Hard: 5 defensive scorpions + 5 aggressive wasps (veteran/ace)
      escorts: [
        {
          archetype: 'scorpion',
          skill: 'veteran',
          count: 5,
          role: 'defensive',
        },
        { archetype: 'wasp', skill: 'ace', count: 5, role: 'aggressive' },
      ],
    },
    reward: 9830,
  },
];
