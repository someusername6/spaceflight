/**
 * Attack Station Mission Balance Test
 *
 * Simulates attack station missions using the SAME code path as live gameplay:
 * - Uses mission definitions from src/ui/screens/missions/sector1/attack-station.ts
 * - Uses setupAttackStationMission and processAttackStationMissionTick
 * - Spawns wingmen using sector-specific loadouts
 *
 * Results show:
 * - Win/loss rate (station destroyed vs player dies)
 * - Average station damage dealt
 * - Average wingman survival
 * - Whether overwhelming wave spawned (soft time limit)
 * - Mission duration
 *
 * Balance targets (from attack-station.ts header):
 * - Easy: 70-90% win rate, 2.5-3.5 squad survival
 * - Medium: 55-75% win rate, 2.0-3.0 squad survival
 * - Hard: 40-60% win rate, 1.5-2.5 squad survival
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  assignDpsBasedBehavior,
  processAttackStationMissionTick,
  setupAttackStationMission,
} from '../../../src/campaign/mission/attack-station-launcher.ts';
import { isDead } from '../../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { SECTOR_1_ATTACK_STATION } from '../../../src/ui/screens/missions/sector1/attack-station.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';
import { SECTOR_ASSAULT_LOADOUTS } from '../shared/mission-simulation.mjs';

// All attack station missions (only sector 1 for now)
const ALL_ATTACK_STATION_MISSIONS = [...SECTOR_1_ATTACK_STATION];

// ============================================================================
// Attack Station Mission Simulation
// ============================================================================

const DEFAULT_MAX_SIMULATION_TIME = 180; // Shorter since overwhelming wave is soft time limit

/**
 * Count living entities by faction and type.
 * @param {Set<number>} [wingmenEntities] - Set of original wingman entity IDs to track separately
 */
function countEntities(world, wingmenEntities = null) {
  let playerTeam = 0;
  let wingmenAlive = 0;
  let enemies = 0;
  let stationAlive = false;
  let stationHealth = 0;
  let stationMaxHealth = 0;

  for (const entity of queryEntities(world, ['faction', 'health'])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    const structure = getComponent(world, entity, 'structure');

    if (structure?.structureType === 'station') {
      stationAlive = !isDead(health);
      stationHealth = health.hull;
      stationMaxHealth = health.maxHull;
    } else if (faction.faction === Faction.Player) {
      const identity = getComponent(world, entity, 'shipIdentity');
      if (identity && !isDead(health)) {
        playerTeam++;
        if (wingmenEntities?.has(entity)) {
          wingmenAlive++;
        }
      }
    } else if (faction.faction === Faction.Enemy) {
      const identity = getComponent(world, entity, 'shipIdentity');
      if (identity && !isDead(health)) enemies++;
    }
  }

  return {
    playerTeam,
    wingmenAlive,
    enemies,
    stationAlive,
    stationHealth,
    stationMaxHealth,
  };
}

/**
 * Run a single attack station mission simulation.
 *
 * Uses the SAME code path as live gameplay:
 * - setupAttackStationMission spawns station and defenders
 * - processAttackStationMissionTick handles reinforcements and overwhelming wave
 */
function runAttackStationMission(mission, seed, sector, options = {}) {
  const maxSimulationTime =
    options.maxSimulationTime ?? DEFAULT_MAX_SIMULATION_TIME;
  const maxTicks = maxSimulationTime * TICK_RATE;
  const attackStationData = mission.attackStationData;

  if (!attackStationData) {
    throw new Error('Mission is not an attack station mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state (same as live game)
  world.systemState.mission = {
    missionType: 'attack-station',
    result: MissionResult.InProgress,
  };

  // Spawn sector-specific ATTACK STATION loadout (at origin, facing station)
  // These include high DPS ships (bombers) for attacking the station
  const wingmenEntities = new Set();
  const loadout = SECTOR_ASSAULT_LOADOUTS[sector] || SECTOR_ASSAULT_LOADOUTS[1];
  loadout.forEach((ship, i) => {
    const x = (i - (loadout.length - 1) / 2) * 50;
    const entity = createAIShip(
      world,
      ship.archetype,
      Faction.Player,
      new Vector3(x, 0, 0),
      new Quaternion(),
      ship.skill,
    );
    wingmenEntities.add(entity);
    // Mark first ship as player-controlled
    if (i === 0) {
      addComponent(world, entity, { type: 'playerControlled', input: {} });
    }
  });

  // Setup attack station mission (spawns enemy station and defenders)
  const attackState = setupAttackStationMission(world, mission);

  // Assign DPS-based behavior to player faction ships
  assignDpsBasedBehavior(world, attackStationData.stationAttackDpsThreshold);

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    wingmenRemaining: 0,
    wingmenTotal: loadout.length,
    stationDamagePercent: 0,
    reinforcementsSpawned: 0,
    overwhelmingSpawned: false,
    timeout: false,
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    // Process attack station mission logic (reinforcements, overwhelming wave)
    processAttackStationMissionTick(world, attackState, mission, TICK_SEC);

    // Update metrics
    const counts = countEntities(world, wingmenEntities);
    metrics.playerTeamRemaining = counts.playerTeam;
    metrics.wingmenRemaining = counts.wingmenAlive;
    metrics.reinforcementsSpawned = attackState.reinforcementsSpawned;
    metrics.overwhelmingSpawned = attackState.overwhelmingSpawned;

    // Calculate station damage
    if (counts.stationMaxHealth > 0) {
      metrics.stationDamagePercent =
        ((counts.stationMaxHealth - counts.stationHealth) /
          counts.stationMaxHealth) *
        100;
    }

    // Debug: log periodically
    if (options.debug) {
      if (tick < 3 || tick % 500 === 0) {
        console.log(
          `  Tick ${tick} (${(tick / TICK_RATE).toFixed(0)}s): station=${counts.stationAlive ? 'alive' : 'DESTROYED'} (dmg ${metrics.stationDamagePercent.toFixed(0)}%), squad=${counts.wingmenAlive}/${loadout.length}, enemies=${counts.enemies}, overwhelmed=${attackState.overwhelmingSpawned}`,
        );
      }
    }

    // Check victory: station destroyed
    if (!counts.stationAlive) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        console.log(
          `  VICTORY: Station destroyed at tick ${tick} (${metrics.timeToComplete.toFixed(1)}s)`,
        );
      }
      break;
    }

    // Check defeat: all players dead
    if (counts.playerTeam === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        console.log(`  DEFEAT: All players dead at tick ${tick}`);
      }
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = maxSimulationTime;
    // Timeout = defeat (station not destroyed in time)
    metrics.winner = 'enemy';
    if (options.debug) {
      console.log(
        `  TIMEOUT: Station survived with ${metrics.stationDamagePercent.toFixed(0)}% damage`,
      );
    }
  }

  return metrics;
}

