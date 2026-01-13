/**
 * Sector 2: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

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
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3385,
  },
  {
    id: 's2-starman',
    name: 'Starman',
    description: 'Survive area denial. Sparklers with starburst missiles.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'sparkler', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3497,
  },
  {
    id: 's2-running-down-a-dream',
    name: 'Running Down a Dream',
    description: 'Intercept raider force. Fireflies and Stingers.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3516,
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
        enemies: [{ archetype: 'bruiser', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3762,
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
        enemies: [{ archetype: 'locust', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4023,
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
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4032,
  },
];
