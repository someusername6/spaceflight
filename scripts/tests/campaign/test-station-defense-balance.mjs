/**
 * Station Defense Mission Balance Test
 *
 * Simulates station defense missions using the SAME code path as live gameplay:
 * - Uses mission definitions from src/ui/screens/missions/sector{1-5}/station-defense.ts
 * - Uses setupStationDefenseMission and processStationDefenseMissionTick
 * - Spawns wingmen using sector-specific loadouts
 *
 * Results show:
 * - Win/loss rate
 * - Average station health remaining
 * - Average wingman survival
 * - Reinforcement arrival timing
 * - Mission duration
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  setupStationDefenseMission,
  spawnReinforcementForReplay,
} from '../../../src/campaign/mission/station-defense-launcher.ts';
import { isDead } from '../../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { processStationDefenseMissionTick } from '../../../src/systems/station-defense.ts';
import { SECTOR_1_STATION_DEFENSE } from '../../../src/ui/screens/missions/sector1/station-defense.ts';
import { SECTOR_2_STATION_DEFENSE } from '../../../src/ui/screens/missions/sector2/station-defense.ts';
import { SECTOR_3_STATION_DEFENSE } from '../../../src/ui/screens/missions/sector3/station-defense.ts';
import { SECTOR_4_STATION_DEFENSE } from '../../../src/ui/screens/missions/sector4/station-defense.ts';
import { SECTOR_5_STATION_DEFENSE } from '../../../src/ui/screens/missions/sector5/station-defense.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';
import { SECTOR_LOADOUTS } from '../shared/mission-simulation.mjs';

// All station defense missions by sector
const ALL_STATION_DEFENSE_MISSIONS = [
  ...SECTOR_1_STATION_DEFENSE,
  ...SECTOR_2_STATION_DEFENSE,
  ...SECTOR_3_STATION_DEFENSE,
  ...SECTOR_4_STATION_DEFENSE,
  ...SECTOR_5_STATION_DEFENSE,
];

// ============================================================================
// Station Defense Mission Simulation
// ============================================================================

const DEFAULT_MAX_SIMULATION_TIME = 300;

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

  // Count ships only (exclude missiles and decoys by requiring shipIdentity)
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
        // Count original wingmen separately
        if (wingmenEntities && wingmenEntities.has(entity)) {
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
 * Run a single station defense mission simulation.
 *
 * Uses the SAME code path as live gameplay:
 * - setupStationDefenseMission spawns station and creates mission state
 * - processStationDefenseMissionTick handles wave spawning and reinforcements
 */
function runStationDefenseMission(mission, seed, sector, options = {}) {
  const maxSimulationTime =
    options.maxSimulationTime ?? DEFAULT_MAX_SIMULATION_TIME;
  const maxTicks = maxSimulationTime * TICK_RATE;
  const stationDefenseData = mission.stationDefenseData;

  if (!stationDefenseData) {
    throw new Error('Mission is not a station defense mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state (same as live game)
  world.systemState.mission = {
    missionType: 'station-defense',
    result: MissionResult.InProgress,
  };

  // Spawn sector-specific player loadout (near station)
  // First ship gets playerControlled component so missionSystem doesn't trigger immediate defeat
  // Track wingmen entity IDs for survival counting (excludes reinforcements/initial allies)
  const wingmenEntities = new Set();
  const loadout = SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
  loadout.forEach((ship, i) => {
    const x = (i - (loadout.length - 1) / 2) * 50;
    const entity = createAIShip(
      world,
      ship.archetype,
      Faction.Player,
      new Vector3(x, 0, 0), // Start in front of station
      new Quaternion(),
      ship.skill,
    );
    wingmenEntities.add(entity);
    // Mark first ship as player-controlled (needed for missionSystem player death check)
    if (i === 0) {
      addComponent(world, entity, { type: 'playerControlled', input: {} });
    }
  });

  // Setup station defense mission (spawns station, creates state with initial waves)
  // This is the SAME function used in live gameplay
  const stationState = setupStationDefenseMission(world, mission);

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    wingmenRemaining: 0,
    wingmenTotal: loadout.length,
    stationHealthRemaining: 0,
    stationHealthPercent: 0,
    reinforcementsArrived: false,
    reinforcementsSpawned: 0,
    timeout: false,
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    // Process station defense mission logic (waves, reinforcements)
    // This is the SAME function used in live gameplay
    processStationDefenseMissionTick(
      world,
      stationState,
      mission,
      TICK_SEC,
      () =>
        spawnReinforcementForReplay(
          world,
          stationState.stationPosition,
          stationDefenseData.reinforcementPool,
          stationState.reinforcementsSpawned,
        ),
    );

    // Update metrics
    const counts = countEntities(world, wingmenEntities);
    metrics.playerTeamRemaining = counts.playerTeam;
    metrics.wingmenRemaining = counts.wingmenAlive;
    metrics.stationHealthRemaining = counts.stationHealth;
    metrics.stationHealthPercent =
      counts.stationMaxHealth > 0
        ? (counts.stationHealth / counts.stationMaxHealth) * 100
        : 0;
    metrics.reinforcementsArrived = stationState.reinforcementsArrived;
    metrics.reinforcementsSpawned = stationState.reinforcementsSpawned;

    // Debug: log periodically
    if (options.debug) {
      if (tick < 3 || tick % 500 === 0) {
        console.log(
          `  Tick ${tick} (${(tick / TICK_RATE).toFixed(0)}s): station=${counts.stationAlive ? 'alive' : 'dead'} (${metrics.stationHealthPercent.toFixed(0)}%), wingmen=${counts.wingmenAlive}/${loadout.length}, enemies=${counts.enemies}, reinforced=${stationState.reinforcementsArrived}`,
        );
      }
    }

    // Check defeat: station destroyed or all players dead
    if (!counts.stationAlive) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        console.log(`  DEFEAT: Station destroyed at tick ${tick}`);
      }
      break;
    }

    if (counts.playerTeam === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        console.log(`  DEFEAT: All players dead at tick ${tick}`);
      }
      break;
    }

    // Check victory: all waves spawned, reinforcements arrived, all enemies dead
    if (stationState.completed && counts.enemies === 0) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        console.log(
          `  VICTORY at tick ${tick}: station=${metrics.stationHealthPercent.toFixed(0)}%`,
        );
      }
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = maxSimulationTime;
    // Timeout with station alive = partial victory, count as win
    const counts = countEntities(world);
    metrics.winner = counts.stationAlive ? 'player' : 'enemy';
  }

  return metrics;
}

