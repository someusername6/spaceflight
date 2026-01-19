/**
 * Ambush Mission Simulation Utilities
 *
 * Shared helpers for running ambush mission simulations in tests.
 */

import {
  getAmbushPlayerSpawn,
  getAmbushWingmenSpawns,
  setupAmbushMission,
} from '../../../src/campaign/mission/ambush-launcher.ts';
import { isDead } from '../../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { processAmbushMissionTick } from '../../../src/systems/ambush-mission.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from './combat-utils.mjs';
import { SECTOR_LOADOUTS } from './mission-simulation.mjs';

const DEFAULT_MAX_SIMULATION_TIME = 300;

/**
 * Count living entities by faction and type.
 */
export function countAmbushEntities(world) {
  let playerTeam = 0;
  let enemies = 0;
  let enemiesDead = 0;
  let convoyAlive = 0;
  let convoyStopped = 0;
  let convoyDead = 0;
  let convoyTotal = 0;

  for (const entity of queryEntities(world, [
    'faction',
    'health',
    'shipIdentity',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    const convoyShip = getComponent(world, entity, 'convoyShip');

    if (convoyShip && faction.faction === Faction.Neutral) {
      // Convoy ships are Neutral (yellow) in ambush missions
      convoyTotal++;
      if (isDead(health)) {
        convoyDead++;
      } else {
        convoyAlive++;
        if (convoyShip.isStopped) {
          convoyStopped++;
        }
      }
    } else if (faction.faction === Faction.Player) {
      if (!isDead(health)) playerTeam++;
    } else if (faction.faction === Faction.Enemy) {
      // Escorts are still Enemy faction
      if (!isDead(health)) enemies++;
      else enemiesDead++;
    }
  }

  return {
    playerTeam,
    enemies,
    enemiesDead,
    convoyAlive,
    convoyStopped,
    convoyDead,
    convoyTotal,
  };
}

/**
 * Run a single ambush mission simulation.
 *
 * Uses the SAME code path as live gameplay:
 * - setupAmbushMission spawns convoy and escorts, creates ambush state
 * - processAmbushMissionTick handles convoy stop detection and victory/defeat
 */
export function runAmbushMission(mission, seed, sector, options = {}) {
  const maxSimulationTime =
    options.maxSimulationTime ?? DEFAULT_MAX_SIMULATION_TIME;
  const maxTicks = maxSimulationTime * TICK_RATE;
  const ambushData = mission.ambushData;

  if (!ambushData) {
    throw new Error('Mission is not an ambush mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state (same as live game)
  world.systemState.mission = {
    missionType: 'ambush',
    result: MissionResult.InProgress,
  };

  // Get spawn positions from ambush launcher (same as live game)
  const playerSpawn = getAmbushPlayerSpawn(ambushData);
  const loadout = SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
  const wingmenCount = loadout.length - 1; // First ship is commander
  const wingmenSpawns = getAmbushWingmenSpawns(ambushData, wingmenCount);

  // Spawn commander (first ship) at player position
  const commanderEntity = createAIShip(
    world,
    loadout[0].archetype,
    Faction.Player,
    playerSpawn.position,
    playerSpawn.rotation,
    loadout[0].skill,
  );
  addComponent(world, commanderEntity, { type: 'playerControlled', input: {} });

  // Spawn wingmen at their proper positions (between player and escorts)
  for (let i = 0; i < wingmenCount; i++) {
    const spawn = wingmenSpawns[i];
    createAIShip(
      world,
      loadout[i + 1].archetype,
      Faction.Player,
      spawn.position,
      spawn.rotation,
      loadout[i + 1].skill,
    );
  }

  // Setup ambush mission (spawns convoy and escorts, creates state)
  // This is the SAME function used in live gameplay
  const ambushState = setupAmbushMission(world, mission);

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    convoyTotal: ambushData.convoySize,
    convoyStopped: 0,
    convoyDestroyed: 0,
    convoyEscaped: 0,
    rewardMultiplier: 0,
    timeout: false,
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    world.systemState.gameTime += TICK_SEC;

    // Run all systems
    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    // Process ambush mission logic (convoy stop detection, victory/defeat)
    // This is the SAME function used in live gameplay
    processAmbushMissionTick(world, ambushState);

    // Update metrics
    const counts = countAmbushEntities(world);
    metrics.playerTeamRemaining = counts.playerTeam;
    metrics.convoyStopped = ambushState.stoppedConvoy;
    metrics.convoyDestroyed = ambushState.destroyedConvoy;
    metrics.convoyEscaped = ambushState.escapedConvoy;

    // Debug: log periodically
    if (options.debug) {
      if (tick < 3 || tick % 500 === 0) {
        console.log(
          `  Tick ${tick} (${(tick / TICK_RATE).toFixed(0)}s): convoy=${counts.convoyAlive} (stopped=${counts.convoyStopped}, dead=${counts.convoyDead}), player=${counts.playerTeam}, escorts=${counts.enemies}`,
        );
      }
    }

    // Check mission completion (uses same logic as live game)
    if (world.systemState.mission.result === MissionResult.Victory) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      // Calculate reward multiplier: stopped = 100%, destroyed = 50%
      const total = ambushState.totalConvoy;
      if (total > 0) {
        metrics.rewardMultiplier =
          ambushState.stoppedConvoy / total +
          (ambushState.destroyedConvoy / total) * 0.5;
      }
      break;
    }

    if (world.systemState.mission.result === MissionResult.Defeat) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      if (options.debug) {
        // Check commander health specifically
        const cmdHealth = getComponent(world, commanderEntity, 'health');
        const cmdHp = cmdHealth
          ? `hp=${cmdHealth.current}/${cmdHealth.max}`
          : 'no-health';
        const cmdDead = cmdHealth ? isDead(cmdHealth) : 'no-health';
        console.log(
          `  DEFEAT at tick ${tick}: escaped=${ambushState.escapedConvoy}, playerTeam=${counts.playerTeam}, cmdDead=${cmdDead} (${cmdHp})`,
        );
      }
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = maxSimulationTime;
    // Timeout = loss (convoy escaped or not neutralized)
    metrics.winner = 'enemy';
  }

  return metrics;
}

/**
 * Run multiple trials and aggregate results.
 */
export function runAmbushTrials(mission, sector, runs) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    // Debug first run only
    results.push(runAmbushMission(mission, seed, sector, { debug: i === 0 }));
  }

  const wins = results.filter((r) => r.winner === 'player');
  const convoyTotal = mission.ambushData.convoySize;
  const loadout = SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
  const squadSize = loadout.length;

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
    avgSquadSurvivalRate:
      wins.length > 0
        ? (wins.reduce((s, r) => s + r.playerTeamRemaining, 0) /
            wins.length /
            squadSize) *
          100
        : 0,
    avgConvoyStopped:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.convoyStopped, 0) / wins.length
        : 0,
    avgConvoyDestroyed:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.convoyDestroyed, 0) / wins.length
        : 0,
    avgRewardMultiplier:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.rewardMultiplier, 0) / wins.length
        : 0,
    timeouts: results.filter((r) => r.timeout).length,
    squadSize,
    convoyTotal,
    results,
  };
}
