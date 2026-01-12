/**
 * Sector 1: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_EASY: Contract[] = [
  {
    id: 's1-gnat-expectations',
    name: 'Gnat Expectations',
    description:
      'Intercept missile carriers. Gnats with swarm missiles incoming.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'gnat', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2582,
  },
  {
    id: 's1-stray-scout-strut',
    name: 'Stray Scout Strut',
    description: 'Destroy scout patrol. Rookie pilots in light craft.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 3 }],
        delay: [3, 5],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [4, 6],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [4, 6],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [4, 6],
      },
    ],
    reward: 2797,
  },
  {
    id: 's1-ember-elegy',
    name: 'Ember Elegy',
    description:
      'Intercept laser patrol. Embers with red lasers at close range.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 3 }],
        delay: [3, 5],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
        delay: [4, 6],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [4, 6],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [4, 6],
      },
    ],
    reward: 2797,
  },
  {
    id: 's1-ion-maiden',
    name: 'Ion Maiden',
    description: 'Eliminate hostile patrol. Shockers with ion cannons.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 2958,
  },
  {
    id: 's1-praying-for-time',
    name: 'Praying for Time',
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
        enemies: [{ archetype: 'mantis', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3021,
  },
];
