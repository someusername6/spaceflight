/**
 * Sector 2: Station Defense Missions
 * Defend stations from organized raider forces.
 *
 * Sector 2 enemies: firefly, dragonfly, stinger, locust, bruiser, sparkler (rookie/regular/veteran)
 * Sector 2 wingmen: veteran fighter, regular fighter, regular interceptor, regular defender
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_2_STATION_DEFENSE: Contract[] = [
  {
    id: 's2-asteroid-base',
    name: 'Asteroid Base',
    description:
      'Defend mining station from raider scouts. Fireflies and Dragonflies inbound.',
    difficulty: 'easy',
    sector: 2,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'regular', count: 2 },
            { archetype: 'dragonfly', skill: 'regular', count: 2 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'stinger', skill: 'regular', count: 2 },
            { archetype: 'firefly', skill: 'regular', count: 2 },
          ],
          delay: 22,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 3 },
            { archetype: 'stinger', skill: 'regular', count: 2 },
          ],
          delay: 36,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'regular', count: 2 },
            { archetype: 'firefly', skill: 'regular', count: 2 },
          ],
          delay: 50,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.3,
      reinforcementCount: 3,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'regular', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
      ],
    },
    reward: 8067,
  },
  {
    id: 's2-fuel-depot',
    name: 'Fuel Depot',
    description:
      'Locusts with cluster missiles targeting the refinery. Bruiser support incoming.',
    difficulty: 'medium',
    sector: 2,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'regular', count: 2 },
            { archetype: 'dragonfly', skill: 'regular', count: 2 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'regular', count: 2 },
            { archetype: 'stinger', skill: 'regular', count: 2 },
          ],
          delay: 20,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'regular', count: 2 },
            { archetype: 'dragonfly', skill: 'regular', count: 2 },
          ],
          delay: 32,
        },
        {
          enemies: [
            { archetype: 'locust', skill: 'veteran', count: 2 },
            { archetype: 'sparkler', skill: 'regular', count: 1 },
          ],
          delay: 44,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'veteran', count: 2 },
            { archetype: 'stinger', skill: 'veteran', count: 2 },
          ],
          delay: 56,
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
    reward: 16194,
  },
  {
    id: 's2-garrison-alpha',
    name: 'Garrison Alpha',
    description:
      'Heavy raider assault on military garrison. Sparklers with starburst missiles.',
    difficulty: 'hard',
    sector: 2,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'interceptor', skill: 'regular', count: 2 }],
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 3 },
            { archetype: 'stinger', skill: 'regular', count: 3 },
          ],
          delay: 4,
        },
        {
          enemies: [
            { archetype: 'sparkler', skill: 'regular', count: 2 },
            { archetype: 'locust', skill: 'regular', count: 3 },
          ],
          delay: 12,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'veteran', count: 2 },
            { archetype: 'dragonfly', skill: 'veteran', count: 3 },
          ],
          delay: 20,
        },
        {
          enemies: [
            { archetype: 'sparkler', skill: 'veteran', count: 2 },
            { archetype: 'stinger', skill: 'veteran', count: 3 },
          ],
          delay: 28,
        },
        {
          enemies: [
            { archetype: 'bruiser', skill: 'veteran', count: 3 },
            { archetype: 'locust', skill: 'veteran', count: 2 },
            { archetype: 'sparkler', skill: 'veteran', count: 2 },
          ],
          delay: 36,
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
    reward: 20406,
  },
];
