/**
 * Sector 2: Contested Zone Missions
 * Enemy skill: Rookie → Regular → Veteran
 * Rewards: 3,200-5,800 cr (computed via reward formula)
 *
 * Test loadout: 1x veteran fighter, 1x regular fighter, 1x regular interceptor, 1x regular defender
 *
 * Structure:
 * - Easy difficulty (60-80% win rate): ~3,200-3,750 cr
 * - Medium difficulty (40-60% win rate): ~4,400-4,600 cr
 * - Hard difficulty (20-40% win rate): ~5,150-5,800 cr
 */

import type { Contract } from '../../../campaign/types';

export const SECTOR_2_MISSIONS: Contract[] = [
  // --- Easy difficulty (60-80% win rate) ---
  {
    id: 's2-fuel-depot',
    name: 'Fuel Depot',
    description:
      'Clear the sector. Dragonflies, Moths, and Stingers across four waves.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3200,
  },
  {
    id: 's2-convoy-escort',
    name: 'Raider Intercept',
    description:
      'Intercept raider force. Moths and Wasps with Stinger support.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3600,
  },
  {
    id: 's2-border-skirmish',
    name: 'Border Skirmish',
    description: 'Engage in contested space. Fireflies, Moths, and Stingers.',
    difficulty: 'easy',
    sector: 2,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
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
    reward: 3750,
  },

  // --- Medium difficulty (40-60% win rate) ---
  {
    id: 's2-sniper-ambush',
    name: 'Sniper Ambush',
    description:
      'Eliminate sniper force. Ace Scorpions with Dragonfly escorts.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
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
    reward: 4400,
  },
  {
    id: 's2-comm-relay',
    name: 'Comm Relay',
    description:
      'Destroy reinforced patrol. Veteran Moths and Fireflies in numbers.',
    difficulty: 'medium',
    sector: 2,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4600,
  },

  // --- Hard difficulty (20-40% win rate) ---
  {
    id: 's2-torch-run',
    name: 'Torch Run',
    description:
      'Survive the heat. Fireflies and Vipers closing fast with flamers.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5200,
  },
  {
    id: 's2-laser-gauntlet',
    name: 'Laser Gauntlet',
    description:
      'Face the beam gauntlet. Veteran Fireflies and Vipers with lasers.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'viper', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5550,
  },
  {
    id: 's2-wasp-nest',
    name: 'Wasp Nest',
    description: 'Destroy Wasp squadron. Fast interceptors with autocannons.',
    difficulty: 'hard',
    sector: 2,
    tier: 'high',
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
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 5800,
  },
];