/**
 * Run multiple trials and aggregate results.
 */
function runStationDefenseTrials(mission, sector, runs) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    // Debug first run only
    results.push(
      runStationDefenseMission(mission, seed, sector, { debug: i === 0 }),
    );
  }

  const wins = results.filter((r) => r.winner === 'player');

  // Get wingmen count from first result
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
    avgStationHealth:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.stationHealthPercent, 0) / wins.length
        : 0,
    reinforcementRate:
      (results.filter((r) => r.reinforcementsArrived).length / results.length) *
      100,
    timeouts: results.filter((r) => r.timeout).length,
    results,
  };
}

// ============================================================================
// Test Station Defense Missions (using live game mission definitions)
// ============================================================================

const TRIALS = 50;

// Parse command-line arguments for filtering missions
// Usage: npx tsx test-station-defense-balance.mjs [mission-id...]
// Examples:
//   npx tsx test-station-defense-balance.mjs s1-station-defense-1
const args = process.argv.slice(2);
const filterMissions = args.length > 0 ? args : null;

// Filter missions if specific IDs provided
const missionsToTest = filterMissions
  ? ALL_STATION_DEFENSE_MISSIONS.filter((m) => filterMissions.includes(m.id))
  : ALL_STATION_DEFENSE_MISSIONS;

if (filterMissions && missionsToTest.length === 0) {
  console.error(`No missions found matching: ${filterMissions.join(', ')}`);
  console.error('Available mission IDs:');
  for (const m of ALL_STATION_DEFENSE_MISSIONS) {
    console.error(`  ${m.id}`);
  }
  process.exit(1);
}

if (filterMissions) {
  console.log(
    `Testing ${missionsToTest.length} mission(s): ${missionsToTest.map((m) => m.id).join(', ')}\n`,
  );
}

describe('Station Defense Mission Balance', () => {
  // Test filtered or all missions
  for (const mission of missionsToTest) {
    it(`S${mission.sector} ${mission.name} (${mission.difficulty}) balance check`, () => {
      const results = runStationDefenseTrials(mission, mission.sector, TRIALS);

      console.log(
        `\n=== S${mission.sector} ${mission.name} (${mission.difficulty}) ===`,
      );
      console.log(
        `Win Rate: ${results.winRate.toFixed(1)}% (${results.wins}/${results.runs})`,
      );
      console.log(
        `Squad Survival: ${results.avgWingmenSurvivors.toFixed(2)}/${results.wingmenTotal} (on wins)`,
      );
      console.log(
        `Station Health: ${results.avgStationHealth.toFixed(1)}% (on wins)`,
      );

      // Balance targets: squad = player + wingmen (4 total in S1)
      // Targets are for 4-ship squad
      const targets = {
        easy: { minWin: 75, maxWin: 95, minSquad: 3.0, maxSquad: 3.5 },
        medium: { minWin: 60, maxWin: 80, minSquad: 2.5, maxSquad: 3.0 },
        hard: { minWin: 45, maxWin: 65, minSquad: 2.0, maxSquad: 2.5 },
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
