/**
 * Sector 3: Ambush Missions (target rates by difficulty)
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
 * Sector 3 enemies: rocketeer, moth, firefly, dragonfly, fireant, phantom, wasp, beetle
 * Sector 3 wingmen: veteran interceptor, regular interceptor, 2x regular defender
 * Escort roles: aggressive (proactive engagement) vs defensive (reactive only)
 */

import type { Contract } from '../types';

export const SECTOR_3_AMBUSH: Contract[] = [
  {
    id: 's3-into-the-fire',
    name: 'Into the Fire',
    description:
      'Intercept supply convoy in the warzone. Rocketeer escorts incoming.',
    difficulty: 'easy',
    sector: 3,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 800,
      escapeZoneDistance: 9100,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Easy: 3 defensive moths + 2 aggressive rocketeers (regular)
      escorts: [
        { archetype: 'moth', skill: 'regular', count: 3, role: 'defensive' },
        {
          archetype: 'rocketeer',
          skill: 'regular',
          count: 2,
          role: 'aggressive',
        },
      ],
    },
    reward: 2276,
  },
  {
    id: 's3-blitz',
    name: 'Blitz',
    description:
      'Hit convoy with moth escorts. Watch for lightning at close range.',
    difficulty: 'medium',
    sector: 3,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 850,
      escapeZoneDistance: 9050,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Medium: 2 defensive moths + 6 aggressive wasps (ace)
      escorts: [
        { archetype: 'moth', skill: 'ace', count: 2, role: 'defensive' },
        { archetype: 'wasp', skill: 'ace', count: 6, role: 'aggressive' },
      ],
    },
    reward: 3582,
  },
  {
    id: 's3-backdraft',
    name: 'Backdraft',
    description:
      'Heavy convoy with Fireant escorts. Torch beams will cook you at range.',
    difficulty: 'hard',
    sector: 3,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 900,
      escapeZoneDistance: 9000,
      escapeZoneRadius: 350,
      convoyStopDistance: 400,
      // Hard: 10 aggressive wasps (ace) - all attack player squad
      escorts: [
        { archetype: 'wasp', skill: 'ace', count: 10, role: 'aggressive' },
      ],
    },
    reward: 5390,
  },
];
