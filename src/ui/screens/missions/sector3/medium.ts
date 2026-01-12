/**
 * Sector 3: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_MEDIUM: Contract[] = [
  {
    id: 's3-heat-wave',
    name: 'Heat Wave',
    description:
      'Survive the inferno. Fireants with Phantom escorts closing fast.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
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
    reward: 4875,
  },
  {
    id: 's3-moth-swarm',
    name: 'Moth Swarm',
    description:
      'Face lightning barrage. Moths with swarm missiles and lightning cannons.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 4 }],
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
    reward: 5004,
  },
  {
    id: 's3-red-wave',
    name: 'Red Wave',
    description:
      'Destroy enemy force. Heavy waves of veteran Fireflies and Dragonflies.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
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
    reward: 5588,
  },
  {
    id: 's3-phantom-assault',
    name: 'Phantom Assault',
    description: 'Face heavy assault. Phantoms and Ace Dragonflies in force.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
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
    reward: 5614,
  },
  {
    id: 's3-elite-patrol',
    name: 'Elite Patrol',
    description:
      'Face veteran squadron. Wasps and Dragonflies with skilled pilots.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
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
    reward: 6130,
  },
];
