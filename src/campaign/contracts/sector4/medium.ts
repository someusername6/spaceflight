/**
 * Sector 4: Medium Missions (70-80% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_4_MEDIUM: Contract[] = [
  {
    id: 's4-atomic',
    name: 'Atomic',
    description:
      'Nuclear threat detected. Juggernauts with nuke payloads inbound.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'juggernaut', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'juggernaut', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
    ],
    reward: 5360,
  },
  {
    id: 's4-spooky',
    name: 'Spooky',
    description: 'Hunt Specters. Elite railgun snipers with Dragonfly support.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'specter', skill: 'regular', count: 2 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'regular', count: 1 },
          { archetype: 'specter', skill: 'veteran', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'veteran', count: 2 },
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'specter', skill: 'veteran', count: 2 },
          { archetype: 'phantom', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 5399,
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
        enemies: [
          { archetype: 'wasp', skill: 'regular', count: 1 },
          { archetype: 'wasp', skill: 'veteran', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'dragonfly', skill: 'regular', count: 1 },
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
    ],
    reward: 5448,
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
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'regular', count: 1 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
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
          { archetype: 'behemoth', skill: 'regular', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 5642,
  },
  {
    id: 's4-clash-of-the-titans',
    name: 'Clash of the Titans',
    description: 'Intercept heavy assault. Titans with Phantom escorts.',
    difficulty: 'medium',
    sector: 4,
    waves: [
      {
        enemies: [
          { archetype: 'titan', skill: 'rookie', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 2 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'rookie', count: 1 },
          { archetype: 'firefly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'rookie', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'titan', skill: 'regular', count: 1 },
          { archetype: 'phantom', skill: 'rookie', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 6871,
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
          { archetype: 'scorpion', skill: 'rookie', count: 1 },
          { archetype: 'sparkler', skill: 'rookie', count: 1 },
          { archetype: 'sparkler', skill: 'regular', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'scorpion', skill: 'regular', count: 1 },
          { archetype: 'sparkler', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 7905,
  },
];
