/**
 * Sector 4: Attack Station Missions
 *
 * Player attacks enemy station while enemy defenders protect it.
 * High DPS ships attack station, low DPS ships attack defenders.
 *
 * Balance targets (relaxed for attack-station due to assault loadout):
 * Squad size: 5 ships
 * - Easy: 70-90% win rate, 1.9-2.8 squad survival, 75s+ avg time
 * - Medium: 55-75% win rate, 1.9-2.8 squad survival, 75s+ avg time
 * - Hard: 40-60% win rate, 1.4-2.3 squad survival, 75s+ avg time
 *
 * DPS threshold 400 separates support from assault:
 * - SUPPORT (< 400): defender (336 DPS), sentinel (360 DPS) -> attack defenders
 * - ASSAULT (>= 400): striker (852.9), assaultStriker (1044.9), assaultInterceptor (512) -> attack station
 *
 * Sector 4 enemies: scorpion, specter, titan, behemoth, phantom, dragonfly, inferno
 * Sector 4 allies: striker, defender, sentinel (veteran/ace skill)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_ATTACK_STATION: Contract[] = [
  {
    // Optimized: Win=84%, Time=104s, Surv=2.33
    id: 's4-point-of-no-return',
    name: 'Point of No Return',
    description:
      'Enemy forward operating base. Take it out before they can launch.',
    difficulty: 'easy',
    sector: 4,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'mining',
      stationDistance: -2600,
      initialDefenders: [
        { archetype: 'scorpion', skill: 'veteran', count: 6 },
        { archetype: 'phantom', skill: 'veteran', count: 6 },
        { archetype: 'dragonfly', skill: 'veteran', count: 6 },
      ],
      reinforcementWaves: [
        // Support waves: 10 × 2 defender, start=11s, interval=12s
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 11,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 23,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 35,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 47,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 59,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 71,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 83,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 95,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 107,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 119,
        },
        // Assault waves: 2 × 4 striker, start=140s
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 140,
        },
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 165,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'scorpion', skill: 'ace', count: 5 },
        { archetype: 'specter', skill: 'ace', count: 4 },
      ],
      stationAttackDpsThreshold: 400,
    },
    reward: 10480,
  },
  {
    // Optimized: Win=68%, Time=124s, Surv=2.35
    id: 's4-ammunition',
    name: 'Ammunition',
    description:
      'Enemy weapons cache. Destroy it before those munitions reach the front.',
    difficulty: 'medium',
    sector: 4,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'refinery',
      stationDistance: -2900,
      initialDefenders: [
        { archetype: 'scorpion', skill: 'veteran', count: 9 },
        { archetype: 'phantom', skill: 'veteran', count: 8 },
        { archetype: 'dragonfly', skill: 'veteran', count: 8 },
      ],
      reinforcementWaves: [
        // Support waves: 9 × 2 defender, start=14s, interval=15s
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 14,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 29,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 44,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 59,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 74,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 89,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 104,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 119,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 2 }],
          delay: 134,
        },
        // Assault waves: 2 × 4 striker, start=83s
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 83,
        },
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 108,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'titan', skill: 'ace', count: 4 },
        { archetype: 'scorpion', skill: 'ace', count: 5 },
        { archetype: 'specter', skill: 'ace', count: 4 },
      ],
      stationAttackDpsThreshold: 400,
    },
    reward: 11467,
  },
  {
    // Optimized: Win=56%, Time=139s, Surv=2.14
    id: 's4-iron-fist',
    name: 'Iron Fist',
    description:
      'Enemy fleet command station. Elite pilots and heavy defenses await.',
    difficulty: 'hard',
    sector: 4,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'military',
      stationDistance: -3400,
      initialDefenders: [
        { archetype: 'scorpion', skill: 'veteran', count: 9 },
        { archetype: 'phantom', skill: 'veteran', count: 8 },
        { archetype: 'dragonfly', skill: 'veteran', count: 8 },
      ],
      reinforcementWaves: [
        // Support waves: 7 × 3 defender, start=15s, interval=14s
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 15,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 29,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 43,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 57,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 71,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 85,
        },
        {
          allies: [{ archetype: 'defender', skill: 'veteran', count: 3 }],
          delay: 99,
        },
        // Assault waves: 3 × 4 striker, start=115s
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 115,
        },
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 140,
        },
        {
          allies: [{ archetype: 'striker', skill: 'veteran', count: 4 }],
          delay: 165,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'titan', skill: 'ace', count: 5 },
        { archetype: 'behemoth', skill: 'ace', count: 4 },
        { archetype: 'scorpion', skill: 'ace', count: 5 },
      ],
      stationAttackDpsThreshold: 400,
    },
    reward: 12473,
  },
];
