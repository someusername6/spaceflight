/**
 * Sector 2: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_HARD: Contract[] = [
  {
    id: 's2-elite-hunters',
    name: 'Elite Hunters',
    description:
      'Face elite formation. Phantoms, Bruisers, and Shredders together.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5217,
  },
  {
    id: 's2-laser-storm',
    name: 'Laser Storm',
    description: 'Survive laser onslaught. Fireflies and Vipers closing fast.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5470,
  },
  {
    id: 's2-laser-gauntlet',
    name: 'Laser Gauntlet',
    description:
      'Face the beam gauntlet. Veteran Fireflies and Vipers with lasers.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5506,
  },
  {
    id: 's2-contested-ground',
    name: 'Contested Ground',
    description: 'Hold contested zone. Maximum force with veteran pilots.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5798,
  },
  {
    id: 's2-wasp-nest',
    name: 'Wasp Nest',
    description: 'Destroy Wasp squadron. Fast interceptors with autocannons.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5827,
  },
];
