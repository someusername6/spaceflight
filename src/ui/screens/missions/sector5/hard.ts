/**
 * Sector 5: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_HARD: Contract[] = [
  {
    id: 's5-dont-stop-me-now',
    name: "Don't Stop Me Now",
    description: 'Destroy the armada. Elite Phantoms and Dragonflies.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 12543,
  },
  {
    id: 's5-the-end',
    name: 'The End',
    description: 'The ultimate challenge. Ace Phantoms with maximum force.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 12787,
  },
  {
    id: 's5-godzilla',
    name: 'Godzilla',
    description: 'Stop the titan. Heavy railgun striker with elite escorts.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'titan', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 12874,
  },
  {
    id: 's5-wont-back-down',
    name: "Won't Back Down",
    description: 'Make your final stand. Four waves of elite fighters.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 12942,
  },
  {
    id: 's5-ghost-town',
    name: 'Ghost Town',
    description:
      'Hunt Wraith patrol. Nuclear lance carriers with elite escorts.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 13015,
  },
  {
    id: 's5-black-magic-woman',
    name: 'Black Magic Woman',
    description: 'Stop nuclear assault. Multiple Wraiths with elite support.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wraith', skill: 'elite', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 13015,
  },
];
