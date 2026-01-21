/**
 * Sector 5: Station Defense Missions (target win rates by difficulty)
 * - Easy: 75-95% win rate, 3.0-3.5 squad survival
 * - Medium: 60-80% win rate, 2.5-3.0 squad survival
 * - Hard: 45-65% win rate, 2.0-2.5 squad survival
 *
 * Defend stations from endless elite forces.
 * playerThreatRatio controls enemy targeting split.
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 * Sector 5 enemies: phantom, scorpion, wraith, dragonfly (veteran/ace)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_STATION_DEFENSE: Contract[] = [
  {
    id: 's5-edge-of-night',
    name: 'Edge of Night',
    description:
      'Scorpion snipers targeting the mining station. Railgun fire from range.',
    difficulty: 'easy',
    sector: 5,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.2,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [
            { archetype: 'phantom', skill: 'veteran', count: 5 },
            { archetype: 'dragonfly', skill: 'veteran', count: 5 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'veteran', count: 2 },
            { archetype: 'phantom', skill: 'veteran', count: 4 },
          ],
          delay: 14,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'ace', count: 2 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 32,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.3,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'ace', count: 1 },
        { archetype: 'sentinel', skill: 'ace', count: 1 },
      ],
    },
    reward: 9733,
  },
  {
    id: 's5-meltdown',
    name: 'Meltdown',
    description:
      'Wraith with nuclear lance targeting the refinery. Critical threat level.',
    difficulty: 'medium',
    sector: 5,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.5,
      stationType: 'mining',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 5 },
            { archetype: 'scorpion', skill: 'ace', count: 5 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 2,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 5 },
            { archetype: 'scorpion', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 5 },
            { archetype: 'scorpion', skill: 'ace', count: 5 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 8,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 5 },
            { archetype: 'scorpion', skill: 'ace', count: 5 },
            { archetype: 'dragonfly', skill: 'ace', count: 5 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 4 },
            { archetype: 'scorpion', skill: 'ace', count: 4 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 14,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.15,
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'ace', count: 1 },
        { archetype: 'sentinel', skill: 'ace', count: 1 },
      ],
    },
    reward: 24945,
  },
  {
    id: 's5-final-stand',
    name: 'Final Stand',
    description:
      'Massive elite assault on final military outpost. Wraiths, Scorpions, and ace pilots.',
    difficulty: 'hard',
    sector: 5,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.3,
      stationType: 'mining',
      stationDistance: -300,
      waves: [
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 3 },
            { archetype: 'scorpion', skill: 'ace', count: 3 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 9,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 15,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 3 },
            { archetype: 'scorpion', skill: 'ace', count: 3 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 21,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 3 },
            { archetype: 'phantom', skill: 'ace', count: 6 },
            { archetype: 'dragonfly', skill: 'ace', count: 6 },
          ],
          delay: 27,
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'ace', count: 3 },
            { archetype: 'wraith', skill: 'ace', count: 3 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 33,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.15,
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'ace', count: 1 },
        { archetype: 'sentinel', skill: 'ace', count: 1 },
      ],
    },
    reward: 26501,
  },
];
