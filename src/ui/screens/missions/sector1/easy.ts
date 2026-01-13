/**
 * Sector 1: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_EASY: Contract[] = [
  {
    id: 's1-ion-maiden',
    name: 'Ion Maiden',
    description: 'Eliminate hostile patrol. Shockers with ion cannons.',
    difficulty: 'easy',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 1815,
  },
  {
    id: 's1-stray-scout-strut',
    name: 'Stray Scout Strut',
    description: 'Destroy scout patrol. Light craft in large numbers.',
    difficulty: 'easy',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [3, 5],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'rookie', count: 4 }],
        delay: [4, 6],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 4 }],
        delay: [4, 6],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 5 }],
        delay: [4, 6],
      },
    ],
    reward: 2010,
  },
  {
    id: 's1-praying-for-time',
    name: 'Praying for Time',
    description: 'Destroy patrol. Mantis fighters with decoy countermeasures.',
    difficulty: 'easy',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2169,
  },
  {
    id: 's1-gnat-expectations',
    name: 'Gnat Expectations',
    description:
      'Intercept missile carriers. Gnats with swarm missiles incoming.',
    difficulty: 'easy',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'gnat', skill: 'rookie', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 5 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 6 }],
        delay: [8, 12],
      },
    ],
    reward: 2407,
  },
];
