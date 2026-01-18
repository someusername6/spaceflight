/**
 * Sector 1: Station Defense Missions
 * Defend mining stations from pirate raiders until reinforcements arrive.
 *
 * Station defense missions have:
 * - Large station with health/shields to protect
 * - Wave-based enemy spawns with escalating difficulty
 * - Reinforcements arrive after time OR when station health is low
 * - Reward scales with remaining station health
 *
 * Sector 1 enemies: gnat, ember, shocker, mantis (rookie/regular skill)
 */

import type { Contract } from '../../../../campaign/types';

export const SECTOR_1_STATION_DEFENSE: Contract[] = [
  {
    id: 's1-orbital-defense',
    name: 'Orbital Defense',
    description:
      'Defend the mining station from pirate raiders until reinforcements arrive.',
    difficulty: 'medium',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'mining',
      stationDistance: -400, // Behind player spawn (negative Z, player faces -Z)
      waves: [
        {
          enemies: [{ archetype: 'gnat', skill: 'rookie', count: 3 }],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'ember', skill: 'rookie', count: 2 }],
          delay: 25,
        },
        {
          enemies: [
            { archetype: 'gnat', skill: 'regular', count: 2 },
            { archetype: 'ember', skill: 'rookie', count: 2 },
          ],
          delay: 30,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'rookie', count: 2 }],
          delay: 35,
        },
      ],
      reinforcementTime: null, // Reinforcements arrive after final wave spawns
      reinforcementHealthThreshold: 0.25, // Or when station below 25% health
      reinforcementCount: 4,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'regular', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
      ],
    },
    reward: 3500,
  },
  {
    id: 's1-station-siege',
    name: 'Station Siege',
    description:
      'Heavy pirate assault on refinery station. Hold until the cavalry arrives.',
    difficulty: 'hard',
    sector: 1,
    missionType: 'station-defense',
    stationDefenseData: {
      stationType: 'refinery',
      stationDistance: -350, // Behind player spawn (negative Z, player faces -Z)
      waves: [
        {
          enemies: [
            { archetype: 'gnat', skill: 'rookie', count: 2 },
            { archetype: 'ember', skill: 'rookie', count: 2 },
          ],
          delay: 10,
        },
        {
          enemies: [{ archetype: 'mantis', skill: 'rookie', count: 2 }],
          delay: 20,
        },
        {
          enemies: [
            { archetype: 'shocker', skill: 'regular', count: 2 },
            { archetype: 'gnat', skill: 'regular', count: 2 },
          ],
          delay: 25,
        },
        {
          enemies: [
            { archetype: 'ember', skill: 'regular', count: 2 },
            { archetype: 'mantis', skill: 'rookie', count: 2 },
          ],
          delay: 30,
        },
        {
          enemies: [{ archetype: 'shocker', skill: 'regular', count: 3 }],
          delay: 35,
        },
      ],
      reinforcementTime: null, // Reinforcements arrive after final wave spawns
      reinforcementHealthThreshold: 0.2, // Or when station below 20% health
      reinforcementCount: 5,
      reinforcementPool: [
        { archetype: 'fighter', skill: 'veteran', count: 1 },
        { archetype: 'interceptor', skill: 'regular', count: 1 },
        { archetype: 'striker', skill: 'regular', count: 1 },
      ],
    },
    reward: 5500,
  },
];
