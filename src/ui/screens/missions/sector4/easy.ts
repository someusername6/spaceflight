/**
 * Sector 4: Easy Missions (80-90% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_4_EASY: Contract[] = [
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
          { archetype: 'inferno', skill: 'rookie', count: 4 },
          { archetype: 'inferno', skill: 'regular', count: 2 },
          { archetype: 'phantom', skill: 'rookie', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'rookie', count: 4 },
          { archetype: 'inferno', skill: 'regular', count: 2 },
          { archetype: 'dragonfly', skill: 'rookie', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'rookie', count: 4 },
          { archetype: 'inferno', skill: 'regular', count: 2 },
          { archetype: 'phantom', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'rookie', count: 4 },
          { archetype: 'inferno', skill: 'regular', count: 2 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 3650,
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
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [4, 8],
      },
      {
        enemies: [
          { archetype: 'firefly', skill: 'rookie', count: 3 },
          { archetype: 'firefly', skill: 'regular', count: 1 },
        ],
        delay: [6, 10],
      },
      {
        enemies: [
          { archetype: 'dragonfly', skill: 'rookie', count: 3 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [6, 10],
      },
      {
        enemies: [
          { archetype: 'phantom', skill: 'rookie', count: 2 },
          { archetype: 'phantom', skill: 'regular', count: 1 },
        ],
        delay: [6, 10],
      },
    ],
    reward: 3713,
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
          { archetype: 'dragonfly', skill: 'rookie', count: 3 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'rookie', count: 1 },
          { archetype: 'firefly', skill: 'rookie', count: 2 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'rookie', count: 1 },
          { archetype: 'dragonfly', skill: 'rookie', count: 3 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'firefly', skill: 'rookie', count: 2 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4389,
  },
  {
    id: 's4-uninvited',
    name: 'Uninvited',
    description:
      'Engage response force. Phantoms with Firefly and Dragonfly support.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'firefly', skill: 'rookie', count: 3 },
          { archetype: 'firefly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'dragonfly', skill: 'rookie', count: 3 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'phantom', skill: 'rookie', count: 2 },
          { archetype: 'phantom', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4468,
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
        enemies: [
          { archetype: 'wasp', skill: 'rookie', count: 3 },
          { archetype: 'wasp', skill: 'regular', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'dragonfly', skill: 'rookie', count: 3 },
          { archetype: 'dragonfly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'firefly', skill: 'rookie', count: 3 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'wasp', skill: 'rookie', count: 2 },
          { archetype: 'wasp', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 6271,
  },
];
