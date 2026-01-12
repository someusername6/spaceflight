/**
 * Sector 5: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_HARD: Contract[] = [
  {
    id: 's5-wraith-strike',
    name: 'Wraith Strike',
    description: 'Stop nuclear assault. Multiple Wraiths with elite support.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 12400,
  },
  {
    id: 's5-final-stand',
    name: 'Final Stand',
    description: 'Make your final stand. Five waves of Ace-level fighters.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 12650,
  },
  {
    id: 's5-elite-armada',
    name: 'Elite Armada',
    description: 'Destroy the armada. Elite Phantoms and Dragonflies.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 12850,
  },
  {
    id: 's5-apocalypse',
    name: 'Apocalypse',
    description: 'Face the apocalypse. Maximum enemy force across four waves.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 13000,
  },
  {
    id: 's5-omega',
    name: 'Omega',
    description: 'The ultimate challenge. Elite Phantoms with maximum force.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 13100,
  },
];
