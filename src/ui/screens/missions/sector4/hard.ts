/**
 * Sector 4: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_HARD: Contract[] = [
  {
    id: 's4-heart-of-the-matter',
    name: 'Heart of the Matter',
    description: 'Final core assault. All S4 elite archetypes in force.',
    difficulty: 'hard',
    sector: 4,
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
    reward: 8728,
  },
  {
    id: 's4-ace-of-spades',
    name: 'Ace of Spades',
    description:
      'Face heavy assault. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'hard',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 4 }],
        delay: [3, 6],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 5 }],
        delay: [4, 7],
      },
    ],
    reward: 9229,
  },
  {
    id: 's4-balls-to-the-wall',
    name: 'Balls to the Wall',
    description:
      'Destroy ace squadron. Phantoms and Dragonflies at maximum skill.',
    difficulty: 'hard',
    sector: 4,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 4 }],
        delay: [3, 6],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 5 }],
        delay: [4, 7],
      },
    ],
    reward: 9229,
  },
  {
    id: 's4-master-of-puppets',
    name: 'Master of Puppets',
    description:
      'Eliminate the warlord. Ace Phantoms and Dragonflies - no mercy.',
    difficulty: 'hard',
    sector: 4,
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
    reward: 9361,
  },
  {
    id: 's4-radioactive',
    name: 'Radioactive',
    description:
      'Stop nuclear assault. Juggernaut and Behemoth with nuke payloads.',
    difficulty: 'hard',
    sector: 4,
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
    reward: 9667,
  },
];
