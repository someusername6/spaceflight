/**
 * Sector 5: Attack Station Missions
 *
 * Player attacks enemy station while enemy defenders protect it.
 * High DPS ships attack station, low DPS ships attack defenders.
 *
 * Balance targets (relaxed for attack-station due to assault loadout):
 * Squad size: 5 ships
 * - Easy: 70-90% win rate, 2.25-3.4 squad survival, 75s+ avg time
 * - Medium: 55-75% win rate, 2.25-3.4 squad survival, 75s+ avg time
 * - Hard: 40-60% win rate, 1.7-2.8 squad survival, 75s+ avg time
 *
 * DPS threshold 400 separates support from assault:
 * - SUPPORT (< 400): defender (336 DPS), sentinel (360 DPS) -> attack defenders
 * - ASSAULT (>= 400): striker (852.9), titan (832), assaultStriker (1044.9) -> attack station
 *
 * Sector 5 enemies: wraith, phantom, scorpion, dragonfly (veteran/ace)
 * Sector 5 allies: striker, defender, sentinel (ace skill)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_ATTACK_STATION: Contract[] = [
  {
    // Optimized: Win=72%, Time=82s, Surv=2.94
    id: 's5-paint-it-black',
    name: 'Paint It Black',
    description:
      'Hidden refinery processing rare minerals. Wraith sentinels guard the perimeter.',
    difficulty: 'medium',
    sector: 5,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'refinery',
      stationDistance: -3100,
      initialDefenders: [
        { archetype: 'wraith', skill: 'regular', count: 8 },
        { archetype: 'scorpion', skill: 'regular', count: 8 },
        { archetype: 'phantom', skill: 'regular', count: 8 },
      ],
      reinforcementWaves: [
        // Support waves: 7 × 3 defender, start=13s, interval=18s
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 13,
        },
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 31,
        },
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 49,
        },
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 67,
        },
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 85,
        },
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 103,
        },
        {
          allies: [{ archetype: 'defender', skill: 'ace', count: 3 }],
          delay: 121,
        },
        // Assault waves: 2 × 2 striker, start=108s
        {
          allies: [{ archetype: 'striker', skill: 'ace', count: 2 }],
          delay: 108,
        },
        {
          allies: [{ archetype: 'striker', skill: 'ace', count: 2 }],
          delay: 133,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'wraith', skill: 'ace', count: 6 },
        { archetype: 'scorpion', skill: 'ace', count: 5 },
        { archetype: 'phantom', skill: 'ace', count: 5 },
      ],
      stationAttackDpsThreshold: 400,
    },
    reward: 13958,
  },
  {
    // Optimized: Win=84%, Time=80s, Surv=2.62
    id: 's5-black-hole-sun',
    name: 'Black Hole Sun',
    description: 'Remote mining platform in the void. Elite defenders await.',
    difficulty: 'easy',
    sector: 5,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'mining',
      stationDistance: -2800,
      initialDefenders: [
        { archetype: 'wraith', skill: 'veteran', count: 7 },
        { archetype: 'scorpion', skill: 'veteran', count: 7 },
        { archetype: 'phantom', skill: 'veteran', count: 7 },
      ],
      reinforcementWaves: [
        // Support waves: 11 × 3 sentinel, start=8s, interval=8s
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 8,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 16,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 24,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 32,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 40,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 48,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 56,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 64,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 72,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 80,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 3 }],
          delay: 88,
        },
        // Assault waves: 3 × 4 titan, start=95s
        { allies: [{ archetype: 'titan', skill: 'ace', count: 4 }], delay: 95 },
        {
          allies: [{ archetype: 'titan', skill: 'ace', count: 4 }],
          delay: 120,
        },
        {
          allies: [{ archetype: 'titan', skill: 'ace', count: 4 }],
          delay: 145,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'wraith', skill: 'ace', count: 5 },
        { archetype: 'scorpion', skill: 'ace', count: 5 },
      ],
      stationAttackDpsThreshold: 400,
    },
    reward: 14419,
  },
  {
    // Optimized: Win=52%, Time=103s, Surv=2.31
    id: 's5-stairway-to-heaven',
    name: 'Stairway to Heaven',
    description:
      'Enemy command fortress at the edge of known space. Ace pilots and devastating firepower.',
    difficulty: 'hard',
    sector: 5,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'military',
      stationDistance: -3600,
      initialDefenders: [
        { archetype: 'wraith', skill: 'veteran', count: 10 },
        { archetype: 'scorpion', skill: 'veteran', count: 9 },
        { archetype: 'phantom', skill: 'veteran', count: 9 },
      ],
      reinforcementWaves: [
        // Support waves: 13 × 2 sentinel, start=13s, interval=8s
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 13,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 21,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 29,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 37,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 45,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 53,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 61,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 69,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 77,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 85,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 93,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 101,
        },
        {
          allies: [{ archetype: 'sentinel', skill: 'ace', count: 2 }],
          delay: 109,
        },
        // Assault waves: 2 × 4 striker, start=139s
        {
          allies: [{ archetype: 'striker', skill: 'ace', count: 4 }],
          delay: 139,
        },
        {
          allies: [{ archetype: 'striker', skill: 'ace', count: 4 }],
          delay: 164,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'wraith', skill: 'ace', count: 6 },
        { archetype: 'scorpion', skill: 'ace', count: 6 },
        { archetype: 'phantom', skill: 'ace', count: 6 },
      ],
      stationAttackDpsThreshold: 400,
    },
    reward: 15373,
  },
];
