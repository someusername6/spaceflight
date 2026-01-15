/**
 * Sector 3: Medium Missions (70-80% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_3_MEDIUM: Contract[] = [
  {
    id: 's3-hot-blooded',
    name: 'Hot Blooded',
    description:
      'Survive the inferno. Fireants with Phantom escorts closing fast.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [
          { archetype: 'fireant', skill: 'regular', count: 2 },
          { archetype: 'phantom', skill: 'regular', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'fireant', skill: 'veteran', count: 2 },
          { archetype: 'phantom', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'fireant', skill: 'veteran', count: 2 },
          { archetype: 'phantom', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'fireant', skill: 'ace', count: 2 },
          { archetype: 'phantom', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 3811,
  },
  {
    id: 's3-ghost-riders-in-the-sky',
    name: 'Ghost Riders in the Sky',
    description: 'Face assault force. Phantoms and Dragonflies.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3864,
  },
  {
    id: 's3-crimson-tide',
    name: 'Crimson Tide',
    description: 'Destroy enemy force. Fireflies and Dragonflies in waves.',
    difficulty: 'medium',
    sector: 3,
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
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4405,
  },
  {
    id: 's3-mothership-connection',
    name: 'Mothership Connection',
    description:
      'Face lightning barrage. Moths with swarm missiles and lightning cannons.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4601,
  },
  {
    id: 's3-aces-high',
    name: 'Aces High',
    description:
      'Face veteran squadron. Wasps, Dragonflies, and Rocketeers with skilled pilots.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 2 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 2 }],
        delay: [10, 15],
      },
    ],
    reward: 4755,
  },
];
