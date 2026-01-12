/**
 * Sector 5: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_MEDIUM: Contract[] = [
  {
    id: 's5-nuclear-convoy',
    name: 'Nuclear Convoy',
    description:
      'Intercept nuclear convoy. Juggernaut with nuke payload and elite escorts.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'juggernaut', skill: 'ace', count: 1 }],
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
    reward: 10930,
  },
  {
    id: 's5-iron-wall',
    name: 'Iron Wall',
    description:
      'Break the iron wall. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
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
    reward: 11117,
  },
  {
    id: 's5-bomber-wing',
    name: 'Bomber Wing',
    description: 'Destroy bomber wing. Behemoths with Phantom escorts.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'elite', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'behemoth', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'elite', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 11271,
  },
  {
    id: 's5-specter-formation',
    name: 'Specter Formation',
    description: 'Destroy sniper formation. Specter with ace escorts.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'specter', skill: 'ace', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
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
    reward: 11868,
  },
];