/**
 * Run multiple trials and aggregate results.
 */
function runAttackStationTrials(mission, sector, runs) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    // Debug first run only
    results.push(
      runAttackStationMission(mission, seed, sector, { debug: i === 0 }),
    );
  }

  const wins = results.filter((r) => r.winner === 'player');
  const wingmenTotal = results[0]?.wingmenTotal ?? 4;

  return {
    runs,
    wins: wins.length,
    losses: results.length - wins.length,
    winRate: (wins.length / results.length) * 100,
    avgTime:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.timeToComplete, 0) / wins.length
        : 0,
    avgWingmenSurvivors:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.wingmenRemaining, 0) / wins.length
        : 0,
    wingmenTotal,
    avgStationDamage:
      results.reduce((s, r) => s + r.stationDamagePercent, 0) / results.length,
    overwhelmRate:
      (results.filter((r) => r.overwhelmingSpawned).length / results.length) *
      100,
    timeouts: results.filter((r) => r.timeout).length,
    results,
  };
}

// ============================================================================
// Test Attack Station Missions
// ============================================================================

const TRIALS = 50;

// Parse command-line arguments for filtering missions
const args = process.argv.slice(2);
const filterMissions = args.length > 0 ? args : null;

const missionsToTest = filterMissions
  ? ALL_ATTACK_STATION_MISSIONS.filter((m) => filterMissions.includes(m.id))
  : ALL_ATTACK_STATION_MISSIONS;

if (filterMissions && missionsToTest.length === 0) {
  console.error(`No missions found matching: ${filterMissions.join(', ')}`);
  console.error('Available mission IDs:');
  for (const m of ALL_ATTACK_STATION_MISSIONS) {
    console.error(`  ${m.id}`);
  }
  process.exit(1);
}

if (filterMissions) {
  console.log(
    `Testing ${missionsToTest.length} mission(s): ${missionsToTest.map((m) => m.id).join(', ')}\n`,
  );
}

describe('Attack Station Mission Balance', () => {
  for (const mission of missionsToTest) {
    it(`S${mission.sector} ${mission.name} (${mission.difficulty}) balance check`, () => {
      const results = runAttackStationTrials(mission, mission.sector, TRIALS);

      console.log(
        `\n=== S${mission.sector} ${mission.name} (${mission.difficulty}) ===`,
      );
      console.log(
        `Win Rate: ${results.winRate.toFixed(1)}% (${results.wins}/${results.runs})`,
      );
      console.log(`Avg Time to Win: ${results.avgTime.toFixed(1)}s`);
      console.log(
        `Squad Survival: ${results.avgWingmenSurvivors.toFixed(2)}/${results.wingmenTotal} (on wins)`,
      );
      console.log(
        `Avg Station Damage: ${results.avgStationDamage.toFixed(1)}%`,
      );
      console.log(`Overwhelm Rate: ${results.overwhelmRate.toFixed(1)}%`);
      console.log(`Timeouts: ${results.timeouts}`);

      // Balance targets (attack-station: wins are fast with high survival)
      const targets = {
        easy: { minWin: 70, maxWin: 90, minSquad: 2.0, maxSquad: 3.0 },
        medium: { minWin: 55, maxWin: 75, minSquad: 2.0, maxSquad: 3.0 },
        hard: { minWin: 40, maxWin: 60, minSquad: 1.5, maxSquad: 2.5 },
      };
      const target = targets[mission.difficulty];

      // Report win rate status
      let winStatus = 'BALANCED';
      if (results.winRate < target.minWin) {
        winStatus = 'TOO HARD';
      } else if (results.winRate > target.maxWin) {
        winStatus = 'TOO EASY';
      }

      // Report squad survival status
      let squadStatus = 'BALANCED';
      if (results.avgWingmenSurvivors < target.minSquad) {
        squadStatus = 'TOO FEW';
      } else if (results.avgWingmenSurvivors > target.maxSquad) {
        squadStatus = 'TOO MANY';
      }

      console.log(
        `WIN RATE: ${winStatus} (target ${target.minWin}-${target.maxWin}%)`,
      );
      console.log(
        `SQUAD: ${squadStatus} (target ${target.minSquad}-${target.maxSquad})`,
      );

      // Assert win rate is non-zero (mission is completable)
      assert.ok(
        results.wins > 0,
        `Mission should be winnable (got ${results.wins} wins)`,
      );
    });
  }
});
