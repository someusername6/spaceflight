/**
 * Sector 4: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_MEDIUM: Contract[] = [
  {
    id: 's4-behemoth-approach',
    name: 'Behemoth Approach',
    description: 'Intercept bomber wing. Behemoth with heavy ordnance inbound.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
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
        enemies: [{ archetype: 'behemoth', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 7211,
  },
  {
    id: 's4-veteran-squadron',
    name: 'Veteran Squadron',
    description:
      'Face elite pilots. Phantoms, Wasps, and Dragonflies - all veteran.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 7509,
  },
  {
    id: 's4-specter-hunt',
    name: 'Specter Hunt',
    description:
      'Hunt Specters. Elite railgun snipers with Dragonfly and Phantom escort.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'specter', skill: 'regular', count: 1 }],
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
    reward: 7976,
  },
  {
    id: 's4-elite-strike',
    name: 'Elite Strike',
    description:
      'Destroy elite strike force. Phantoms with Ace Fireflies and veteran Dragonflies.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 8399,
  },
  {
    id: 's4-scorpion-nest',
    name: 'Scorpion Nest',
    description:
      'Clear sniper position. Scorpions with railguns and Phantom escorts.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
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
    reward: 8490,
  },
];
