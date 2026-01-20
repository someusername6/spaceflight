/**
 * Sector 5: Medium Missions (70-80% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_5_MEDIUM: Contract[] = [
  {
    id: 's5-every-breath-you-take',
    name: 'Every Breath You Take',
    description: 'Destroy sniper formation. Specters with ace escorts.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'specter', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'specter', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5634,
  },
  {
    id: 's5-flight-of-the-valkyries',
    name: 'Flight of the Valkyries',
    description: 'Destroy bomber wing. Behemoths with Phantom escorts.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [
          { archetype: 'phantom', skill: 'veteran', count: 1 },
          { archetype: 'phantom', skill: 'ace', count: 2 },
        ],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'behemoth', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'phantom', skill: 'veteran', count: 1 },
          { archetype: 'phantom', skill: 'ace', count: 1 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'ace', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 3 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 5879,
  },
  {
    id: 's5-nuclear-express',
    name: 'Nuclear Express',
    description:
      'Intercept nuclear convoy. Juggernauts with nuke payloads and ace escorts.',
    difficulty: 'medium',
    sector: 5,
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
          { archetype: 'juggernaut', skill: 'veteran', count: 1 },
          { archetype: 'dragonfly', skill: 'regular', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'juggernaut', skill: 'veteran', count: 1 },
          { archetype: 'phantom', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'juggernaut', skill: 'veteran', count: 1 },
          { archetype: 'dragonfly', skill: 'veteran', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 6824,
  },
  {
    id: 's5-another-brick-in-the-wall',
    name: 'Another Brick in the Wall',
    description:
      'Break the iron wall. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [
          { archetype: 'phantom', skill: 'veteran', count: 1 },
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
    reward: 7958,
  },
];
