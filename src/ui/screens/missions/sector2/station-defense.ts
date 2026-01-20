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
      playerThreatRatio: 0.1,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'veteran', count: 7 },
            { archetype: 'dragonfly', skill: 'veteran', count: 7 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'veteran', count: 7 },
            { archetype: 'firefly', skill: 'veteran', count: 7 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
            { archetype: 'stinger', skill: 'ace', count: 6 },
          ],
          delay: 13,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'ace', count: 6 },
            { archetype: 'firefly', skill: 'ace', count: 6 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
            { archetype: 'stinger', skill: 'ace', count: 6 },
          ],
          delay: 28,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 33,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
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
      playerThreatRatio: 0.3,
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [],
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
            { archetype: 'stinger', skill: 'ace', count: 6 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'ace', count: 6 },
            { archetype: 'firefly', skill: 'ace', count: 6 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 13,
        },
        {
          enemies: [
            { archetype: 'sparkler', skill: 'ace', count: 6 },
            { archetype: 'stinger', skill: 'ace', count: 6 },
          ],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'ace', count: 6 },
            { archetype: 'bruiser', skill: 'ace', count: 6 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'sparkler', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 28,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 6 },
            { archetype: 'stinger', skill: 'ace', count: 6 },
          ],
          delay: 33,
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
      playerThreatRatio: 0.26,
      stationType: 'mining',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'ace', count: 6 },
            { archetype: 'locust', skill: 'ace', count: 5 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
            { archetype: 'bruiser', skill: 'ace', count: 5 },
          ],
          delay: 13,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 6 },
            { archetype: 'stinger', skill: 'ace', count: 6 },
          ],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'ace', count: 5 },
            { archetype: 'stinger', skill: 'ace', count: 5 },
          ],
          delay: 28,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
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
