/**
 * Sector 5: Station Defense Missions
 * Defend stations from endless elite forces.
 *
 * Sector 5 enemies: phantom, scorpion, wraith, dragonfly (veteran/ace)
 * Sector 5 wingmen: 2x ace striker, 2x ace defender, 2x ace sentinel
 *
 * Station types: mining (balanced), refinery (high hull), military (high shields + initial allies)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_5_STATION_DEFENSE: Contract[] = [
  {
    id: 's5-frontier-station',
    name: 'Frontier Station',
    description:
      'Scorpion snipers targeting the mining station. Railgun fire from range.',
    difficulty: 'easy',
    sector: 5,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'mining',
      stationDistance: -400,
      waves: [
        {
          enemies: [{ archetype: 'phantom', skill: 'veteran', count: 2 }],
          delay: 8,
        },
        {
          enemies: [{ archetype: 'scorpion', skill: 'veteran', count: 1 }],
          delay: 18,
        },
        {
          enemies: [
            { archetype: 'dragonfly', skill: 'ace', count: 2 },
            { archetype: 'phantom', skill: 'veteran', count: 2 },
          ],
          delay: 28,
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'veteran', count: 1 },
            { archetype: 'phantom', skill: 'ace', count: 2 },
          ],
          delay: 40,
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
    reward: 4072,
  },
  {
    id: 's5-omega-refinery',
    name: 'Omega Refinery',
    description:
      'Wraith with nuclear lance targeting the refinery. Critical threat level.',
    difficulty: 'medium',
    sector: 5,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'refinery',
      stationDistance: -350,
      waves: [
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 2 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 6,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'veteran', count: 1 },
            { archetype: 'phantom', skill: 'ace', count: 3 },
          ],
          delay: 16,
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'ace', count: 1 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 26,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 1 },
            { archetype: 'phantom', skill: 'ace', count: 3 },
          ],
          delay: 36,
        },
        {
          enemies: [
            { archetype: 'scorpion', skill: 'ace', count: 1 },
            { archetype: 'wraith', skill: 'ace', count: 1 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 46,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.25,
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'ace', count: 1 },
        { archetype: 'sentinel', skill: 'ace', count: 1 },
      ],
    },
    reward: 16758,
  },
  {
    id: 's5-last-bastion',
    name: 'Last Bastion',
    description:
      'Massive elite assault on final military outpost. Wraiths, Scorpions, and ace pilots.',
    difficulty: 'hard',
    sector: 5,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'military',
      stationDistance: -300,
      initialAllies: [
        { archetype: 'striker', skill: 'ace', count: 2 },
        { archetype: 'sentinel', skill: 'ace', count: 1 },
      ],
      waves: [
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 2 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 5,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 1 },
            { archetype: 'scorpion', skill: 'ace', count: 1 },
          ],
          delay: 14,
        },
        {
          enemies: [
            { archetype: 'phantom', skill: 'ace', count: 3 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 23,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 1 },
            { archetype: 'scorpion', skill: 'ace', count: 1 },
            { archetype: 'phantom', skill: 'ace', count: 2 },
          ],
          delay: 32,
        },
        {
          enemies: [
            { archetype: 'wraith', skill: 'ace', count: 1 },
            { archetype: 'phantom', skill: 'ace', count: 2 },
            { archetype: 'dragonfly', skill: 'ace', count: 3 },
          ],
          delay: 42,
        },
      ],
      reinforcementTime: null,
      reinforcementHealthThreshold: 0.2,
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'striker', skill: 'ace', count: 1 },
        { archetype: 'defender', skill: 'ace', count: 1 },
        { archetype: 'sentinel', skill: 'ace', count: 1 },
      ],
    },
    reward: 22068,
  },
];
