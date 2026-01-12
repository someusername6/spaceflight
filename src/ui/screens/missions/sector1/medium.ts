/**
 * Sector 1: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_MEDIUM: Contract[] = [
  {
    id: 's1-another-day-in-paradise',
    name: 'Another Day in Paradise',
    description: 'Clear the sector. Mixed hostiles across multiple waves.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [5, 8],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'veteran', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [6, 10],
      },
    ],
    reward: 3499,
  },
  {
    id: 's1-toys-in-the-void',
    name: 'Toys in the Void',
    description: 'Eliminate scattered hostiles. Mixed patrol craft.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [5, 8],
      },
      {
        enemies: [{ archetype: 'gnat', skill: 'veteran', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [6, 10],
      },
    ],
    reward: 3499,
  },
  {
    id: 's1-purple-rain',
    name: 'Purple Rain',
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
    id: 's1-take-the-money-and-run',
    name: 'Take the Money and Run',
    description: 'Intercept enemy squadron. Shockers and Embers incoming.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3743,
  },
  {
    id: 's1-lead-serenade',
    name: 'Lead Serenade',
    description: 'Survive the gauntlet. Wasps with autocannons.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
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
    reward: 3960,
  },
];
