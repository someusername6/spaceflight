/**
 * Sector 2: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_EASY: Contract[] = [
  {
    id: 's2-border-skirmish',
    name: 'Border Skirmish',
    description:
      'Engage contested space. Fireflies, Dragonflies, and Stingers.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
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
    reward: 3366,
  },
  {
    id: 's2-fuel-depot',
    name: 'Fuel Depot',
    description:
      'Clear the sector. Dragonflies, Stingers, and Fireflies across four waves.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
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
    reward: 3614,
  },
  {
    id: 's2-convoy-escort',
    name: 'Raider Intercept',
    description: 'Intercept raider force. Fireflies and Stingers.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
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
    reward: 3705,
  },
  {
    id: 's2-starburst-field',
    name: 'Starburst Field',
    description: 'Survive area denial. Sparklers with starburst missiles.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3736,
  },
  {
    id: 's2-slug-patrol',
    name: 'Slug Patrol',
    description:
      'Intercept heavy patrol. Bruisers with slug cannons hitting hard.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
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
    reward: 3765,
  },
  {
    id: 's2-cluster-run',
    name: 'Cluster Run',
    description:
      'Destroy Locust squadron. Cluster missiles incoming - watch spacing.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
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
    reward: 3870,
  },
];
