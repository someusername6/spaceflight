/**
 * Escort Mission Balance Test
 *
 * Simulates escort missions using the SAME code path as live gameplay:
 * - Uses mission definitions from src/ui/screens/missions/sector1/escort.ts
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
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { processEscortMissionTick } from '../../../src/systems/escort-mission.ts';
import { SECTOR_1_ESCORT } from '../../../src/ui/screens/missions/sector1/escort.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';
import { SECTOR_LOADOUTS } from '../shared/mission-simulation.mjs';

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
  let convoyAlive = 0;
  let convoyTotal = 0;

  for (const entity of queryEntities(world, ['faction', 'health'])) {
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
    }
  }

  return { playerTeam, enemies, convoyAlive, convoyTotal };
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
    isEscortMission: false,
    result: null,
  };

  // Spawn sector-specific player loadout (near convoy starting position)
  const loadout = SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
  loadout.forEach((ship, i) => {
    const x = (i - (loadout.length - 1) / 2) * 50;
    createAIShip(
      world,
      ship.archetype,
      Faction.Player,
      new Vector3(x, 0, 100), // Start near convoy
      new Quaternion(),
      ship.skill,
    );
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
    jumpChargeProgress: 0,
    timeout: false,
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    // Process escort mission logic (spawning with initial delay, zone detection, jump charge)
    // This is the SAME function used in live gameplay
    processEscortMissionTick(world, escortState, TICK_SEC, () => {
      spawnEscortEnemy(world, escortData, escapeZonePosition);
    });

    // Update metrics
    const counts = countEntities(world);
    metrics.playerTeamRemaining = counts.playerTeam;
    metrics.convoyRemaining = counts.convoyAlive;
    metrics.convoyInZone = escortState.convoyInZone;
    metrics.jumpChargeProgress = escortState.jumpChargeProgress;

    // Check victory: jump charge complete
    if (escortState.completed && escortState.jumpChargeProgress >= 1) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }

    // Check defeat: all convoy destroyed
    if (counts.convoyAlive === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }

    // Check defeat: player team wiped
    if (counts.playerTeam === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
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
    results.push(runEscortMission(mission, seed, sector));
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
        ? wins.reduce((s, r) => s + r.convoyInZone, 0) / wins.length
        : 0,
    avgConvoySurvivalRate:
      wins.length > 0
        ? (wins.reduce((s, r) => s + r.convoyInZone, 0) /
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

const TRIALS = 30;

describe('Escort Mission Balance', () => {
  // Test all missions from the live game data
  for (const mission of SECTOR_1_ESCORT) {
    it(`${mission.name} (${mission.difficulty}) balance check`, () => {
      const results = runEscortTrials(mission, mission.sector, TRIALS);

      console.log(`\n=== ${mission.name} (${mission.difficulty}) ===`);
      console.log(
        `Win Rate: ${results.winRate.toFixed(1)}% (${results.wins}/${results.runs})`,
      );
      console.log(`Avg Time to Win: ${results.avgTime.toFixed(1)}s`);
      console.log(
        `Avg Player Survivors: ${results.avgPlayerSurvivors.toFixed(1)}`,
      );
      console.log(
        `Avg Convoy Survivors: ${results.avgConvoySurvivors.toFixed(1)}/${mission.escortData.convoySize}`,
      );
      console.log(
        `Avg Convoy Survival Rate: ${results.avgConvoySurvivalRate.toFixed(1)}%`,
      );
      console.log(`Timeouts: ${results.timeouts}`);

      // Balance targets
      const targets = {
        easy: { minWin: 75, maxWin: 95 },
        medium: { minWin: 60, maxWin: 80 },
        hard: { minWin: 45, maxWin: 65 },
      };
      const target = targets[mission.difficulty];

      // Report status
      if (results.winRate < target.minWin) {
        console.log(
          `STATUS: TOO HARD (target ${target.minWin}-${target.maxWin}%)`,
        );
      } else if (results.winRate > target.maxWin) {
        console.log(
          `STATUS: TOO EASY (target ${target.minWin}-${target.maxWin}%)`,
        );
      } else {
        console.log(
          `STATUS: BALANCED (target ${target.minWin}-${target.maxWin}%)`,
        );
      }

      // Assert win rate is non-zero (mission is completable)
      assert.ok(
        results.wins > 0,
        `Mission should be winnable (got ${results.wins} wins)`,
      );
    });
  }
});
