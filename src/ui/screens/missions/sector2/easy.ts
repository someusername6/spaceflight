/**
 * Sector 2: Easy Missions (80-90% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_2_EASY: Contract[] = [
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
    reward: 2436,
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
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 2807,
  },
  {
    id: 's2-running-down-a-dream',
    name: 'Running Down a Dream',
    description: 'Intercept raider force. Fireflies, Stingers, and Locusts.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 5 }],
        delay: [8, 12],
      },
    ],
    reward: 2836,
  },
  {
    id: 's2-starburst',
    name: 'Starburst',
    description: 'Survive area denial. Sparklers with starburst missiles.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 2 }],
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
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 2977,
  },
  {
    id: 's2-dust-in-the-wind',
    name: 'Dust in the Wind',
    description:
      'Clear the sector. Dragonflies, Stingers, and Fireflies across four waves.',
    difficulty: 'easy',
    sector: 2,
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 5 }],
        delay: [8, 12],
      },
    ],
    reward: 3247,
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
        enemies: [{ archetype: 'locust', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3366,
  },
];
