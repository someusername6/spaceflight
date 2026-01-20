/**
 * Sector 2: Medium Missions (70-80% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_2_MEDIUM: Contract[] = [
  {
    id: 's2-wall-of-sound',
    name: 'Wall of Sound',
    description:
      'Breach the flak screen. Shredders with flak cannons and Phantom escorts.',
    difficulty: 'medium',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'rookie', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 1973,
  },
  {
    id: 's2-dart-side-of-the-moon',
    name: 'Dart Side of the Moon',
    description:
      'Face interceptors. Phantoms with green lasers and dart missiles.',
    difficulty: 'medium',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3228,
  },
  {
    id: 's2-heavy-metal-queen',
    name: 'Heavy Metal Queen',
    description: 'Destroy heavy fighters. Bruisers with slug cannons leading.',
    difficulty: 'medium',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3350,
  },
  {
    id: 's2-backup-singers',
    name: 'Backup Singers',
    description:
      'Destroy reinforced patrol. Fireflies, Dragonflies, and Locusts.',
    difficulty: 'medium',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 3423,
  },
  {
    id: 's2-fangs-for-the-memories',
    name: 'Fangs for the Memories',
    description: 'Clear Viper squadron. Green laser fighters with long range.',
    difficulty: 'medium',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'viper', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3747,
  },
];
