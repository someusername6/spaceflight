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
    id: 's4-dark-matter',
    name: 'Dark Matter',
    description:
      'Phantom infiltrators targeting the mining station. Torpedoes inbound.',
    difficulty: 'easy',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.1,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 5 },
            { archetype: 'firefly', skill: 'veteran', count: 5 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'veteran', count: 6 },
            { archetype: 'firefly', skill: 'veteran', count: 6 },
          ],
          delay: 12,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 19,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 5 },
            { archetype: 'firefly', skill: 'ace', count: 5 },
          ],
          delay: 26,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 33,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
      ],
    },
    reward: 6488,
  },
  {
    id: 's4-omega-point',
    name: 'Omega Point',
    description:
      'Elite phantom strike on command station. Ace pilots with torpedo support.',
    difficulty: 'hard',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.4,
      stationType: 'mining',
      stationDistance: -300,
      waves: [
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 8 },
            { archetype: 'phantom', skill: 'ace', count: 6 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 8 },
            { archetype: 'firefly', skill: 'ace', count: 8 },
          ],
          delay: 7,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 8 },
            { archetype: 'dragonfly', skill: 'ace', count: 8 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 8 },
            { archetype: 'firefly', skill: 'ace', count: 8 },
          ],
          delay: 15,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 8 },
            { archetype: 'dragonfly', skill: 'ace', count: 8 },
          ],
          delay: 19,
        },
        {
          enemies: [
            { archetype: 'firefly', skill: 'ace', count: 8 },
            { archetype: 'phantom', skill: 'ace', count: 8 },
          ],
          delay: 23,
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
    reward: 14408,
  },
  {
    id: 's4-chain-reaction',
    name: 'Chain Reaction',
    description:
      'Veteran phantom squadron targeting the refinery. Heavy torpedo threat.',
    difficulty: 'medium',
    sector: 4,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.15,
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
            { archetype: 'phantom', skill: 'ace', count: 6 },
            { archetype: 'firefly', skill: 'ace', count: 6 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 13,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
            { archetype: 'firefly', skill: 'ace', count: 6 },
          ],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 23,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'veteran', count: 1 },
        { archetype: 'defender', skill: 'veteran', count: 1 },
        { archetype: 'sentinel', skill: 'regular', count: 1 },
      ],
    },
    reward: 14729,
  },
];
