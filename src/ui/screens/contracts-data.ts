/**
 * Contract/Mission Definitions - Wave-based enemy compositions.
 *
 * Each contract defines waves of enemies with skill levels and spawn delays.
 * Waves spawn when the previous wave is cleared.
 */

import type { Contract } from '../../campaign/types';

/**
 * Generate contracts with wave-based enemy spawning.
 * All missions are combat-focused - eliminate all hostile ships.
 */
export function generateContracts(_sector: number): Contract[] {
  return [
    // === EASY MISSIONS ===
    {
      id: 'patrol-1',
      name: 'Patrol Duty',
      description: 'Clear hostiles from the shipping lanes.',
      difficulty: 'easy',
      waves: [
        {
          enemies: [{ archetype: 'dragonfly', skill: 'green', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'green', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'green', count: 1 },
            { archetype: 'firefly', skill: 'green', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 2000,
    },

    // === MEDIUM MISSIONS ===
    {
      id: 'wasp-nest',
      name: 'Wasp Nest',
      description:
        'Eliminate scout squadron. Fast ships with ballistic weapons.',
      difficulty: 'medium',
      waves: [
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'wasp', skill: 'regular', count: 1 },
            { archetype: 'hornet', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'hornet', skill: 'regular', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 3500,
    },
    {
      id: 'ion-storm',
      name: 'Ion Storm',
      description:
        'Shield disruptors ahead. Ion cannons suppress shield regen.',
      difficulty: 'medium',
      waves: [
        {
          enemies: [{ archetype: 'stinger', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'stinger', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'regular', count: 1 },
            { archetype: 'dragonfly', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 3500,
    },
    {
      id: 'cluster-swarm',
      name: 'Cluster Swarm',
      description: 'Missile-heavy scouts. Watch for cluster munitions.',
      difficulty: 'medium',
      waves: [
        {
          enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'locust', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'regular', count: 2 },
            { archetype: 'wasp', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 3500,
    },

    // === HARD MISSIONS ===
    {
      id: 'armored-patrol',
      name: 'Armored Patrol',
      description: 'Heavy enemy formation. Defender-class with moth escorts.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'moth', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'moth', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'beetle', skill: 'regular', count: 1 },
            { archetype: 'moth', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 6000,
    },
    {
      id: 'sniper-ambush',
      name: 'Sniper Ambush',
      description: 'Long-range threat. Railgun raider with wasp support.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'regular', count: 1 },
            { archetype: 'wasp', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'hornet', skill: 'regular', count: 1 },
            { archetype: 'wasp', skill: 'regular', count: 1 },
          ],
          delay: [8, 12],
        },
      ],
      reward: 6000,
    },
    {
      id: 'torch-run',
      name: 'Torch Run',
      description: 'Close-range heat weapons. Fireants overheat your systems.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'fireant', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'fireant', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'fireant', skill: 'regular', count: 2 },
            { archetype: 'moth', skill: 'rookie', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'fireant', skill: 'regular', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 6000,
    },
    {
      id: 'laser-gauntlet',
      name: 'Laser Gauntlet',
      description: 'Beam weapons everywhere. Vipers with green lasers.',
      difficulty: 'hard',
      waves: [
        {
          enemies: [{ archetype: 'firefly', skill: 'rookie', count: 2 }],
          delay: [5, 10],
        },
        {
          enemies: [{ archetype: 'viper', skill: 'rookie', count: 2 }],
          delay: [8, 12],
        },
        {
          enemies: [
            { archetype: 'viper', skill: 'regular', count: 1 },
            { archetype: 'firefly', skill: 'regular', count: 1 },
          ],
          delay: [8, 12],
        },
        {
          enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
          delay: [8, 12],
        },
      ],
      reward: 6000,
    },
  ];
}
