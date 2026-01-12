/**
 * Sector 1: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_HARD: Contract[] = [
  {
    id: 's1-mixed-assault',
    name: 'Mixed Assault',
    description:
      'Destroy assault force. Embers and Shockers with Mantis commanders.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
        delay: [5, 8],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'veteran', count: 2 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'regular', count: 2 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'veteran', count: 2 }],
        delay: [6, 10],
      },
    ],
    reward: 4291,
  },
  {
    id: 's1-sniper-alley',
    name: 'Sniper Alley',
    description: 'Engage long-range patrol. Blue laser snipers at distance.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [
          { archetype: 'glowworm', skill: 'veteran', count: 3 },
          { archetype: 'shocker', skill: 'regular', count: 4 },
        ],
        delay: [5, 10],
      },
    ],
    reward: 4409,
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
    reward: 4466,
  },
  {
    id: 's1-hornet-sweep',
    name: 'Hornet Sweep',
    description:
      'Destroy Hornet squadron. Plasma fighters with Wasp and Mantis support.',
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
    reward: 4477,
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
    reward: 4534,
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
    reward: 4551,
  },
];
