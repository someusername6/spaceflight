/**
 * Sector 4: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_MEDIUM: Contract[] = [
  {
    id: 's4-b-52s',
    name: 'B-52s',
    description: 'Intercept bomber wing. Behemoth with heavy ordnance inbound.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'ace', count: 2 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 7391,
  },
  {
    id: 's4-spooky',
    name: 'Spooky',
    description:
      'Hunt Specters. Elite railgun snipers with Dragonfly and Phantom escort.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'specter', skill: 'veteran', count: 1 }],
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
    reward: 7586,
  },
  {
    id: 's4-brothers-in-arms',
    name: 'Brothers in Arms',
    description:
      'Face elite pilots. Phantoms, Wasps, and Dragonflies - all veteran.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [3, 6],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [4, 7],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [4, 7],
      },
    ],
    reward: 7590,
  },
  {
    id: 's4-strike-a-pose',
    name: 'Strike a Pose',
    description:
      'Destroy elite strike force. Phantoms with Ace Fireflies and veteran Dragonflies.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [4, 8],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [6, 10],
      },
    ],
    reward: 8333,
  },
  {
    id: 's4-rock-you-like-a-hurricane',
    name: 'Rock You Like a Hurricane',
    description:
      'Clear sniper position. Scorpions with railguns and Phantom escorts.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'scorpion', skill: 'regular', count: 1 }],
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
    reward: 8432,
  },
];
