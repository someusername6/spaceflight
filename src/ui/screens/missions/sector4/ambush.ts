/**
 * Sector 4: Ambush Missions (target rates by difficulty)
 * - Easy: 75-95% win rate, 75-90% squad survival
 * - Medium: 60-80% win rate, 60-75% squad survival
 * - Hard: 45-65% win rate, 45-60% squad survival
 *
 * Convoy interception missions - attack enemy convoy protected by escorts.
 * Victory: All convoy destroyed or stopped (no escorts nearby + player nearby)
 * Defeat: Any convoy escapes OR player dies
 *
 * Reward calculation:
 * - Stopped convoy: 100% credit (cargo captured intact)
 * - Destroyed convoy: 50% credit (cargo lost)
 *
 * Sector 4 enemies: phantom, firefly, dragonfly, inferno, scorpion, wasp, specter, juggernaut, behemoth
 * Sector 4 wingmen: ace striker, veteran striker, 2x veteran defender, regular sentinel
 * Escort roles: aggressive (proactive engagement) vs defensive (reactive only)
 */

import type { Contract } from '../types';

export const SECTOR_4_AMBUSH: Contract[] = [
  {
    id: 's4-core-intercept',
    name: 'Core Intercept',
    description:
      'Intercept supply convoy in core systems. Phantom escorts are no joke.',
    difficulty: 'easy',
    sector: 4,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 850,
      escapeZoneDistance: 9050,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Easy: 4 defensive dragonflies + 2 aggressive phantoms (regular)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'regular',
          count: 4,
          role: 'defensive',
        },
        {
          archetype: 'phantom',
          skill: 'regular',
          count: 2,
          role: 'aggressive',
        },
      ],
    },
    reward: 4344,
  },
  {
    id: 's4-inferno-run',
    name: 'Inferno Run',
    description:
      'Raid convoy with Inferno escorts. Heat injection will overwhelm shields.',
    difficulty: 'medium',
    sector: 4,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 900,
      escapeZoneDistance: 9000,
      escapeZoneRadius: 300,
      convoyStopDistance: 400,
      // Medium: 4 defensive infernos + 3 aggressive wasps (regular/veteran)
      escorts: [
        { archetype: 'inferno', skill: 'regular', count: 4, role: 'defensive' },
        { archetype: 'wasp', skill: 'veteran', count: 3, role: 'aggressive' },
      ],
    },
    reward: 6109,
  },
  {
    id: 's4-sniper-gauntlet',
    name: 'Sniper Gauntlet',
    description:
      'Heavy convoy with Scorpion escorts. Railgun fire at extreme range.',
    difficulty: 'hard',
    sector: 4,
    missionType: 'ambush',
    ambushData: {
      convoySize: 2,
      convoyType: 'transport',
      convoyStartDistance: 950,
      escapeZoneDistance: 8950,
      escapeZoneRadius: 350,
      convoyStopDistance: 400,
      // Hard: 4 defensive dragonflies + 5 aggressive wasps (regular/veteran)
      escorts: [
        {
          archetype: 'dragonfly',
          skill: 'regular',
          count: 4,
          role: 'defensive',
        },
        { archetype: 'wasp', skill: 'veteran', count: 5, role: 'aggressive' },
      ],
    },
    reward: 6928,
  },
];
