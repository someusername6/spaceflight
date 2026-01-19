/**
 * Sector 4: Easy Missions (80-90% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_4_EASY: Contract[] = [
  {
    id: 's4-uninvited',
    name: 'Uninvited',
    description:
      'Engage response force. Phantoms with Firefly and Dragonfly support.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4182,
  },
  {
    id: 's4-strike-a-pose',
    name: 'Strike a Pose',
    description:
      'Destroy strike force. Phantoms with Fireflies and Dragonflies.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [4, 8],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [6, 10],
      },
    ],
    reward: 4457,
  },
  {
    id: 's4-fortunate-son',
    name: 'Fortunate Son',
    description:
      'Destroy assault group. Infernos with Phantom support - heat incoming.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'inferno', skill: 'regular', count: 3 },
          { archetype: 'phantom', skill: 'rookie', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'regular', count: 3 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'veteran', count: 3 },
          { archetype: 'phantom', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'veteran', count: 3 },
          { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4608,
  },
  {
    id: 's4-scope-creep',
    name: 'Scope Creep',
    description: 'Engage sniper patrol. Scorpions with railguns at long range.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'scorpion', skill: 'rookie', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'firefly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'firefly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 5756,
  },
  {
    id: 's4-watchtower',
    name: 'Watchtower',
    description:
      'Destroy incoming hostiles. Wasps, Dragonflies, and Fireflies.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5882,
  },
];
