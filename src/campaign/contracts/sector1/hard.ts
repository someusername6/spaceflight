/**
 * Sector 1: Hard Missions (60-70% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_1_HARD: Contract[] = [
  {
    id: 's1-rainbow-in-the-dark',
    name: 'Rainbow in the Dark',
    description: 'Face all enemy types. Glowworms, Mantis, Wasps, and Hornets.',
    difficulty: 'hard',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'glowworm', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3538,
  },
  {
    id: 's1-sniper-blues',
    name: 'Sniper Blues',
    description: 'Engage long-range patrol. Blue laser snipers at distance.',
    difficulty: 'hard',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'glowworm', skill: 'regular', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 5 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'glowworm', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'regular', count: 6 }],
        delay: [8, 12],
      },
    ],
    reward: 3581,
  },
  {
    id: 's1-medley-of-mayhem',
    name: 'Medley of Mayhem',
    description:
      'Destroy assault force. Embers and Shockers with Mantis commanders.',
    difficulty: 'hard',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'ember', skill: 'regular', count: 4 }],
        delay: [5, 8],
      },
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 4 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 4 }],
        delay: [6, 10],
      },
    ],
    reward: 3586,
  },
  {
    id: 's1-hunting-high-and-low',
    name: 'Hunting High and Low',
    description: 'Hunt raider squadron. Heavy resistance expected.',
    difficulty: 'hard',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'ember', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3719,
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
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3949,
  },
  {
    id: 's1-flight-of-the-bumblebee',
    name: 'Flight of the Bumblebee',
    description: 'Destroy Hornet squadron. Plasma fighters with support.',
    difficulty: 'hard',
    sector: 1,
    waves: [
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'hornet', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'mantis', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4029,
  },
];
