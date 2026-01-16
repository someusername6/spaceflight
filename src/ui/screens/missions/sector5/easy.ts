/**
 * Sector 5: Easy Missions (80-90% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_5_EASY: Contract[] = [
  {
    id: 's5-blackout',
    name: 'Blackout',
    description:
      'Clear sniper position. Scorpions with railguns and ace escorts.',
    difficulty: 'easy',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'scorpion', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 7516,
  },
  {
    id: 's5-spirit-in-the-sky',
    name: 'Spirit in the Sky',
    description: 'Intercept nuclear lance carrier. A Wraith with ace escorts.',
    difficulty: 'easy',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wraith', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 7761,
  },
  {
    id: 's5-aces-wild',
    name: 'Aces Wild',
    description:
      'Destroy ace formation. Phantoms, Dragonflies, and Fireflies - ace pilots.',
    difficulty: 'easy',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 8048,
  },
  {
    id: 's5-where-eagles-dare',
    name: 'Where Eagles Dare',
    description:
      'Survive beyond the frontier. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'easy',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 8742,
  },
];
