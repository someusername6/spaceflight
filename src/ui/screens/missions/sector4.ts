/**
 * Sector 4: Core Systems Missions
 * Enemy skill: Veteran → Ace
 * Rewards: 5,900-9,550 cr (computed via reward formula)
 *
 * Test loadout: 1x ace striker, 1x veteran striker, 2x veteran defender, 1x regular sentinel
 *
 * Structure:
 * - Easy difficulty (60-80% win rate): ~5,900-6,900 cr
 * - Medium difficulty (40-60% win rate): ~8,200-8,650 cr
 * - Hard difficulty (20-40% win rate): ~9,450-9,550 cr
 */

import type { Contract } from '../../../campaign/types';

export const SECTOR_4_MISSIONS: Contract[] = [
  // --- Easy difficulty (60-80% win rate) ---
  {
    id: 's4-titan-patrol',
    name: 'Titan Patrol',
    description:
      'Destroy assault group. Phantoms, Dragonflies, and Fireflies - all veteran.',
    difficulty: 'easy',
    sector: 4,
    tier: 'low',
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
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 5900,
  },
  {
    id: 's4-perimeter-breach',
    name: 'Perimeter Breach',
    description:
      'Engage response force. Phantoms with Firefly and Dragonfly support.',
    difficulty: 'easy',
    sector: 4,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
        delay: [5, 10],
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
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6150,
  },
  {
    id: 's4-garrison-duty',
    name: 'Garrison Duty',
    description:
      'Destroy incoming hostiles. Wasps, Dragonflies, and Fireflies - some Aces.',
    difficulty: 'easy',
    sector: 4,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'wasp', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 6900,
  },

  // --- Medium difficulty (40-60% win rate) ---
  {
    id: 's4-nuke-convoy',
    name: 'Nuke Convoy',
    description:
      'Destroy elite strike force. Phantoms with Ace Fireflies and veteran Dragonflies.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 8200,
  },
  {
    id: 's4-ace-squadron',
    name: 'Ace Squadron',
    description:
      'Face elite pilots. Phantoms, Wasps, and Dragonflies with Ace skill.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'wasp', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 8400,
  },
  {
    id: 's4-specter-hunt',
    name: 'Specter Hunt',
    description:
      'Hunt Specters. Elite railgun snipers with Dragonfly and Phantom escort.',
    difficulty: 'medium',
    sector: 4,
    tier: 'mid',
    waves: [
      {
        enemies: [{ archetype: 'specter', skill: 'veteran', count: 1 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'specter', skill: 'ace', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 8650,
  },

  // --- Hard difficulty (20-40% win rate) ---
  {
    id: 's4-capital-defense',
    name: 'Capital Defense',
    description:
      'Destroy ace squadron. Phantoms and Dragonflies at maximum skill.',
    difficulty: 'hard',
    sector: 4,
    tier: 'high',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 4 }],
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
    ],
    reward: 9450,
  },
  {
    id: 's4-warlord',
    name: 'Warlord',
    description:
      'Eliminate the warlord. Ace Phantoms and Dragonflies - no mercy.',
    difficulty: 'hard',
    sector: 4,
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
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
    ],
    reward: 9550,
  },
];
