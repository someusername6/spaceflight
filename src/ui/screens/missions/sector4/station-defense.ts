/**
 * Sector 4: Station Defense Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Defend stations from core systems strike forces.
 * playerThreatRatio controls enemy targeting split.
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 * Sector 4 enemies: phantom, firefly, dragonfly (regular/veteran/ace)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_4_STATION_DEFENSE: Contract[] = [
  {
    id: 's4-deep-core-mine',
    name: 'Deep Core Mine',
    description:
      'Phantom infiltrators targeting the mining station. Torpedoes inbound.',
    difficulty: 'easy',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.3,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'phantom', skill: 'regular', count: 3 },
            { archetype: 'firefly', skill: 'regular', count: 4 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'regular', count: 5 },
            { archetype: 'firefly', skill: 'regular', count: 4 },
          ],
          delay: 15,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'regular', count: 3 },
            { archetype: 'dragonfly', skill: 'regular', count: 4 },
          ],
          delay: 25,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 2 },
            { archetype: 'firefly', skill: 'veteran', count: 3 },
          ],
          delay: 35,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.3,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
      ],
    },
    reward: 3100,
  },
  {
    id: 's4-fusion-plant',
    name: 'Fusion Plant',
    description:
      'Veteran phantom squadron targeting the refinery. Heavy torpedo threat.',
    difficulty: 'medium',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.3,
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'firefly', skill: 'veteran', count: 6 },
            { archetype: 'dragonfly', skill: 'veteran', count: 6 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'regular', count: 5 },
            { archetype: 'firefly', skill: 'veteran', count: 5 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 5 },
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
          ],
          delay: 17,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
            { archetype: 'firefly', skill: 'ace', count: 4 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 5 },
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
          ],
          delay: 29,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'sentinel', skill: 'regular', count: 1 },
      ],
    },
    reward: 11497,
  },
  {
    id: 's4-command-station',
    name: 'Command Station',
    description:
      'Elite phantom strike on command station. Ace pilots with torpedo support.',
    difficulty: 'hard',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.65,
      stationType: 'military',
      stationDistance: -300,
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 6 },
            { archetype: 'phantom', skill: 'regular', count: 5 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 5 },
            { archetype: 'firefly', skill: 'veteran', count: 5 },
          ],
          delay: 9,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 15,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 5 },
            { archetype: 'firefly', skill: 'veteran', count: 5 },
          ],
          delay: 21,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 27,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 4 },
            { archetype: 'phantom', skill: 'veteran', count: 4 },
          ],
          delay: 33,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'sentinel', skill: 'veteran', count: 1 },
      ],
    },
    reward: 12937,
  },
];
