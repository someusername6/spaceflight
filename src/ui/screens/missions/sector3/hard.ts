/**
 * Sector 3: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_HARD: Contract[] = [
  {
    id: 's3-the-final-countdown',
    name: 'The Final Countdown',
    description: 'Maximum enemy resistance. Ace pilots across all waves.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6122,
  },
  {
    id: 's3-hammer-to-fall',
    name: 'Hammer to Fall',
    description:
      'Destroy assault force. Phantoms and Beetles with Ace Dragonfly escorts.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'regular', count: 1 }],
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
    reward: 6257,
  },
  {
    id: 's3-three-dog-night',
    name: 'Three Dog Night',
    description:
      'Destroy enemy squadron. Fireflies, Dragonflies, and Phantoms in force.',
    difficulty: 'hard',
    sector: 3,
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
    reward: 6431,
  },
  {
    id: 's3-riders-on-the-storm',
    name: 'Riders on the Storm',
    description: 'Survive the storm. Phantoms and Wasps with Ace pilots.',
    difficulty: 'hard',
    sector: 3,
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
    reward: 6722,
  },
  {
    id: 's3-break-on-through',
    name: 'Break on Through',
    description: 'Break through enemy lines. Elite assault force.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 6805,
  },
];
