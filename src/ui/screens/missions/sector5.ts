/**
 * Sector 5: Endless Mode Missions
 * Enemy skill: Veteran → Ace
 * Rewards: 8,350-13,050 cr (computed via reward formula)
 *
 * Test loadout: 2x ace striker, 2x ace defender, 2x ace sentinel
 *
 * Structure:
 * - Easy difficulty (60-80% win rate): ~8,350-9,100 cr
 * - Medium difficulty (40-60% win rate): ~10,900-11,500 cr
 * - Hard difficulty (20-40% win rate): ~12,500-13,050 cr
 */

import type { Contract } from '../../../campaign/types';

export const SECTOR_5_MISSIONS: Contract[] = [
  // --- Easy difficulty (60-80% win rate) ---
  {
    id: 's5-lance-battery',
    name: 'Lance Battery',
    description:
      'Destroy ace formation. Phantoms, Dragonflies, and Fireflies - all elite.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 8350,
  },
  {
    id: 's5-no-mans-land',
    name: "No Man's Land",
    description:
      'Survive beyond the frontier. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 9100,
  },
  {
    id: 's5-meat-grinder',
    name: 'Meat Grinder',
    description:
      'Survive the grinder. Four waves of Ace Phantoms and Dragonflies.',
    difficulty: 'easy',
    sector: 5,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 9100,
  },

  // --- Medium difficulty (40-60% win rate) ---
  {
    id: 's5-iron-wall',
    name: 'Iron Wall',
    description:
      'Break the iron wall. Heavy Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 10900,
  },
  {
    id: 's5-bomber-wing',
    name: 'Bomber Wing',
    description: 'Destroy bomber wing. Phantoms and Dragonflies in force.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 11200,
  },
  {
    id: 's5-elite-guard',
    name: 'Elite Guard',
    description:
      'Face the elite guard. Ace Phantoms, Dragonflies, and Fireflies.',
    difficulty: 'medium',
    sector: 5,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 11500,
  },

  // --- Hard difficulty (20-40% win rate) ---
  {
    id: 's5-final-stand',
    name: 'Final Stand',
    description: 'Make your final stand. Five waves of Ace-level fighters.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 12500,
  },
  {
    id: 's5-apocalypse',
    name: 'Apocalypse',
    description: 'Face the apocalypse. Maximum enemy force across four waves.',
    difficulty: 'hard',
    sector: 5,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 4 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 4 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 13050,
  },
];
