/**
 * Sector 3: Medium Missions (70-80% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_3_MEDIUM: Contract[] = [
  {
    id: 's3-hot-blooded',
    name: 'Hot Blooded',
    description:
      'Fight through the inferno. Fireants with Phantom escorts closing fast.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [
          { archetype: 'fireant', skill: 'rookie', count: 1 },
          { archetype: 'phantom', skill: 'rookie', count: 3 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'fireant', skill: 'rookie', count: 2 },
          { archetype: 'phantom', skill: 'rookie', count: 3 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'fireant', skill: 'rookie', count: 2 },
          { archetype: 'phantom', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'fireant', skill: 'rookie', count: 2 },
          { archetype: 'phantom', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 3950,
  },
  {
    id: 's3-crimson-tide',
    name: 'Crimson Tide',
    description: 'Destroy enemy force. Fireflies and Dragonflies in waves.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 4113,
  },
  {
    id: 's3-aces-high',
    name: 'Aces High',
    description:
      'Face ace squadron. Wasps, Dragonflies, and Rocketeers with ace pilots.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'ace', count: 1 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 2 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'ace', count: 1 }],
        delay: [10, 15],
      },
    ],
    reward: 4978,
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
        enemies: [{ archetype: 'moth', skill: 'regular', count: 5 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 5 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 6 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 5 }],
        delay: [8, 12],
      },
    ],
    reward: 4987,
  },
  {
    id: 's3-ghost-riders-in-the-sky',
    name: 'Ghost Riders in the Sky',
    description: 'Face assault force. Phantoms and Dragonflies.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 5158,
  },
];
