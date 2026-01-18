/**
 * Sector 4: Station Defense Missions
 * Defend stations from core systems strike forces.
 *
 * Sector 4 enemies: phantom, firefly, dragonfly (regular/veteran/ace)
 * Sector 4 wingmen: ace striker, veteran striker, 2x veteran defender, regular sentinel
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_STATION_DEFENSE: Contract[] = [
  {
    id: 's4-deep-core-mine',
    name: 'Deep Core Mine',
    description:
      'Phantom infiltrators targeting the mining station. Torpedoes inbound.',
    difficulty: 'easy',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
          delay: 8,
        },
        {
          enemies: [{ archetype: 'firefly', skill: 'veteran', count: 2 }],
          delay: 20,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'regular', count: 2 },
            { archetype: 'dragonfly', skill: 'veteran', count: 2 },
          ],
          delay: 30,
        },
        {
          enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
          delay: 40,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.3,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
      ],
    },
    reward: 3100,
  },
  {
    id: 's4-fusion-plant',
    name: 'Fusion Plant',
    description:
      'Veteran phantom squadron targeting the refinery. Heavy torpedo threat.',
    difficulty: 'medium',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'veteran', count: 2 },
            { archetype: 'dragonfly', skill: 'veteran', count: 1 },
          ],
          delay: 8,
        },
        {
          enemies: [{ archetype: 'phantom', skill: 'regular', count: 2 }],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 2 },
            { archetype: 'firefly', skill: 'veteran', count: 2 },
          ],
          delay: 28,
        },
        {
          enemies: [{ archetype: 'dragonfly', skill: 'ace', count: 3 }],
          delay: 38,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 2 },
            { archetype: 'dragonfly', skill: 'veteran', count: 2 },
          ],
          delay: 48,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'sentinel', skill: 'regular', count: 1 },
      ],
    },
    reward: 11497,
  },
  {
    id: 's4-command-station',
    name: 'Command Station',
    description:
      'Elite phantom strike on command station. Ace pilots with torpedo support.',
    difficulty: 'hard',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'striker', skill: 'veteran', count: 2 }],
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 2 },
            { archetype: 'phantom', skill: 'regular', count: 2 },
          ],
          delay: 6,
        },
        {
          enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
          delay: 14,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 2 },
            { archetype: 'dragonfly', skill: 'ace', count: 2 },
          ],
          delay: 22,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 2 },
            { archetype: 'firefly', skill: 'veteran', count: 2 },
          ],
          delay: 32,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 2 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 42,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'sentinel', skill: 'veteran', count: 1 },
      ],
    },
    reward: 12937,
  },
];
