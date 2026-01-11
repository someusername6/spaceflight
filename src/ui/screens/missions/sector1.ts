/**
 * Sector 1: Frontier Missions
 * Enemy skill: Green → Rookie → Regular
 * Rewards: 2,500-4,500 cr (computed via reward formula)
 *
 * Test loadout: 4x Fighter, all regular skill (new player)
 *
 * Structure:
 * - Easy difficulty (60-80% win rate): ~2,500-2,700 cr
 * - Medium difficulty (40-60% win rate): ~3,700-3,900 cr
 * - Hard difficulty (20-40% win rate): ~4,000-4,600 cr
 */

import type { Contract } from '../../../campaign/types';

export const SECTOR_1_MISSIONS: Contract[] = [
  // --- Low Tier (1000-1500 cr) ---
  {
    id: 's1-ion-storm',
    name: 'Ion Storm',
    description:
      'Eliminate hostile patrol. Stingers with ion cannons disrupt shields.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 1 }],
        delay: [8, 12],
      },
    ],
    reward: 2500,
  },
  {
    id: 's1-first-contact',
    name: 'First Contact',
    description:
      'Destroy scout formation. Rookie Moths and Fireflies - good warmup.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'rookie', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 2650,
  },
  {
    id: 's1-armored-patrol',
    name: 'Armored Patrol',
    description:
      'Intercept enemy patrol. Moth escorts screening an armored Beetle.',
    difficulty: 'easy',
    sector: 1,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'rookie', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'rookie', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'moth', skill: 'regular', count: 2 },
          { archetype: 'beetle', skill: 'green', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 2650,
  },

  // --- Medium difficulty (40-60% win rate) ---
  {
    id: 's1-patrol-duty',
    name: 'Patrol Duty',
    description: 'Clear the sector. Multiple waves of laser-armed Fireflies.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3750,
  },
  {
    id: 's1-supply-raid',
    name: 'Supply Raid',
    description:
      'Intercept enemy squadron. Moths and Stingers - watch for ion disruption.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 3750,
  },
  {
    id: 's1-debris-field',
    name: 'Debris Field',
    description:
      'Eliminate scattered hostiles. Mixed Moths, Stingers, and Fireflies.',
    difficulty: 'medium',
    sector: 1,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 3850,
  },

  // --- Hard difficulty (20-40% win rate) ---
  {
    id: 's1-mining-claim',
    name: 'Mining Claim',
    description:
      'Destroy raider force. Moths and Fireflies with a Beetle in final wave.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [
          { archetype: 'firefly', skill: 'regular', count: 2 },
          { archetype: 'beetle', skill: 'green', count: 1 },
        ],
        delay: [8, 12],
      },
    ],
    reward: 4000,
  },
  {
    id: 's1-pirate-outpost',
    name: 'Pirate Outpost',
    description: 'Clear pirate squadron. Heavy waves of Moths and Fireflies.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4200,
  },
  {
    id: 's1-raider-hunt',
    name: 'Raider Hunt',
    description:
      'Hunt raider squadron. Stingers, Fireflies, and Moths across four waves.',
    difficulty: 'hard',
    sector: 1,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'moth', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'stinger', skill: 'regular', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 4600,
  },
];
