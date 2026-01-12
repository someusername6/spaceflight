/**
 * Sector 4: Easy Missions (60-80% win rate)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_EASY: Contract[] = [
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
    id: 's4-railgun-scouts',
    name: 'Railgun Scouts',
    description: 'Engage sniper patrol. Scorpions with railguns at long range.',
    difficulty: 'easy',
    sector: 4,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'scorpion', skill: 'regular', count: 1 }],
        delay: [5, 10],
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
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 6100,
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
    reward: 6300,
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
    reward: 6500,
  },
  {
    id: 's4-titan-escort',
    name: 'Titan Escort',
    description: 'Intercept heavy assault. A Titan with Phantom escorts.',
    difficulty: 'easy',
    sector: 4,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'titan', skill: 'regular', count: 1 }],
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
    reward: 6750,
  },
  {
    id: 's4-nuke-warning',
    name: 'Nuke Warning',
    description:
      'Nuclear threat detected. Juggernaut with nuke payload inbound.',
    difficulty: 'easy',
    sector: 4,
    tier: 'low',
    waves: [
      {
        enemies: [{ archetype: 'dragonfly', skill: 'veteran', count: 3 }],
        delay: [5, 10],
      },
      {
        enemies: [{ archetype: 'juggernaut', skill: 'regular', count: 1 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'phantom', skill: 'ace', count: 2 }],
        delay: [8, 12],
      },
      {
        enemies: [{ archetype: 'firefly', skill: 'veteran', count: 3 }],
        delay: [8, 12],
      },
    ],
    reward: 6900,
  },
];
