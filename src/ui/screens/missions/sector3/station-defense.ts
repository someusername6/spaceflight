/**
 * Sector 3: Station Defense Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Defend stations from warzone combat forces.
 * playerThreatRatio controls enemy targeting split.
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 * Sector 3 enemies: rocketeer, moth, dragonfly, beetle, fireant (regular/veteran)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_3_STATION_DEFENSE: Contract[] = [
  {
    id: 's3-dead-weight',
    name: 'Dead Weight',
    description:
      'Rocketeers targeting the mining station. Intercept accelerating rounds.',
    difficulty: 'easy',
    sector: 3,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.15,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'veteran', count: 7 },
            { archetype: 'dragonfly', skill: 'veteran', count: 7 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'fireant', skill: 'veteran', count: 6 },
            { archetype: 'rocketeer', skill: 'veteran', count: 6 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
            { archetype: 'beetle', skill: 'veteran', count: 5 },
          ],
          delay: 13,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'ace', count: 6 },
            { archetype: 'fireant', skill: 'ace', count: 5 },
          ],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'beetle', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'ace', count: 6 },
            { archetype: 'fireant', skill: 'ace', count: 6 },
          ],
          delay: 28,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 3,
      reinforcementPool: [
        { archetype: 'interceptor', skill: 'regular', count: 1 },
        { archetype: 'defender', skill: 'regular', count: 1 },
      ],
    },
    reward: 9714,
  },
  {
    id: 's3-hot-zone',
    name: 'Hot Zone',
    description:
      'Coordinated assault on military forward base. Moths and veteran rocketeers.',
    difficulty: 'hard',
    sector: 3,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.4,
      stationType: 'mining',
      stationDistance: -300,
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 10 },
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
          ],
          delay: 2,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'fireant', skill: 'ace', count: 10 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
            { archetype: 'beetle', skill: 'ace', count: 10 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'dragonfly', skill: 'ace', count: 10 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'beetle', skill: 'ace', count: 10 },
          ],
          delay: 14,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
            { archetype: 'fireant', skill: 'ace', count: 10 },
          ],
          delay: 17,
        },
        {
          enemies: [
            { archetype: 'beetle', skill: 'ace', count: 10 },
            { archetype: 'dragonfly', skill: 'ace', count: 10 },
          ],
          delay: 20,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'fireant', skill: 'ace', count: 10 },
            { archetype: 'beetle', skill: 'ace', count: 10 },
          ],
          delay: 26,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.15,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'interceptor', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 10508,
  },
  {
    id: 's3-arc-flash',
    name: 'Arc Flash',
    description:
      'Moths with chain lightning targeting the refinery. High energy threat.',
    difficulty: 'medium',
    sector: 3,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.25,
      stationType: 'mining',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 10 },
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
          ],
          delay: 2,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'fireant', skill: 'ace', count: 10 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
            { archetype: 'beetle', skill: 'ace', count: 10 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'dragonfly', skill: 'ace', count: 10 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'rocketeer', skill: 'ace', count: 10 },
          ],
          delay: 14,
        },
        {
          enemies: [
            { archetype: 'beetle', skill: 'ace', count: 10 },
            { archetype: 'fireant', skill: 'ace', count: 10 },
          ],
          delay: 17,
        },
        {
          enemies: [
            { archetype: 'moth', skill: 'ace', count: 10 },
            { archetype: 'dragonfly', skill: 'ace', count: 10 },
          ],
          delay: 20,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.15,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'interceptor', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'regular', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 13609,
  },
];
