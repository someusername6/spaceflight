/**
 * Contract/Mission Definitions - Wave-based enemy compositions.
 *
 * Each contract defines waves of enemies with skill levels and spawn delays.
 * Waves spawn when the previous wave is cleared.
 *
 * Balance targets:
 * - Victory time: 90s+ average
 * - Survival rate: 20-90%
 *
 * Difficulty thresholds (survival rate):
 * - Easy: 70-90%
 * - Medium: 40-70%
 * - Hard: 20-40%
 *
 * Reward formula: expected_replacement_cost - expected_salvage + 1000, rounded to 500
 *
 * Missions are sorted by reward (ascending).
 */

import type { Contract } from '../../campaign/types';

/**
 * Generate contracts with wave-based enemy spawning.
 * All missions are combat-focused - eliminate all hostile ships.
 */
export function generateContracts(_sector: number): Contract[] {
  return [
    // === Easy missions (70-90% survival, 90s+) ===
    {
      id: 'ion-storm',
      name: 'Ion Storm',
      description:
        'Shield disruptors ahead. Ion cannons suppress shield regen.',
      difficulty: 'easy',
      waves: [
        {
          enemies: [{ archetype: 'stinger', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'moth', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'stinger', skill: 'green', count: 1 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'stinger', skill: 'green', count: 1 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'stinger', skill: 'rookie', count: 1 }],
          delay: [8, 12],
        },
      ],
      reward: 1000,
    },
    {
      id: 'armored-patrol',
      name: 'Armored Patrol',
      description: 'Heavy enemy formation. Defender-class with moth escorts.',
      difficulty: 'easy',
      waves: [
        {
          enemies: [{ archetype: 'moth', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'moth', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'beetle', skill: 'green', count: 1 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'moth', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'moth', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 1500,
    },
    {
      id: 'patrol-1',
      name: 'Patrol Duty',
      description: 'Clear hostiles from the shipping lanes.',
      difficulty: 'easy',
      waves: [
        {
          enemies: [{ archetype: 'firefly', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'rookie', count: 1 }],
          delay: [8, 12],
        },
      ],
      reward: 2000,
    },

    // === Medium missions (40-70% survival, 90s+) ===
    {
      id: 'sniper-ambush',
      name: 'Sniper Ambush',
      description: 'Long-range threat. Railgun raiders with support.',
      difficulty: 'medium',
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 1 },
            { archetype: 'scorpion', skill: 'ace', count: 1 },
          ],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 1 },
            { archetype: 'scorpion', skill: 'ace', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 1 },
            { archetype: 'scorpion', skill: 'ace', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 3500,
    },
    {
      id: 'torch-run',
      name: 'Torch Run',
      description: 'Close-range heat weapons. Fireants overheat your systems.',
      difficulty: 'medium',
      waves: [
        {
          enemies: [{ archetype: 'wasp', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'fireant', skill: 'veteran', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 4000,
    },

    // === Hard missions (20-40% survival, 90s+) ===
    {
      id: 'laser-gauntlet',
      name: 'Laser Gauntlet',
      description: 'Beam weapons everywhere. Lasers cut through shields.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'firefly', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'viper', skill: 'rookie', count: 1 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'viper', skill: 'veteran', count: 1 }],
          delay: [8, 12],
        },
      ],
      reward: 4500,
    },
    {
      id: 'wasp-nest',
      name: 'Wasp Nest',
      description:
        'Eliminate scout squadron. Fast ships with ballistic weapons.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'wasp', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 4500,
    },
    {
      id: 'cluster-swarm',
      name: 'Cluster Swarm',
      description: 'Missile-heavy scouts. Watch for cluster munitions.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'locust', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'locust', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'locust', skill: 'veteran', count: 3 }],
          delay: [8, 12],
        },
      ],
      reward: 5000,
    },
  ];
}
