/**
 * Sector 5: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_EASY: Contract[] = [
  {
    id: 's5-wraith-scout',
    name: 'Wraith Scout',
    description: 'Intercept nuclear lance carrier. A Wraith with ace escorts.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wraith', skill: 'veteran', count: 1 }],
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
    reward: 8147,
  },
  {
    id: 's5-ace-formation',
    name: 'Ace Formation',
    description:
      'Destroy ace formation. Phantoms, Dragonflies, and Fireflies - ace pilots.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 8668,
  },
  {
    id: 's5-scorpion-nest',
    name: 'Scorpion Nest',
    description:
      'Clear sniper position. Scorpions with railguns and elite escorts.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'scorpion', skill: 'ace', count: 1 }],
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
    reward: 9818,
  },
  {
    id: 's5-no-mans-land',
    name: "No Man's Land",
    description:
      'Survive beyond the frontier. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
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
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 10127,
  },
  {
    id: 's5-meat-grinder',
    name: 'Meat Grinder',
    description:
      'Survive the grinder. Four waves of Ace Phantoms and Dragonflies.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
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
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 10127,
  },
];
