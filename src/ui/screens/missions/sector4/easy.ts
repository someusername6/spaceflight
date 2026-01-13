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
    reward: 3609,
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
    reward: 4318,
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
    reward: 4979,
  },
  {
    id: 's4-the-distance',
    name: 'The Distance',
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
    reward: 5630,
  },
  {
    id: 's4-clash-of-the-titans',
    name: 'Clash of the Titans',
    description: 'Intercept heavy assault. Titans with Phantom escorts.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'titan', skill: 'rookie', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 2 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'rookie', count: 1 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'rookie', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'rookie', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 6339,
  },
  {
    id: 's4-atomic',
    name: 'Atomic',
    description:
      'Nuclear threat detected. Juggernauts with nuke payloads inbound.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'juggernaut', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6775,
  },
];
