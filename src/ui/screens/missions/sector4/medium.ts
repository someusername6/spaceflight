/**
 * Sector 4: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_4_MEDIUM: Contract[] = [
  {
    id: 's4-spooky',
    name: 'Spooky',
    description: 'Hunt Specters. Elite railgun snipers with Dragonfly support.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'specter', skill: 'veteran', count: 2 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'veteran', count: 2 },
          { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'ace', count: 2 },
          { archetype: 'dragonfly', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'ace', count: 2 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 3430,
  },
  {
    id: 's4-strike-a-pose',
    name: 'Strike a Pose',
    description:
      'Destroy strike force. Phantoms with Fireflies and Dragonflies.',
    difficulty: 'easy',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [4, 8],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [6, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [6, 10],
      },
    ],
    reward: 6333,
  },
  {
    id: 's4-b-52s',
    name: 'B-52s',
    description:
      'Intercept bomber wing. Behemoths with heavy ordnance inbound.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'regular', count: 1 },
          { archetype: 'firefly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
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
    reward: 6439,
  },
  {
    id: 's4-rock-you-like-a-hurricane',
    name: 'Rock You Like a Hurricane',
    description:
      'Clear sniper position. Scorpions and Sparklers lighting up the void.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'scorpion', skill: 'rookie', count: 1 },
          { archetype: 'sparkler', skill: 'rookie', count: 2 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'rookie', count: 1 },
          { archetype: 'sparkler', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'sparkler', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'sparkler', skill: 'rookie', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 6642,
  },
  {
    id: 's4-brothers-in-arms',
    name: 'Brothers in Arms',
    description: 'Face pilots. Phantoms, Wasps, and Dragonflies together.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
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
    reward: 7027,
  },
];
