/**
 * Sector 3: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_EASY: Contract[] = [
  {
    id: 's3-torch-bearers',
    name: 'Torch Bearers',
    description: 'Survive the heat. Fireants with torch beams - stay at range.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3728,
  },
  {
    id: 's3-veteran-formation',
    name: 'Veteran Formation',
    description:
      'Destroy enemy formation. Veteran Fireflies and Dragonflies in five waves.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4348,
  },
  {
    id: 's3-lightning-strike',
    name: 'Lightning Strike',
    description:
      'Engage electrical attack. Moths with lightning cannons incoming.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4400,
  },
  {
    id: 's3-gyrojet-patrol',
    name: 'Gyrojet Patrol',
    description:
      'Intercept rocket fighters. Rocketeers with accelerating rounds.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4765,
  },
  {
    id: 's3-interceptor-wing',
    name: 'Interceptor Wing',
    description: 'Engage fast attack wing. Phantoms, Dragonflies, and Wasps.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4846,
  },
  {
    id: 's3-torpedo-run',
    name: 'Torpedo Run',
    description: 'Heavy ordnance incoming. Beetles with torpedo launchers.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'beetle', skill: 'veteran', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4986,
  },
];
