/**
 * Sector 1: Attack Station Missions
 *
 * Player attacks enemy station while enemy defenders protect it.
 * High DPS ships (bombers) attack station, low DPS ships (fighters) attack defenders.
 *
 * Balance targets (offense missions are harder):
 * - Easy: 70-90% win rate, 2.5-3.5 squad survival
 * - Medium: 55-75% win rate, 2.0-3.0 squad survival
 * - Hard: 40-60% win rate, 1.5-2.5 squad survival
 *
 * DPS threshold ~100 separates bombers from fighters.
 * Sector 1 enemies: gnat, ember, shocker, mantis (rookie/regular skill)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_ATTACK_STATION: Contract[] = [
  {
    id: 's1-first-strike',
    name: 'First Strike',
    description:
      'A lightly defended mining outpost. Perfect for a training assault.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'mining',
      stationDistance: -2000,
      initialDefenders: [
        { archetype: 'gnat', skill: 'rookie', count: 4 },
        { archetype: 'ember', skill: 'rookie', count: 3 },
      ],
      reinforcementWaves: [
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 3,
        },
        {
          allies: [{ archetype: 'assaultFighter', skill: 'regular', count: 2 }],
          delay: 20,
        },
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
          delay: 40,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'mantis', skill: 'veteran', count: 6 },
        { archetype: 'shocker', skill: 'veteran', count: 4 },
      ],
      stationAttackDpsThreshold: 100,
    },
    reward: 4000,
  },
  {
    id: 's1-smash-and-grab',
    name: 'Smash and Grab',
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
        { archetype: 'ember', skill: 'regular', count: 3 },
        { archetype: 'shocker', skill: 'rookie', count: 2 },
      ],
      reinforcementWaves: [
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 1 }],
          delay: 25,
        },
        {
          allies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
          delay: 50,
        },
      ],
      overwhelmingSpawnTime: 180,
      overwhelmingWave: [
        { archetype: 'mantis', skill: 'ace', count: 8 },
        { archetype: 'shocker', skill: 'ace', count: 6 },
      ],
      stationAttackDpsThreshold: 100,
    },
    reward: 6500,
  },
  {
    id: 's1-fortress-assault',
    name: 'Fortress Assault',
    description:
      'Military outpost with veteran defenders. Expect heavy resistance.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'attack-station',
    attackStationData: {
      stationType: 'military',
      stationDistance: -3000,
      initialDefenders: [
        { archetype: 'mantis', skill: 'veteran', count: 4 },
        { archetype: 'shocker', skill: 'veteran', count: 3 },
        { archetype: 'ember', skill: 'regular', count: 3 },
      ],
      reinforcementWaves: [
        {
          allies: [{ archetype: 'fighter', skill: 'regular', count: 1 }],
          delay: 20,
        },
        {
          allies: [{ archetype: 'striker', skill: 'regular', count: 1 }],
          delay: 40,
        },
        {
          allies: [
            { archetype: 'interceptor', skill: 'regular', count: 1 },
            { archetype: 'fighter', skill: 'regular', count: 1 },
          ],
          delay: 60,
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
    reward: 9000,
  },
];
