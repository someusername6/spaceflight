/**
 * Sector 2: Medium Missions (40-60% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_MEDIUM: Contract[] = [
  {
    id: 's2-flak-screen',
    name: 'Flak Screen',
    description:
      'Breach the flak screen. Shredders with flak cannons and Phantom escorts.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'shredder', skill: 'veteran', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3971,
  },
  {
    id: 's2-heavy-metal',
    name: 'Heavy Metal',
    description: 'Destroy heavy fighters. Bruisers with slug cannons leading.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'bruiser', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'bruiser', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4218,
  },
  {
    id: 's2-reinforced-patrol',
    name: 'Reinforced Patrol',
    description:
      'Destroy reinforced patrol. Veteran Fireflies and Dragonflies in numbers.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4552,
  },
  {
    id: 's2-phantom-strike',
    name: 'Phantom Strike',
    description:
      'Face elite interceptors. Phantoms with green lasers and dart missiles.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 4761,
  },
  {
    id: 's2-viper-nest',
    name: 'Viper Nest',
    description: 'Clear Viper squadron. Green laser fighters with long range.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4789,
  },
];
