/**
 * Sector 3: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_MEDIUM: Contract[] = [
  {
    id: 's3-heat-wave',
    name: 'Heat Wave',
    description:
      'Survive the inferno. Fireants and Beetles with heavy support.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5486,
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
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'ace', count: 3 }],
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
    reward: 5533,
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
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
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
        enemies: [{ archetype: 'wasp', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5694,
  },
  {
    id: 's3-supply-interdiction',
    name: 'Supply Interdiction',
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
    reward: 5729,
  },
  {
    id: 's3-rocketeer-assault',
    name: 'Rocketeer Assault',
    description:
      'Face heavy assault. Phantoms and Dragonflies with accelerating rounds.',
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
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5912,
  },
];
