/**
 * Sector 3: Attack Station Missions
 *
 * Player attacks enemy station while enemy defenders protect it.
 * High DPS ships attack station, low DPS ships (interceptor) attack defenders.
 *
 * Balance targets (relaxed for attack-station due to assault loadout):
 * - Easy: 70-90% win rate, 1.5-2.3 squad survival, 75s+ avg time
 * - Medium: 55-75% win rate, 1.5-2.3 squad survival, 75s+ avg time
 * - Hard: 40-60% win rate, 1.2-1.9 squad survival, 75s+ avg time
 *
 * DPS threshold 250 separates support from assault:
 * - SUPPORT (< 250): interceptor (160 DPS) -> attack defenders
 * - ASSAULT (>= 250): assaultBomber (256), defender (336), striker (852.9),
 *                     assaultInterceptor (512), assaultSentinel (768) -> attack station
 *
 * Sector 3 enemies: phantom, dragonfly, moth, fireant, rocketeer, beetle, wasp
 * Sector 3 allies: interceptor, defender, striker (regular/veteran skill)
 */

import type { Contract } from '../types';

export const SECTOR_3_ATTACK_STATION: Contract[] = [
  {
    // Optimized: Win=64%, Time=79s, Surv=1.50
    id: 's3-rocket-queen',
    name: 'Rocket Queen',
    description:
      'Enemy fuel depot supplying their fleet. Destroy it to cripple their operations.',
    difficulty: 'medium',
    sector: 3,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'refinery',
      stationDistance: -2700,
      initialDefenders: [
        { archetype: 'phantom', skill: 'rookie', count: 8 },
        { archetype: 'dragonfly', skill: 'rookie', count: 7 },
        { archetype: 'beetle', skill: 'rookie', count: 7 },
      ],
      reinforcementWaves: [
        // Support waves: 11 × 2 interceptor, start=14s, interval=12s
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 14,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 26,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 38,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 50,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 62,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 74,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 86,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 98,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 110,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 122,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 134,
        },
        // Assault waves: 3 × 4 defender, start=122s
        {
          allies: [{ archetype: 'defender', skill: 'regular', count: 4 }],
          delay: 122,
        },
        {
          allies: [{ archetype: 'defender', skill: 'regular', count: 4 }],
          delay: 147,
        },
        {
          allies: [{ archetype: 'defender', skill: 'regular', count: 4 }],
          delay: 172,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'rocketeer', skill: 'ace', count: 6 },
        { archetype: 'beetle', skill: 'ace', count: 6 },
        { archetype: 'phantom', skill: 'ace', count: 4 },
      ],
      stationAttackDpsThreshold: 250,
    },
    reward: 8463,
  },
  {
    // Optimized: Win=72%, Time=90s, Surv=1.56
    id: 's3-space-oddity',
    name: 'Space Oddity',
    description:
      'Mining platform in contested space. Strike before they call for backup.',
    difficulty: 'easy',
    sector: 3,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'mining',
      stationDistance: -2400,
      initialDefenders: [
        { archetype: 'phantom', skill: 'rookie', count: 7 },
        { archetype: 'dragonfly', skill: 'rookie', count: 6 },
        { archetype: 'beetle', skill: 'rookie', count: 6 },
      ],
      reinforcementWaves: [
        // Support waves: 12 × 2 interceptor, start=12s, interval=17s
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 12,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 29,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 46,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 63,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 80,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 97,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 114,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 131,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 148,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 165,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 182,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 199,
        },
        // Assault waves: 3 × 3 defender, start=125s
        {
          allies: [{ archetype: 'defender', skill: 'regular', count: 3 }],
          delay: 125,
        },
        {
          allies: [{ archetype: 'defender', skill: 'regular', count: 3 }],
          delay: 150,
        },
        {
          allies: [{ archetype: 'defender', skill: 'regular', count: 3 }],
          delay: 175,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'rocketeer', skill: 'ace', count: 5 },
        { archetype: 'beetle', skill: 'ace', count: 5 },
      ],
      stationAttackDpsThreshold: 250,
    },
    reward: 9966,
  },
  {
    // Optimized: Win=52%, Time=80s, Surv=1.54
    id: 's3-war-machine',
    name: 'War Machine',
    description:
      'Regional command station. Heavily defended but strategically vital.',
    difficulty: 'hard',
    sector: 3,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'military',
      stationDistance: -3200,
      initialDefenders: [
        { archetype: 'phantom', skill: 'rookie', count: 7 },
        { archetype: 'dragonfly', skill: 'rookie', count: 6 },
        { archetype: 'beetle', skill: 'rookie', count: 6 },
      ],
      reinforcementWaves: [
        // Support waves: 6 × 2 interceptor, start=13s, interval=13s
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 13,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 26,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 39,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 52,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 65,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 78,
        },
        // Assault waves: 2 × 2 assaultBomber, start=116s
        {
          allies: [{ archetype: 'assaultBomber', skill: 'regular', count: 2 }],
          delay: 116,
        },
        {
          allies: [{ archetype: 'assaultBomber', skill: 'regular', count: 2 }],
          delay: 141,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'rocketeer', skill: 'ace', count: 8 },
        { archetype: 'beetle', skill: 'ace', count: 7 },
        { archetype: 'phantom', skill: 'ace', count: 6 },
      ],
      stationAttackDpsThreshold: 250,
    },
    reward: 10746,
  },
];
