/**
 * Sector 1: Attack Station Missions
 *
 * Player attacks enemy station while enemy defenders protect it.
 * High DPS ships (bombers) attack station, low DPS ships (fighters) attack defenders.
 *
 * Balance targets (attack-station missions):
 * - Easy: 70-90% win rate, 2.0-3.0 squad survival, 90s+ avg time
 * - Medium: 55-75% win rate, 2.0-3.0 squad survival, 90s+ avg time
 * - Hard: 40-60% win rate, 1.5-2.5 squad survival, 90s+ avg time
 *
 * DPS threshold ~100 separates bombers from fighters.
 * Sector 1 enemies: gnat, ember, shocker, mantis (rookie/regular/veteran skill)
 * Sector 1 allies: fighter, assaultFighter only
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_ATTACK_STATION: Contract[] = [
  {
    id: 's1-opening-act',
    name: 'Opening Act',
    description: 'A lightly defended refinery. Perfect for a training assault.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'refinery',
      stationDistance: -2000,
      initialDefenders: [
        { archetype: 'gnat', skill: 'regular', count: 3 },
        { archetype: 'ember', skill: 'regular', count: 2 },
        { archetype: 'shocker', skill: 'regular', count: 2 },
      ],
      reinforcementWaves: [
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 20,
        },
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 45,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 50,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 80,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 110,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'mantis', skill: 'veteran', count: 6 },
        { archetype: 'shocker', skill: 'veteran', count: 4 },
      ],
      stationAttackDpsThreshold: 100,
    },
    reward: 3068,
  },
  {
    id: 's1-wrecking-ball',
    name: 'Wrecking Ball',
    description:
      'Hit the refinery fast before reinforcements arrive. Every second counts.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'refinery',
      stationDistance: -2500,
      initialDefenders: [
        { archetype: 'gnat', skill: 'regular', count: 4 },
        { archetype: 'ember', skill: 'regular', count: 4 },
        { archetype: 'shocker', skill: 'regular', count: 4 },
      ],
      reinforcementWaves: [
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 20,
        },
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 45,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 60,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 90,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 120,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'mantis', skill: 'ace', count: 8 },
        { archetype: 'shocker', skill: 'ace', count: 6 },
      ],
      stationAttackDpsThreshold: 100,
    },
    reward: 3481,
  },
  {
    id: 's1-knockin-on-heavens-door',
    name: "Knockin' on Heaven's Door",
    description:
      'Military outpost with veteran defenders. Expect heavy resistance.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'military',
      stationDistance: -3000,
      initialDefenders: [
        { archetype: 'mantis', skill: 'veteran', count: 5 },
        { archetype: 'shocker', skill: 'veteran', count: 5 },
        { archetype: 'ember', skill: 'veteran', count: 5 },
        { archetype: 'gnat', skill: 'veteran', count: 4 },
      ],
      reinforcementWaves: [
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 20,
        },
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 45,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 70,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 100,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 130,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'mantis', skill: 'ace', count: 10 },
        { archetype: 'shocker', skill: 'ace', count: 8 },
        { archetype: 'ember', skill: 'ace', count: 6 },
      ],
      stationAttackDpsThreshold: 100,
    },
    reward: 3949,
  },
];
