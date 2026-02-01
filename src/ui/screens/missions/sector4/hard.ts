/**
 * Sector 4: Hard Missions (60-70% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_4_HARD: Contract[] = [
  {
    id: 's4-heart-of-the-matter',
    name: 'Heart of the Matter',
    description: 'Final core assault. An Ace Specter leads the charge.',
    difficulty: 'hard',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'dragonfly', skill: 'regular', count: 3 },
          { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'phantom', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'veteran', count: 1 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 5377,
  },
  {
    id: 's4-ace-of-spades',
    name: 'Ace of Spades',
    description: 'Face heavy assault. Phantoms and Dragonflies.',
    difficulty: 'hard',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'phantom', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 6840,
  },
  {
    id: 's4-radioactive',
    name: 'Radioactive',
    description:
      'Stop nuclear assault. Juggernauts and Behemoths with nuke payloads.',
    difficulty: 'hard',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'juggernaut', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'regular', count: 2 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'regular', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'juggernaut', skill: 'veteran', count: 1 },
          { archetype: 'inferno', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'veteran', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 7592,
  },
  {
    id: 's4-master-of-puppets',
    name: 'Master of Puppets',
    description:
      'Eliminate the warlord. Infernos with Phantom escorts - heat incoming.',
    difficulty: 'hard',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'phantom', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'veteran', count: 3 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'inferno', skill: 'ace', count: 2 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 7863,
  },
];
