/**
 * Sector 1: Station Defense Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Defend stations from attackers until reinforcements arrive.
 * playerThreatRatio fixed at 0.3 (30% attack squad, 70% attack station).
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 * Sector 1 enemies: gnat, ember, shocker, mantis (rookie/regular skill)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_STATION_DEFENSE: Contract[] = [
  {
    id: 's1-defense-platform',
    name: 'Defense Platform',
    description:
      'Heavy pirate assault on military outpost. Mantis fighters deploying decoys.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.85,
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'veteran', count: 5 }],
          delay: 3,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'veteran', count: 5 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'veteran', count: 5 }],
          delay: 17,
        },
        {
          enemies: [{ archetype: 'mantis', skill: 'veteran', count: 5 }],
          delay: 24,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'veteran', count: 5 }],
          delay: 31,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'veteran', count: 5 }],
          delay: 38,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'veteran', count: 5 }],
          delay: 45,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'veteran', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 6325,
  },
  {
    id: 's1-mining-outpost',
    name: 'Mining Outpost',
    description:
      'Defend the mining station from rookie pirates until reinforcements arrive.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.6,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'regular', count: 4 }],
          delay: 5,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'regular', count: 4 }],
          delay: 25,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'regular', count: 3 }],
          delay: 45,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'regular', count: 3 }],
          delay: 65,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.4,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'regular', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
      ],
    },
    reward: 6628,
  },
  {
    id: 's1-refinery-siege',
    name: 'Refinery Siege',
    description:
      'Ion-armed shockers are targeting the refinery. Hold until backup arrives.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.75,
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'regular', count: 5 }],
          delay: 5,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'regular', count: 5 }],
          delay: 20,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'regular', count: 4 }],
          delay: 35,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'veteran', count: 4 }],
          delay: 50,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'veteran', count: 4 }],
          delay: 65,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.3,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'regular', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
      ],
    },
    reward: 7541,
  },
];
