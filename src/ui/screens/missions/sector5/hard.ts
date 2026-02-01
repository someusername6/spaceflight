/**
 * Sector 5: Hard Missions (60-70% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_5_HARD: Contract[] = [
  {
    id: 's5-godzilla',
    name: 'Godzilla',
    description: 'Stop the titan. Heavy railgun striker with ace escorts.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'regular', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
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
    reward: 10466,
  },
  {
    id: 's5-the-end',
    name: 'The End',
    description: 'The ultimate challenge. Ace Phantoms with maximum force.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [
          { archetype: 'phantom', skill: 'veteran', count: 2 },
          { archetype: 'phantom', skill: 'ace', count: 1 },
        ],
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
    reward: 10898,
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
          { archetype: 'wraith', skill: 'veteran', count: 1 },
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
          { archetype: 'phantom', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 11901,
  },
  {
    id: 's5-wont-back-down',
    name: "Won't Back Down",
    description:
      'Make your final stand. Ace Beetles with plasma and torpedoes.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'beetle', skill: 'ace', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
    ],
    reward: 12392,
  },
  {
    id: 's5-dont-stop-me-now',
    name: "Don't Stop Me Now",
    description:
      'Light up the fireworks. Ace Sparklers with flak and starbursts.',
    difficulty: 'hard',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'sparkler', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'sparkler', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 12811,
  },
];
