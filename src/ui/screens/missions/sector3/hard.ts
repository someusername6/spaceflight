/**
 * Sector 3: Hard Missions (20-40% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_HARD: Contract[] = [
  {
    id: 's3-riders-on-the-storm',
    name: 'Riders on the Storm',
    description: 'Survive the storm. Ace Moths with lightning cannons.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 6 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 6 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 6 }],
        delay: [8, 12],
      },
    ],
    reward: 5037,
  },
  {
    id: 's3-das-boot',
    name: 'Das Boot',
    description: 'Heavy ordnance incoming. Beetles with torpedo launchers.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5425,
  },
  {
    id: 's3-hammer-to-fall',
    name: 'Hammer to Fall',
    description:
      'Destroy assault force. Phantoms, Beetles, and Dragonfly escorts.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 1 }],
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
    reward: 5529,
  },
  {
    id: 's3-break-on-through',
    name: 'Break on Through',
    description: 'Break through enemy lines. Elite assault force.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5543,
  },
  {
    id: 's3-the-final-countdown',
    name: 'The Final Countdown',
    description: 'Maximum enemy resistance. Ace pilots across all waves.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
    ],
    reward: 6087,
  },
];
