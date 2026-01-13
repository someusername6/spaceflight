/**
 * Sector 2: Hard Missions (60-70% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_HARD: Contract[] = [
  {
    id: 's2-the-predator-polka',
    name: 'The Predator Polka',
    description: 'Face formation. Phantoms, Bruisers, and Shredders together.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3518,
  },
  {
    id: 's2-blinded-by-the-light',
    name: 'Blinded by the Light',
    description:
      'Face the beam gauntlet. Fireflies, Vipers, and Sparklers lighting up the void.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [
          { archetype: 'firefly', skill: 'rookie', count: 2 },
          { archetype: 'sparkler', skill: 'rookie', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'viper', skill: 'rookie', count: 1 },
          { archetype: 'firefly', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'sparkler', skill: 'rookie', count: 2 },
          { archetype: 'viper', skill: 'rookie', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'sparkler', skill: 'rookie', count: 1 },
          { archetype: 'firefly', skill: 'rookie', count: 1 },
          { archetype: 'viper', skill: 'rookie', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4021,
  },
  {
    id: 's2-fight-for-your-right',
    name: 'Fight for Your Right',
    description: 'Hold contested zone. Mixed force incoming.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4579,
  },
  {
    id: 's2-disco-inferno',
    name: 'Disco Inferno',
    description:
      'Survive laser onslaught. All laser colors lighting up the void.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [
          { archetype: 'firefly', skill: 'rookie', count: 2 },
          { archetype: 'viper', skill: 'rookie', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'glowworm', skill: 'regular', count: 1 },
          { archetype: 'firefly', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'viper', skill: 'rookie', count: 2 },
          { archetype: 'glowworm', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'firefly', skill: 'regular', count: 2 },
          { archetype: 'viper', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4627,
  },
  {
    id: 's2-buzz-aldrin',
    name: 'Buzz Aldrin',
    description: 'Destroy Wasp squadron. Fast interceptors with autocannons.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [10, 15],
      },
    ],
    reward: 4873,
  },
];
