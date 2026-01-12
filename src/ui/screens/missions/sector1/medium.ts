/**
 * Sector 1: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_MEDIUM: Contract[] = [
  {
    id: 's1-patrol-duty',
    name: 'Patrol Duty',
    description: 'Clear the sector. Mixed hostiles across multiple waves.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
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
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3407,
  },
  {
    id: 's1-plasma-storm',
    name: 'Plasma Storm',
    description: 'Face plasma barrage. Hornets and Mantis incoming.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3684,
  },
  {
    id: 's1-supply-raid',
    name: 'Supply Raid',
    description: 'Intercept enemy squadron. Shockers and Embers incoming.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
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
    reward: 3825,
  },
  {
    id: 's1-autocannon-alley',
    name: 'Autocannon Alley',
    description: 'Survive the gauntlet. Wasps with autocannons.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'green', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3935,
  },
  {
    id: 's1-debris-field',
    name: 'Debris Field',
    description: 'Eliminate scattered hostiles. Mixed patrol craft.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
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
    reward: 3988,
  },
];
