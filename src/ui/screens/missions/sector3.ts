/**
 * Sector 3: Warzone Missions
 * Enemy skill: Regular → Veteran → Ace
 * Rewards: 4,200-6,650 cr (computed via reward formula)
 *
 * Test loadout: 1x veteran interceptor, 1x regular interceptor, 2x regular defender
 *
 * Structure:
 * - Easy difficulty (60-80% win rate): ~4,200-5,100 cr
 * - Medium difficulty (40-60% win rate): ~5,400-6,000 cr
 * - Hard difficulty (20-40% win rate): ~6,600-6,650 cr
 */

import type { Contract } from '../../../campaign/types';

export const SECTOR_3_MISSIONS: Contract[] = [
  // --- Easy difficulty (60-80% win rate) ---
  {
    id: 's3-forward-base',
    name: 'Forward Base',
    description:
      'Destroy enemy formation. Veteran Fireflies and Dragonflies in five waves.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
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
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4200,
  },
  {
    id: 's3-cluster-swarm',
    name: 'Cluster Swarm',
    description:
      'Destroy Locust squadron. Cluster missiles incoming - watch your spacing.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'locust', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'locust', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4700,
  },
  {
    id: 's3-interceptor-wing',
    name: 'Interceptor Wing',
    description: 'Engage fast attack wing. Phantoms, Dragonflies, and Wasps.',
    difficulty: 'easy',
    sector: 3,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
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
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5100,
  },

  // --- Medium difficulty (40-60% win rate) ---
  {
    id: 's3-railgun-nest',
    name: 'Railgun Nest',
    description:
      'Eliminate sniper threat. Scorpions with Dragonfly and Firefly support.',
    difficulty: 'medium',
    sector: 3,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'scorpion', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'scorpion', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5400,
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
    reward: 5750,
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
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 6000,
  },

  // --- Hard difficulty (20-40% win rate) ---
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
    reward: 6600,
  },
  {
    id: 's3-heavy-assault',
    name: 'Heavy Assault',
    description:
      'Destroy assault force. Phantoms and a Titan with Ace Dragonfly escorts.',
    difficulty: 'hard',
    sector: 3,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'titan', skill: 'regular', count: 1 }],
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
    reward: 6650,
  },
];
