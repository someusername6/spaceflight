/**
 * Escort Mission Balance Test
 *
 * Simulates escort missions using the SAME code path as live gameplay:
 * - Uses mission definitions from src/ui/screens/missions/sector{1-5}/escort.ts
 * - Uses setupEscortMission and processEscortMissionTick
 * - Spawns wingmen using sector-specific loadouts
 *
 * Results show:
 * - Win/loss rate
 * - Average convoy survival
 * - Average wingman survival
 * - Mission duration
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import {
  setFactionBehaviorMode,
  setupEscortMission,
  spawnEscortEnemy,
} from '../../../src/campaign/mission/escort-launcher.ts';
import { isDead } from '../../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { processEscortMissionTick } from '../../../src/systems/escort-mission.ts';
import { SECTOR_1_ESCORT } from '../../../src/ui/screens/missions/sector1/escort.ts';
import { SECTOR_2_ESCORT } from '../../../src/ui/screens/missions/sector2/escort.ts';
import { SECTOR_3_ESCORT } from '../../../src/ui/screens/missions/sector3/escort.ts';
import { SECTOR_4_ESCORT } from '../../../src/ui/screens/missions/sector4/escort.ts';
import { SECTOR_5_ESCORT } from '../../../src/ui/screens/missions/sector5/escort.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';
import { SECTOR_LOADOUTS } from '../shared/mission-simulation.mjs';

// All escort missions by sector
const ALL_ESCORT_MISSIONS = [
  ...SECTOR_1_ESCORT,
  ...SECTOR_2_ESCORT,
  ...SECTOR_3_ESCORT,
  ...SECTOR_4_ESCORT,
  ...SECTOR_5_ESCORT,
];

// ============================================================================
// Escort Mission Simulation
// ============================================================================

const DEFAULT_MAX_SIMULATION_TIME = 300;

/**
 * Count living entities by faction and type.
 */
