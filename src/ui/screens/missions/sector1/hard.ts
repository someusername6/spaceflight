/**
 * Sector 1: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_HARD: Contract[] = [
  {
    id: 's1-mining-claim',
    name: 'Mining Claim',
    description: 'Destroy raider force. Mixed hostiles with Mantis commanders.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 2 }],
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
    reward: 4000,
  },
  {
    id: 's1-pirate-outpost',
    name: 'Pirate Outpost',
    description: 'Clear pirate squadron. Multiple waves of tough hostiles.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'hornet', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4100,
  },
  {
    id: 's1-raider-hunt',
    name: 'Raider Hunt',
    description: 'Hunt raider squadron. Heavy resistance expected.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4200,
  },
  {
    id: 's1-full-spectrum',
    name: 'Full Spectrum',
    description: 'Face all enemy types. Variety of hostiles incoming.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4400,
  },
  {
    id: 's1-frontier-siege',
    name: 'Frontier Siege',
    description: 'Hold the frontier. Wasps and Hornets in force.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4600,
  },
];
