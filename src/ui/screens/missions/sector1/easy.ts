/**
 * Sector 1: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_EASY: Contract[] = [
  {
    id: 's1-ion-storm',
    name: 'Ion Storm',
    description: 'Eliminate hostile patrol. Shockers with ion cannons.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 2385,
  },
  {
    id: 's1-mantis-guard',
    name: 'Mantis Guard',
    description: 'Destroy patrol. Mantis fighters with decoy countermeasures.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 2629,
  },
  {
    id: 's1-first-contact',
    name: 'First Contact',
    description: 'Destroy scout patrol. Rookie pilots in light craft.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2815,
  },
  {
    id: 's1-sniper-alley',
    name: 'Sniper Alley',
    description: 'Engage long-range patrol. Blue laser snipers at distance.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'glowworm', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2824,
  },
  {
    id: 's1-swarm-warning',
    name: 'Swarm Warning',
    description:
      'Intercept missile carriers. Gnats with swarm missiles incoming.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2877,
  },
  {
    id: 's1-red-dawn',
    name: 'Red Dawn',
    description:
      'Intercept laser patrol. Embers with red lasers at close range.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2923,
  },
];
