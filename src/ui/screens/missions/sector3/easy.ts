/**
 * Sector 3: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_EASY: Contract[] = [
  {
    id: 's3-das-boot',
    name: 'Das Boot',
    description: 'Heavy ordnance incoming. Beetles with torpedo launchers.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'beetle', skill: 'regular', count: 1 }],
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
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3919,
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
        enemies: [{ archetype: 'rocketeer', skill: 'regular', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'rocketeer', skill: 'regular', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3992,
  },
  {
    id: 's3-war-pigs',
    name: 'War Pigs',
    description: 'Destroy enemy formation. Veteran Fireflies and Dragonflies.',
    difficulty: 'easy',
    sector: 3,
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
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4155,
  },
  {
    id: 's3-ride-the-lightning',
    name: 'Ride the Lightning',
    description:
      'Engage electrical attack. Moths with lightning cannons incoming.',
    difficulty: 'easy',
    sector: 3,
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
    reward: 4467,
  },
  {
    id: 's3-light-my-fire',
    name: 'Light My Fire',
    description: 'Survive the heat. Fireants with torch beams - stay at range.',
    difficulty: 'easy',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4849,
  },
  {
    id: 's3-danger-zone',
    name: 'Danger Zone',
    description: 'Engage fast attack wing. Phantoms, Dragonflies, and Wasps.',
    difficulty: 'easy',
    sector: 3,
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
    reward: 5000,
  },
];
