/**
 * Sector 2: Easy Missions (80-90% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_2_EASY: Contract[] = [
  {
    id: 's2-dust-in-the-wind',
    name: 'Dust in the Wind',
    description:
      'Clear the sector. Dragonflies, Stingers, and Fireflies across four waves.',
    difficulty: 'easy',
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
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 2571,
  },
  {
    id: 's2-the-bruiser-brothers',
    name: 'The Bruiser Brothers',
    description:
      'Intercept heavy patrol. Bruisers with slug cannons hitting hard.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2587,
  },
  {
    id: 's2-starman',
    name: 'Starman',
    description: 'Survive area denial. Sparklers with starburst missiles.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2811,
  },
  {
    id: 's2-running-down-a-dream',
    name: 'Running Down a Dream',
    description: 'Intercept raider force. Fireflies and Stingers.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3158,
  },
  {
    id: 's2-borderline',
    name: 'Borderline',
    description:
      'Engage contested space. Fireflies, Dragonflies, and Stingers.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 3238,
  },
  {
    id: 's2-locust-hocus-pocus',
    name: 'Locust Hocus Pocus',
    description:
      'Destroy Locust squadron. Cluster missiles incoming - watch spacing.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3561,
  },
];
