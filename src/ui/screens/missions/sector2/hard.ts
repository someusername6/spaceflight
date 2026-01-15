/**
 * Sector 2: Hard Missions (60-70% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_2_HARD: Contract[] = [
  {
    id: 's2-the-predator-polka',
    name: 'The Predator Polka',
    description: 'Face formation. Phantoms, Bruisers, and Shredders together.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3518,
  },
  {
    id: 's2-fight-for-your-right',
    name: 'Fight for Your Right',
    description: 'Hold contested zone. Shredders lead the flak screen.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'rookie', count: 2 }],
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
    reward: 4251,
  },
  {
    id: 's2-blinded-by-the-light',
    name: 'Blinded by the Light',
    description:
      'Face the beam gauntlet. All laser colors lighting up the void.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [
          { archetype: 'firefly', skill: 'regular', count: 2 },
          { archetype: 'glowworm', skill: 'regular', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'viper', skill: 'regular', count: 2 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'sparkler', skill: 'regular', count: 2 },
          { archetype: 'viper', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'sparkler', skill: 'regular', count: 2 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4624,
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
    description: 'Destroy scout squadron. Wasps and Locusts incoming.',
    difficulty: 'hard',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'regular', count: 3 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [10, 15],
      },
    ],
    reward: 4862,
  },
];
