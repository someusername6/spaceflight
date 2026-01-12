/**
 * Sector 5: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_MEDIUM: Contract[] = [
  {
    id: 's5-iron-wall',
    name: 'Iron Wall',
    description:
      'Break the iron wall. Heavy Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
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
    ],
    reward: 10800,
  },
  {
    id: 's5-wraith-patrol',
    name: 'Wraith Patrol',
    description:
      'Hunt Wraith patrol. Nuclear lance carriers with elite escorts.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 11100,
  },
  {
    id: 's5-bomber-wing',
    name: 'Bomber Wing',
    description: 'Destroy bomber wing. Behemoths with Phantom escorts.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'behemoth', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 11400,
  },
  {
    id: 's5-elite-guard',
    name: 'Elite Guard',
    description:
      'Face the elite guard. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
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
    ],
    reward: 11600,
  },
  {
    id: 's5-heavy-metal',
    name: 'Heavy Metal',
    description: 'Destroy heavy assault. Phantoms and Dragonflies in force.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
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
    ],
    reward: 11850,
  },
];
