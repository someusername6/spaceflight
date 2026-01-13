/**
 * Sector 5: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_HARD: Contract[] = [
  {
    id: 's5-wont-back-down',
    name: "Won't Back Down",
    description: 'Make your final stand. Four waves of ace fighters.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 9811,
  },
  {
    id: 's5-dont-stop-me-now',
    name: "Don't Stop Me Now",
    description: 'Destroy the armada. Ace Phantoms and Dragonflies.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 9811,
  },
  {
    id: 's5-the-end',
    name: 'The End',
    description: 'The ultimate challenge. Ace Phantoms with maximum force.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 10560,
  },
  {
    id: 's5-godzilla',
    name: 'Godzilla',
    description: 'Stop the titan. Heavy railgun striker with ace escorts.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'regular', count: 1 },
          { archetype: 'dragonfly', skill: 'ace', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 11187,
  },
  {
    id: 's5-ghost-town',
    name: 'Ghost Town',
    description: 'Hunt Wraith patrol. Nuclear lance carriers with ace escorts.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [
          { archetype: 'wraith', skill: 'ace', count: 1 },
          { archetype: 'phantom', skill: 'ace', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'wraith', skill: 'ace', count: 1 },
          { archetype: 'phantom', skill: 'ace', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 11977,
  },
];