function countEntities(world) {
  let playerTeam = 0;
  let enemies = 0;
  let enemiesDead = 0;
  let convoyAlive = 0;
  let convoyTotal = 0;

  // Count ships only (exclude missiles and decoys by requiring shipIdentity)
  for (const entity of queryEntities(world, [
    'faction',
    'health',
    'shipIdentity',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    const convoyShip = getComponent(world, entity, 'convoyShip');

    if (convoyShip) {
      convoyTotal++;
      if (!isDead(health)) convoyAlive++;
    } else if (faction.faction === Faction.Player) {
      if (!isDead(health)) playerTeam++;
    } else if (faction.faction === Faction.Enemy) {
      if (!isDead(health)) enemies++;
      else enemiesDead++;
    }
  }

  return { playerTeam, enemies, enemiesDead, convoyAlive, convoyTotal };
}

/**
 * Run a single escort mission simulation.
 *
 * Uses the SAME code path as live gameplay:
 * - setupEscortMission spawns convoy ships and creates escort state
 * - processEscortMissionTick handles enemy spawning with initial delay
 */
function runEscortMission(mission, seed, sector, options = {}) {
  const maxSimulationTime =
    options.maxSimulationTime ?? DEFAULT_MAX_SIMULATION_TIME;
  const maxTicks = maxSimulationTime * TICK_RATE;
  const escortData = mission.escortData;

  if (!escortData) {
    throw new Error('Mission is not an escort mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state (same as live game)
  world.systemState.mission = {
    missionType: 'escort',
    result: MissionResult.InProgress,
  };

  // Spawn sector-specific player loadout (near convoy starting position)
  // First ship gets playerControlled component so missionSystem doesn't trigger immediate defeat
  const loadout = SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
  loadout.forEach((ship, i) => {
    const x = (i - (loadout.length - 1) / 2) * 50;
    const entity = createAIShip(
      world,
      ship.archetype,
      Faction.Player,
      new Vector3(x, 0, 100), // Start near convoy
      new Quaternion(),
      ship.skill,
    );
    // Mark first ship as player-controlled (needed for missionSystem player death check)
    if (i === 0) {
      addComponent(world, entity, { type: 'playerControlled', input: {} });
    }
  });

  // Setup escort mission (spawns convoy, creates state with initial spawn delay)
  // This is the SAME function used in live gameplay
  const escortState = setupEscortMission(world, mission);

  // Set wingmen to defensive mode (same as live gameplay)
  setFactionBehaviorMode(world, Faction.Player, 'defensive');

  const escapeZonePosition = new Vector3(0, 0, escortData.escapeZoneDistance);

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    convoyRemaining: 0,
    convoyTotal: escortData.convoySize,
    convoyInZone: 0,
    convoyEscaped: 0,
    jumpChargeProgress: 0,
    timeout: false,
    _lastEnemyCount: 0,
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    // Process escort mission logic (spawning with initial delay, zone detection, jump charge)
    // This is the SAME function used in live gameplay
    let spawnedThisTick = 0;
    processEscortMissionTick(world, escortState, TICK_SEC, () => {
      spawnEscortEnemy(world, escortData, escapeZonePosition);
      spawnedThisTick++;
    });
    if (spawnedThisTick > 0 && options.debug) {
      console.log(`    -> Spawned ${spawnedThisTick} enemies at tick ${tick}`);
    }

    // Update metrics
    const counts = countEntities(world);
    metrics.playerTeamRemaining = counts.playerTeam;
    metrics.convoyRemaining = counts.convoyAlive;
    metrics.convoyInZone = escortState.convoyInZone;
    metrics.jumpChargeProgress = escortState.jumpChargeProgress;

    // Debug: log periodically, and log whenever enemy count changes unexpectedly
    if (options.debug) {
      if (tick < 3 || tick % 500 === 0) {
        console.log(
          `  Tick ${tick} (${(tick / TICK_RATE).toFixed(0)}s): convoy=${counts.convoyAlive}, escaped=${escortState.escapedConvoy}, inZone=${escortState.convoyInZone}, player=${counts.playerTeam}, enemies=${counts.enemies} (dead=${counts.enemiesDead}), playerInZone=${escortState.playerInZone}`,
        );
      }
      // Track unexpected enemy count changes
      if (
        tick > 0 &&
        counts.enemies !== metrics._lastEnemyCount &&
        spawnedThisTick === 0
      ) {
        console.log(
          `    !! Enemy count changed from ${metrics._lastEnemyCount} to ${counts.enemies} without spawn at tick ${tick}`,
        );
      }
      metrics._lastEnemyCount = counts.enemies;
    }

    // Check mission completion (uses same logic as live game)
    if (world.systemState.mission.result === MissionResult.Victory) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      metrics.convoyEscaped = escortState.escapedConvoy;
      break;
    }

    if (world.systemState.mission.result === MissionResult.Defeat) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        console.log(
          `  DEFEAT at tick ${tick}: convoy=${counts.convoyAlive}, escaped=${escortState.escapedConvoy}`,
        );
      }
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = maxSimulationTime;
    // Timeout = loss (didn't complete jump)
    metrics.winner = 'enemy';
  }

  return metrics;
}

/**
 * Run multiple trials and aggregate results.
 */
function runEscortTrials(mission, sector, runs) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    // Debug first run only
    results.push(runEscortMission(mission, seed, sector, { debug: i === 0 }));
  }

  const wins = results.filter((r) => r.winner === 'player');
  const convoyTotal = mission.escortData.convoySize;

  return {
    runs,
    wins: wins.length,
    losses: results.length - wins.length,
    winRate: (wins.length / results.length) * 100,
    avgTime:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.timeToComplete, 0) / wins.length
        : 0,
    avgPlayerSurvivors:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.playerTeamRemaining, 0) / wins.length
        : 0,
    avgConvoySurvivors:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.convoyEscaped, 0) / wins.length
        : 0,
    avgConvoySurvivalRate:
      wins.length > 0
        ? (wins.reduce((s, r) => s + r.convoyEscaped, 0) /
            wins.length /
            convoyTotal) *
          100
        : 0,
    timeouts: results.filter((r) => r.timeout).length,
    results,
  };
}

// ============================================================================
// Test Escort Missions (using live game mission definitions)
// ============================================================================

const TRIALS = 50;

