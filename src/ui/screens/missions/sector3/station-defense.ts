/**
 * Sector 3: Station Defense Missions
 * Defend stations from warzone combat forces.
 *
 * Sector 3 enemies: rocketeer, moth, dragonfly, beetle, fireant (regular/veteran)
 * Sector 3 wingmen: veteran interceptor, regular interceptor, 2x regular defender
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_STATION_DEFENSE: Contract[] = [
  {
    id: 's3-ore-processing',
    name: 'Ore Processing',
    description:
      'Rocketeers targeting the mining station. Intercept accelerating rounds.',
    difficulty: 'easy',
    sector: 3,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'regular', count: 3 },
            { archetype: 'dragonfly', skill: 'regular', count: 3 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'fireant', skill: 'regular', count: 2 },
            { archetype: 'rocketeer', skill: 'veteran', count: 2 },
          ],
          delay: 14,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 3 },
            { archetype: 'rocketeer', skill: 'veteran', count: 3 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'beetle', skill: 'regular', count: 2 },
            { archetype: 'fireant', skill: 'veteran', count: 3 },
          ],
          delay: 32,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'veteran', count: 3 },
            { archetype: 'dragonfly', skill: 'veteran', count: 3 },
          ],
          delay: 41,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.3,
      reinforcementCount: 3,
      reinforcementPool: [
        { archetype: 'interceptor', skill: 'regular', count: 1 },
        { archetype: 'defender', skill: 'regular', count: 1 },
      ],
    },
    reward: 3146,
  },
  {
    id: 's3-forward-base',
    name: 'Forward Base',
    description:
      'Coordinated assault on military forward base. Moths and veteran rocketeers.',
    difficulty: 'hard',
    sector: 3,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'defender', skill: 'regular', count: 2 }],
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 6 },
            { archetype: 'rocketeer', skill: 'veteran', count: 5 },
          ],
          delay: 1,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'veteran', count: 3 },
            { archetype: 'fireant', skill: 'veteran', count: 5 },
          ],
          delay: 6,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'veteran', count: 5 },
            { archetype: 'beetle', skill: 'veteran', count: 3 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'veteran', count: 4 },
            { archetype: 'dragonfly', skill: 'veteran', count: 6 },
          ],
          delay: 16,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'veteran', count: 4 },
            { archetype: 'beetle', skill: 'veteran', count: 4 },
            { archetype: 'rocketeer', skill: 'veteran', count: 4 },
          ],
          delay: 21,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'interceptor', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 9268,
  },
  {
    id: 's3-power-station',
    name: 'Power Station',
    description:
      'Moths with chain lightning targeting the refinery. High energy threat.',
    difficulty: 'medium',
    sector: 3,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
            { archetype: 'rocketeer', skill: 'veteran', count: 4 },
          ],
          delay: 2,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'veteran', count: 3 },
            { archetype: 'fireant', skill: 'veteran', count: 5 },
          ],
          delay: 7,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'veteran', count: 4 },
            { archetype: 'beetle', skill: 'veteran', count: 3 },
          ],
          delay: 12,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'veteran', count: 4 },
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
          ],
          delay: 17,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'veteran', count: 4 },
            { archetype: 'rocketeer', skill: 'veteran', count: 4 },
            { archetype: 'beetle', skill: 'veteran', count: 2 },
          ],
          delay: 22,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'interceptor', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'regular', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 10285,
  },
];
