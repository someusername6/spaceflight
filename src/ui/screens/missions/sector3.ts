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
    description: 'Enemy staging area. Heavy defenses expected.',
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
    description: 'Missile-heavy scouts. Watch for cluster munitions.',
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
    description: 'Fast attack force. Phantom interceptors inbound.',
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
    description: 'Fortified sniper position. Approach with caution.',
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
    description: 'Cut enemy supply lines. Bombers with escort.',
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
    description: "Veteran squadron. These pilots know what they're doing.",
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
    description: 'Take out the enemy commander. Heavy escort present.',
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
    description: 'Full-scale attack. Titans and juggernauts incoming.',
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
