/**
 * Sector 1: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_HARD: Contract[] = [
  {
    id: 's1-medley-of-mayhem',
    name: 'Medley of Mayhem',
    description:
      'Destroy assault force. Embers and Shockers with Mantis commanders.',
    difficulty: 'hard',
    sector: 1,
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
    id: 's1-sniper-blues',
    name: 'Sniper Blues',
    description: 'Engage long-range patrol. Blue laser snipers at distance.',
    difficulty: 'hard',
    sector: 1,
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
    id: 's1-hunting-high-and-low',
    name: 'Hunting High and Low',
    description: 'Hunt raider squadron. Heavy resistance expected.',
    difficulty: 'hard',
    sector: 1,
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
    id: 's1-flight-of-the-bumblebee',
    name: 'Flight of the Bumblebee',
    description:
      'Destroy Hornet squadron. Plasma fighters with Wasp and Mantis support.',
    difficulty: 'hard',
    sector: 1,
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
    id: 's1-rainbow-in-the-dark',
    name: 'Rainbow in the Dark',
    description: 'Face all enemy types. Variety of hostiles incoming.',
    difficulty: 'hard',
    sector: 1,
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
    id: 's1-hold-the-line',
    name: 'Hold the Line',
    description: 'Hold the frontier. Wasps and Hornets in force.',
    difficulty: 'hard',
    sector: 1,
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
