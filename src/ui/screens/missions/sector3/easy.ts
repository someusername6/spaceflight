/**
 * Sector 3: Easy Missions (80-90% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_3_EASY: Contract[] = [
  {
    id: 's3-three-dog-night',
    name: 'Three Dog Night',
    description:
      'Destroy enemy squadron. Fireflies, Dragonflies, and Rocketeers.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 2909,
  },
  {
    id: 's3-rocket-man',
    name: 'Rocket Man',
    description:
      'Intercept rocket fighters. Rocketeers with accelerating rounds.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 6 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 6 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 6 }],
        delay: [8, 12],
      },
    ],
    reward: 3043,
  },
  {
    id: 's3-ride-the-lightning',
    name: 'Ride the Lightning',
    description:
      'Engage electrical attack. Moths and Dragonflies with lightning support.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [
          { archetype: 'moth', skill: 'rookie', count: 2 },
          { archetype: 'dragonfly', skill: 'rookie', count: 4 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'moth', skill: 'rookie', count: 2 },
          { archetype: 'dragonfly', skill: 'rookie', count: 4 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'moth', skill: 'regular', count: 4 },
          { archetype: 'dragonfly', skill: 'regular', count: 4 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'moth', skill: 'regular', count: 4 },
          { archetype: 'dragonfly', skill: 'regular', count: 4 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 3389,
  },
  {
    id: 's3-danger-zone',
    name: 'Danger Zone',
    description: 'Engage fast attack wing. Phantoms, Dragonflies, and Wasps.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
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
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3406,
  },
  {
    id: 's3-light-my-fire',
    name: 'Light My Fire',
    description: 'Survive the heat. Fireants with torch beams - stay at range.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 5 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 5 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'ace', count: 5 }],
        delay: [8, 12],
      },
    ],
    reward: 3719,
  },
  {
    id: 's3-war-pigs',
    name: 'War Pigs',
    description: 'Destroy enemy formation. Fireflies and Dragonflies.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 3810,
  },
];