// Parse command-line arguments for filtering missions
// Usage: npx tsx test-escort-balance.mjs [mission-id...]
// Examples:
//   npx tsx test-escort-balance.mjs s1-supply-run s1-convoy-defense
//   npx tsx test-escort-balance.mjs s5-wraith-hunt
const args = process.argv.slice(2);
const filterMissions = args.length > 0 ? args : null;

// Filter missions if specific IDs provided
const missionsToTest = filterMissions
  ? ALL_ESCORT_MISSIONS.filter((m) => filterMissions.includes(m.id))
  : ALL_ESCORT_MISSIONS;

if (filterMissions && missionsToTest.length === 0) {
  console.error(`No missions found matching: ${filterMissions.join(', ')}`);
  console.error('Available mission IDs:');
  for (const m of ALL_ESCORT_MISSIONS) {
    console.error(`  ${m.id}`);
  }
  process.exit(1);
}

if (filterMissions) {
  console.log(
    `Testing ${missionsToTest.length} mission(s): ${missionsToTest.map((m) => m.id).join(', ')}\n`,
  );
}

describe('Escort Mission Balance', () => {
  // Test filtered or all missions
  for (const mission of missionsToTest) {
    it(`S${mission.sector} ${mission.name} (${mission.difficulty}) balance check`, () => {
      const results = runEscortTrials(mission, mission.sector, TRIALS);

      console.log(
        `\n=== S${mission.sector} ${mission.name} (${mission.difficulty}) ===`,
      );
      console.log(
        `Win Rate: ${results.winRate.toFixed(1)}% (${results.wins}/${results.runs})`,
      );
      console.log(`Avg Time to Win: ${results.avgTime.toFixed(1)}s`);
      // Get squad size from sector loadout
      const loadout = SECTOR_LOADOUTS[mission.sector] || SECTOR_LOADOUTS[1];
      const squadSize = loadout.length;
      console.log(
        `Squad Survival: ${results.avgPlayerSurvivors.toFixed(2)}/${squadSize} (on wins)`,
      );
      console.log(
        `Avg Convoy Survivors: ${results.avgConvoySurvivors.toFixed(1)}/${mission.escortData.convoySize}`,
      );
      console.log(
        `Avg Convoy Survival Rate: ${results.avgConvoySurvivalRate.toFixed(1)}%`,
      );
      console.log(`Timeouts: ${results.timeouts}`);

      // Balance targets: squad = player + wingmen
      // Base targets are for 4-ship squad, scaled by actual squad size
      const baseTargets = {
        easy: { minWin: 75, maxWin: 95, minSquad: 3.0, maxSquad: 3.5 },
        medium: { minWin: 60, maxWin: 80, minSquad: 2.5, maxSquad: 3.0 },
        hard: { minWin: 45, maxWin: 65, minSquad: 2.0, maxSquad: 2.5 },
      };
      const baseTarget = baseTargets[mission.difficulty];
      // Scale squad targets by actual squad size (base is 4 ships)
      const scaleFactor = squadSize / 4;
      const target = {
        minWin: baseTarget.minWin,
        maxWin: baseTarget.maxWin,
        minSquad: baseTarget.minSquad * scaleFactor,
        maxSquad: baseTarget.maxSquad * scaleFactor,
      };

      // Report win rate status
      let winStatus = 'BALANCED';
      if (results.winRate < target.minWin) {
        winStatus = 'TOO HARD';
      } else if (results.winRate > target.maxWin) {
        winStatus = 'TOO EASY';
      }

      // Report squad survival status
      let squadStatus = 'BALANCED';
      if (results.avgPlayerSurvivors < target.minSquad) {
        squadStatus = 'TOO FEW';
      } else if (results.avgPlayerSurvivors > target.maxSquad) {
        squadStatus = 'TOO MANY';
      }

      console.log(
        `WIN RATE: ${winStatus} (target ${target.minWin}-${target.maxWin}%)`,
      );
      console.log(
        `SQUAD: ${squadStatus} (target ${target.minSquad.toFixed(2)}-${target.maxSquad.toFixed(2)})`,
      );

      // Assert win rate is non-zero (mission is completable)
      assert.ok(
        results.wins > 0,
        `Mission should be winnable (got ${results.wins} wins)`,
      );
    });
  }
});
