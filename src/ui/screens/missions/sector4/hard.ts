/**
 * Sector 4: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_HARD: Contract[] = [
  {
    id: 's4-core-breach',
    name: 'Core Breach',
    description: 'Final core assault. All S4 elite archetypes in force.',
    difficulty: 'hard',
    sector: 4,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'specter', skill: 'ace', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'titan', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'scorpion', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'juggernaut', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
    ],
    reward: 8858,
  },
  {
    id: 's4-warlord',
    name: 'Warlord',
    description:
      'Eliminate the warlord. Ace Phantoms and Dragonflies - no mercy.',
    difficulty: 'hard',
    sector: 4,
    tier: 'high',
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
    ],
    reward: 9039,
  },
  {
    id: 's4-nuclear-strike',
    name: 'Nuclear Strike',
    description:
      'Stop nuclear assault. Juggernaut and Behemoth with nuke payloads.',
    difficulty: 'hard',
    sector: 4,
    tier: 'high',
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
        enemies: [{ archetype: 'behemoth', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 9304,
  },
  {
    id: 's4-ace-assault',
    name: 'Ace Assault',
    description:
      'Face heavy assault. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'hard',
    sector: 4,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
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
    reward: 9409,
  },
  {
    id: 's4-maximum-force',
    name: 'Maximum Force',
    description:
      'Destroy ace squadron. Phantoms and Dragonflies at maximum skill.',
    difficulty: 'hard',
    sector: 4,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
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
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 9411,
  },
];
