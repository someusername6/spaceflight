/**
 * Sector 2: Station Defense Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Defend stations from organized raider forces.
 * playerThreatRatio controls enemy targeting split.
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 * Sector 2 enemies: firefly, dragonfly, stinger, locust, bruiser, sparkler (rookie/regular/veteran)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_STATION_DEFENSE: Contract[] = [
  {
    id: 's2-heavy-metal',
    name: 'Heavy Metal',
    description:
      'Defend mining station from raider scouts. Fireflies and Dragonflies inbound.',
    difficulty: 'easy',
    sector: 2,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.2,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'regular', count: 4 },
            { archetype: 'dragonfly', skill: 'regular', count: 4 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'regular', count: 4 },
            { archetype: 'firefly', skill: 'regular', count: 4 },
          ],
          delay: 25,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 4 },
            { archetype: 'stinger', skill: 'regular', count: 3 },
          ],
          delay: 45,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.4,
      reinforcementCount: 3,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'regular', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
      ],
    },
    reward: 1810,
  },
  {
    id: 's2-blood-money',
    name: 'Blood Money',
    description:
      'Heavy raider assault on military garrison. Sparklers with starburst missiles.',
    difficulty: 'hard',
    sector: 2,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.55,
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 6 },
            { archetype: 'stinger', skill: 'veteran', count: 6 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'veteran', count: 6 },
            { archetype: 'firefly', skill: 'veteran', count: 6 },
          ],
          delay: 12,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'veteran', count: 5 },
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
          ],
          delay: 21,
        },
        {
          enemies: [
            { archetype: 'sparkler', skill: 'veteran', count: 5 },
            { archetype: 'stinger', skill: 'veteran', count: 5 },
          ],
          delay: 30,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'veteran', count: 5 },
            { archetype: 'bruiser', skill: 'veteran', count: 5 },
          ],
          delay: 39,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'veteran', count: 1 },
        { archetype: 'interceptor', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'regular', count: 1 },
      ],
    },
    reward: 7458,
  },
  {
    id: 's2-tinderbox',
    name: 'Tinderbox',
    description:
      'Locusts with cluster missiles targeting the refinery. Bruiser support incoming.',
    difficulty: 'medium',
    sector: 2,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.25,
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'regular', count: 5 },
            { archetype: 'dragonfly', skill: 'regular', count: 5 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'regular', count: 5 },
            { archetype: 'locust', skill: 'regular', count: 4 },
          ],
          delay: 20,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
            { archetype: 'bruiser', skill: 'regular', count: 3 },
          ],
          delay: 35,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'veteran', count: 4 },
            { archetype: 'stinger', skill: 'veteran', count: 4 },
          ],
          delay: 50,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.35,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'veteran', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
        { archetype: 'defender', skill: 'regular', count: 1 },
      ],
    },
    reward: 10104,
  },
];
