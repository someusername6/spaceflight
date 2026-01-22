/**
 * Sector 2: Attack Station Missions
 *
 * Player attacks enemy station while enemy defenders protect it.
 * High DPS ships (bombers) attack station, low DPS ships (fighters) attack defenders.
 *
 * Balance targets (attack-station missions, relaxed survival due to assault loadout):
 * - Easy: 70-90% win rate, 1.5-2.3 squad survival, 75s+ avg time
 * - Medium: 55-75% win rate, 1.5-2.3 squad survival, 75s+ avg time
 * - Hard: 40-60% win rate, 1.2-1.9 squad survival, 75s+ avg time
 *
 * DPS threshold 260 separates assault ships from support ships:
 * - SUPPORT (< 260): interceptor (160 DPS), fighter (256 DPS) -> attack defenders
 * - ASSAULT (>= 260): assaultFighter (277 DPS), assaultInterceptor (512 DPS) -> attack station
 * Sector 2 enemies: firefly, dragonfly, stinger, locust, bruiser, phantom, shredder, sparkler
 * Sector 2 allies: interceptor, assaultInterceptor, defender (rookie/regular/veteran skill)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_ATTACK_STATION: Contract[] = [
  {
    id: 's2-garrison-assault',
    name: 'Garrison Assault',
    description:
      'Military garrison with veteran pilots. Coordinated assault required.',
    difficulty: 'hard',
    sector: 2,
    missionType: 'attack-station',
    // Optimized: Win=52%, Time=119s, Surv=1.23
    attackStationData: {
      stationType: 'military',
      stationDistance: -3000,
      initialDefenders: [
        { archetype: 'shredder', skill: 'rookie', count: 7 },
        { archetype: 'phantom', skill: 'rookie', count: 7 },
        { archetype: 'bruiser', skill: 'rookie', count: 6 },
      ],
      reinforcementWaves: [
        // Support waves: 7 × 4 interceptor, start=9s, interval=12s
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 9,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 21,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 33,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 45,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 57,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 69,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 4 }],
          delay: 81,
        },
        // Assault waves: 2 × 2 assaultInterceptor, start=105s
        {
          allies: [
            { archetype: 'assaultInterceptor', skill: 'regular', count: 2 },
          ],
          delay: 105,
        },
        {
          allies: [
            { archetype: 'assaultInterceptor', skill: 'regular', count: 2 },
          ],
          delay: 130,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'shredder', skill: 'ace', count: 8 },
        { archetype: 'phantom', skill: 'ace', count: 6 },
        { archetype: 'bruiser', skill: 'ace', count: 5 },
      ],
      stationAttackDpsThreshold: 260,
    },
    reward: 6427,
  },
  {
    id: 's2-supply-raid',
    name: 'Supply Raid',
    description: 'A mining station with light defenses. Hit hard, hit fast.',
    difficulty: 'easy',
    sector: 2,
    missionType: 'attack-station',
    // Optimized: Win=80%, Time=92s, Surv=1.55
    attackStationData: {
      stationType: 'mining',
      stationDistance: -2200,
      initialDefenders: [
        { archetype: 'bruiser', skill: 'rookie', count: 5 },
        { archetype: 'phantom', skill: 'rookie', count: 5 },
        { archetype: 'stinger', skill: 'rookie', count: 5 },
      ],
      reinforcementWaves: [
        // Support waves: 11 × 3 interceptor, start=7s, interval=14s
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 7,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 21,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 35,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 49,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 63,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 77,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 91,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 105,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 119,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 133,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 147,
        },
        // Assault waves: 2 × 2 assaultFighter, start=105s
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 105,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 130,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'phantom', skill: 'veteran', count: 6 },
        { archetype: 'bruiser', skill: 'veteran', count: 4 },
      ],
      stationAttackDpsThreshold: 260,
    },
    reward: 7000,
  },
  {
    id: 's2-refinery-strike',
    name: 'Refinery Strike',
    description:
      'Enemy refinery processing stolen ore. Destroy it before they can reinforce.',
    difficulty: 'medium',
    sector: 2,
    missionType: 'attack-station',
    // Optimized: Win=56%, Time=97s, Surv=1.50
    attackStationData: {
      stationType: 'refinery',
      stationDistance: -2500,
      initialDefenders: [
        { archetype: 'bruiser', skill: 'rookie', count: 6 },
        { archetype: 'phantom', skill: 'rookie', count: 6 },
        { archetype: 'dragonfly', skill: 'rookie', count: 5 },
      ],
      reinforcementWaves: [
        // Support waves: 10 × 3 interceptor, start=4s, interval=15s
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 4,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 19,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 34,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 49,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 64,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 79,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 94,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 109,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 124,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 3 }],
          delay: 139,
        },
        // Assault waves: 1 × 2 assaultFighter, start=101s
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 101,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'shredder', skill: 'ace', count: 6 },
        { archetype: 'phantom', skill: 'ace', count: 5 },
      ],
      stationAttackDpsThreshold: 260,
    },
    reward: 7648,
  },
];
