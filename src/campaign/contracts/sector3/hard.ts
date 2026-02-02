/**
 * Sector 3: Hard Missions (60-70% win rate)
 */

import type { Contract } from '../types';

export const SECTOR_3_HARD: Contract[] = [
  {
    id: 's3-hammer-to-fall',
    name: 'Hammer to Fall',
    description:
      'Destroy assault force. Phantoms, Beetles, and Dragonfly escorts.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 2 }],
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
    reward: 5079,
  },
  {
    id: 's3-break-on-through',
    name: 'Break on Through',
    description: 'Break through enemy lines. Fireants and Phantoms defend.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'ace', count: 5 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
    ],
    reward: 5319,
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
    reward: 5590,
  },
  {
    id: 's3-riders-on-the-storm',
    name: 'Riders on the Storm',
    description: 'Weather the storm. Ace Moths with lightning cannons.',
    difficulty: 'hard',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 6 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 6 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 8 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 6 }],
        delay: [8, 12],
      },
    ],
    reward: 5806,
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
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'beetle', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6124,
  },
];
