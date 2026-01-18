/**
 * Sector 1: Station Defense Missions
 * Defend stations from pirate raiders until reinforcements arrive.
 *
 * Sector 1 enemies: gnat, ember, shocker, mantis (rookie/regular skill)
 * Sector 1 wingmen: 4x regular fighters
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_STATION_DEFENSE: Contract[] = [
  {
    id: 's1-mining-outpost',
    name: 'Mining Outpost',
    description:
      'Defend the mining station from rookie pirates until reinforcements arrive.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'rookie', count: 2 }],
          delay: 15,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'rookie', count: 2 }],
          delay: 55,
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
    reward: 3000,
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
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'rookie', count: 2 }],
          delay: 12,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'rookie', count: 2 }],
          delay: 40,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'rookie', count: 2 }],
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
    reward: 6725,
  },
  {
    id: 's1-defense-platform',
    name: 'Defense Platform',
    description:
      'Heavy pirate assault on military outpost. Mantis fighters deploying decoys.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'fighter', skill: 'regular', count: 2 }],
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'rookie', count: 2 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'rookie', count: 2 }],
          delay: 35,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
          delay: 60,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'regular', count: 2 }],
          delay: 85,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'veteran', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 11119,
  },
];
