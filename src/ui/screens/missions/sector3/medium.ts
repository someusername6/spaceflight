/**
 * Sector 3: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_MEDIUM: Contract[] = [
  {
    id: 's3-mothership-connection',
    name: 'Mothership Connection',
    description:
      'Face lightning barrage. Moths with swarm missiles and lightning cannons.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 3 }],
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
    reward: 5011,
  },
  {
    id: 's3-crimson-tide',
    name: 'Crimson Tide',
    description:
      'Destroy enemy force. Heavy waves of veteran Fireflies and Dragonflies.',
    difficulty: 'medium',
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
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5235,
  },
  {
    id: 's3-hot-blooded',
    name: 'Hot Blooded',
    description:
      'Survive the inferno. Fireants with Phantom escorts closing fast.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5402,
  },
  {
    id: 's3-ghost-riders-in-the-sky',
    name: 'Ghost Riders in the Sky',
    description: 'Face heavy assault. Phantoms and Ace Dragonflies in force.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
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
    ],
    reward: 5488,
  },
  {
    id: 's3-aces-high',
    name: 'Aces High',
    description:
      'Face veteran squadron. Wasps and Dragonflies with skilled pilots.',
    difficulty: 'medium',
    sector: 3,
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [10, 15],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 2 }],
        delay: [10, 15],
      },
    ],
    reward: 5637,
  },
];
