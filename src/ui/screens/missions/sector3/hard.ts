/**
 * Sector 3: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_HARD: Contract[] = [
  {
    id: 's3-command-ship',
    name: 'Command Ship',
    description:
      'Destroy enemy squadron. Fireflies, Dragonflies, and Phantoms in force.',
    difficulty: 'hard',
    sector: 3,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
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
    reward: 6200,
  },
  {
    id: 's3-heavy-assault',
    name: 'Heavy Assault',
    description:
      'Destroy assault force. Phantoms and Beetles with Ace Dragonfly escorts.',
    difficulty: 'hard',
    sector: 3,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'regular', count: 1 }],
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
    reward: 6350,
  },
  {
    id: 's3-storm-front',
    name: 'Storm Front',
    description: 'Survive the storm. Phantoms and Wasps with Ace pilots.',
    difficulty: 'hard',
    sector: 3,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6450,
  },
  {
    id: 's3-warzone-breach',
    name: 'Warzone Breach',
    description: 'Break through enemy lines. Elite assault force.',
    difficulty: 'hard',
    sector: 3,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 6550,
  },
  {
    id: 's3-final-push',
    name: 'Final Push',
    description: 'Maximum enemy resistance. Ace pilots across all waves.',
    difficulty: 'hard',
    sector: 3,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6700,
  },
];
