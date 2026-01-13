/**
 * Sector 5: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_MEDIUM: Contract[] = [
  {
    id: 's5-another-brick-in-the-wall',
    name: 'Another Brick in the Wall',
    description:
      'Break the iron wall. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
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
    reward: 7949,
  },
  {
    id: 's5-every-breath-you-take',
    name: 'Every Breath You Take',
    description: 'Destroy sniper formation. Specters with ace escorts.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'specter', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'specter', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 7981,
  },
  {
    id: 's5-flight-of-the-valkyries',
    name: 'Flight of the Valkyries',
    description: 'Destroy bomber wing. Behemoths with Phantom escorts.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'behemoth', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'behemoth', skill: 'ace', count: 1 },
          { archetype: 'dragonfly', skill: 'ace', count: 2 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 8117,
  },
  {
    id: 's5-convoy',
    name: 'Convoy',
    description:
      'Intercept nuclear convoy. Juggernaut with nuke payload and ace escorts.',
    difficulty: 'medium',
    sector: 5,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'juggernaut', skill: 'veteran', count: 1 }],
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
    reward: 9200,
  },
];
