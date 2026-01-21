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
    id: 's1-the-rock',
    name: 'The Rock',
    description:
      'Heavy pirate assault on military outpost. Mantis fighters deploying decoys.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.3,
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [{ archetype: 'fighter', skill: 'regular', count: 1 }],
      waves: [
        {
          enemies: [
            { archetype: 'gnat', skill: 'ace', count: 7 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 3,
        },
        {
          enemies: [
            { archetype: 'ember', skill: 'ace', count: 7 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 7,
        },
        {
          enemies: [
            { archetype: 'shocker', skill: 'ace', count: 7 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 11,
        },
        {
          enemies: [
            { archetype: 'mantis', skill: 'ace', count: 7 },
            { archetype: 'phantom', skill: 'ace', count: 4 },
          ],
          delay: 15,
        },
        {
          enemies: [
            { archetype: 'gnat', skill: 'ace', count: 7 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 19,
        },
        {
          enemies: [
            { archetype: 'ember', skill: 'ace', count: 7 },
            { archetype: 'phantom', skill: 'ace', count: 5 },
          ],
          delay: 23,
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
    reward: 7947,
  },
  {
    id: 's1-easy-pickings',
    name: 'Easy Pickings',
    description:
      'Defend the mining station from rookie pirates until reinforcements arrive.',
    difficulty: 'easy',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.3,
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'ace', count: 6 }],
          delay: 5,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'ace', count: 6 }],
          delay: 12,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'ace', count: 6 }],
          delay: 19,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'ace', count: 6 }],
          delay: 26,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'ace', count: 6 }],
          delay: 33,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'regular', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
      ],
    },
    reward: 8712,
  },
  {
    id: 's1-burn-notice',
    name: 'Burn Notice',
    description:
      'Ion-armed shockers are targeting the refinery. Hold until backup arrives.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      playerThreatRatio: 0.5,
      stationType: 'mining',
      stationDistance: -350,
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'ace', count: 9 }],
          delay: 3,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'ace', count: 9 }],
          delay: 7,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'ace', count: 9 }],
          delay: 11,
        },
        {
          enemies: [{ archetype: 'mantis', skill: 'ace', count: 7 }],
          delay: 15,
        },
        {
          enemies: [{ archetype: 'gnat', skill: 'ace', count: 9 }],
          delay: 19,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'ace', count: 9 }],
          delay: 23,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'ace', count: 9 }],
          delay: 27,
        },
        {
          enemies: [{ archetype: 'mantis', skill: 'ace', count: 7 }],
          delay: 31,
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
    reward: 12753,
  },
];
