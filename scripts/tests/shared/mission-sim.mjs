/**
 * Mission Simulation - Shared simulation logic for mission tests.
 *
 * Extracted from test-mission-pacing.mjs to stay under 400 line limit.
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  hasComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import {
  createAIShip,
  createPlayerShip,
  createWingman,
} from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';

// ============================================================================
// Constants
// ============================================================================

export const MAX_SIMULATION_TIME = 180; // 3 minutes max per mission
export const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;
export const RUNS_PER_SCENARIO = 40;

// Player behavior modes
export const PLAYER_MODES = ['idle', 'regular', 'ace'];

// ============================================================================
// Simulation Functions
// ============================================================================

/** Spawn a wave of enemies */
function spawnWave(world, wave, waveIndex, startDistance) {
  const facingPosZ = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI,
  );

  wave.enemies.forEach((group, groupIndex) => {
    for (let i = 0; i < group.count; i++) {
      const angle = (Math.PI * 2 * i) / group.count + groupIndex * 0.5;
      const distance = startDistance + waveIndex * 100 + groupIndex * 150;
      const x = Math.cos(angle) * distance * 0.3;
      const z = -distance;
      const y = (groupIndex - 1) * 50 + i * 20;

      createAIShip(
        world,
        group.archetype,
        Faction.Enemy,
        new Vector3(x, y, z),
        facingPosZ,
        group.skill,
      );
    }
  });
}

/**
 * Run a single mission simulation with wave support.
 * @param {object} mission - Mission definition
 * @param {string} playerMode - 'idle' or AI skill level
 * @param {number} seed - Random seed
 */
export function runMission(mission, playerMode, seed) {
  const world = createWorld(seed);
  initCombatStats(world);

  const facingNegZ = new Quaternion(); // Identity = facing -Z

  // Track which entity is the player
  let playerEntity = null;

  // Spawn player squadron
  mission.playerSquad.forEach((ship, i) => {
    const x = (i - 1) * 50;
    const pos = new Vector3(x, 0, 0);

    if (ship.isPlayer) {
      if (playerMode === 'idle') {
        // Create player ship (no AI, will just drift)
        playerEntity = createPlayerShip(world, ship.archetype, pos, facingNegZ);
      } else {
        // Replace player with AI of specified skill
        playerEntity = createAIShip(
          world,
          ship.archetype,
          Faction.Player,
          pos,
          facingNegZ,
          playerMode,
        );
      }
    } else {
      // Wingman with specified skill
      createWingman(world, ship.archetype, pos, facingNegZ, ship.skill);
    }
  });

  // Wave state
  const waveState = {
    currentWave: 0,
    totalWaves: mission.waves.length,
    waveCleared: false,
    delayRemaining: 0,
  };

  // Spawn first wave
  if (mission.waves.length > 0) {
    spawnWave(world, mission.waves[0], 0, mission.startDistance);
  }

  // Run simulation
  const metrics = {
    ticks: 0,
    winner: null,
    timeToComplete: 0,
    playerSurvived: false,
    playerTeamRemaining: 0,
    enemyTeamRemaining: 0,
    timeout: false,
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;

    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    metrics.ticks = tick + 1;

    // Count remaining ships
    let playerTeamCount = 0;
    let enemyCount = 0;
    let playerAlive = false;

    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');

      if (faction.faction === Faction.Player) {
        playerTeamCount++;
        if (entity === playerEntity) {
          playerAlive = true;
        }
        if (hasComponent(world, entity, 'playerControlled')) {
          playerAlive = true;
        }
      } else if (faction.faction === Faction.Enemy) {
        enemyCount++;
      }
    }

    metrics.playerTeamRemaining = playerTeamCount;
    metrics.enemyTeamRemaining = enemyCount;
    metrics.playerSurvived = playerAlive;

    // Wave management
    if (enemyCount === 0 && !waveState.waveCleared) {
      waveState.waveCleared = true;
      const nextWaveIndex = waveState.currentWave + 1;
      if (nextWaveIndex < waveState.totalWaves) {
        waveState.delayRemaining = mission.waves[nextWaveIndex].delay || 0;
      }
    }

    if (
      waveState.waveCleared &&
      waveState.currentWave + 1 < waveState.totalWaves
    ) {
      if (waveState.delayRemaining > 0) {
        waveState.delayRemaining -= TICK_SEC;
      } else {
        waveState.currentWave++;
        waveState.waveCleared = false;
        spawnWave(
          world,
          mission.waves[waveState.currentWave],
          waveState.currentWave,
          mission.startDistance,
        );
      }
    }

    // Check for defeat - player dies = loss (even if wingmen survive)
    if (!playerAlive) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }

    // Check for defeat - entire team wiped
    if (playerTeamCount === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }

    // Victory: player alive AND all waves complete AND no enemies
    const allWavesSpawned = waveState.currentWave >= waveState.totalWaves - 1;
    if (enemyCount === 0 && allWavesSpawned && waveState.waveCleared) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      break;
    }
  }

  // Timeout - player must be alive to win
  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = MAX_SIMULATION_TIME;
    if (!metrics.playerSurvived) {
      metrics.winner = 'enemy';
    } else if (metrics.playerTeamRemaining > metrics.enemyTeamRemaining) {
      metrics.winner = 'player';
    } else {
      metrics.winner = 'enemy';
    }
  }

  return metrics;
}

/**
 * Run multiple simulations for a mission/player combination.
 */
export function runScenario(
  mission,
  missionKey,
  playerMode,
  runs = RUNS_PER_SCENARIO,
) {
  const results = [];

  for (let i = 0; i < runs; i++) {
    const seed = 12345 + i * 7919;
    results.push(runMission(mission, playerMode, seed));
  }

  // Aggregate
  const wins = results.filter((r) => r.winner === 'player');
  const playerWins = wins.length;
  const playerSurvived = results.filter((r) => r.playerSurvived).length;
  const timeouts = results.filter((r) => r.timeout).length;

  // Time stats for victories only
  const winTimes = wins.map((r) => r.timeToComplete);
  const avgWinTime =
    winTimes.length > 0
      ? winTimes.reduce((a, b) => a + b, 0) / winTimes.length
      : 0;
  const minWinTime = winTimes.length > 0 ? Math.min(...winTimes) : 0;
  const maxWinTime = winTimes.length > 0 ? Math.max(...winTimes) : 0;

  return {
    missionKey,
    missionName: mission.name,
    playerMode,
    runs,
    playerWins,
    winRate: (playerWins / runs) * 100,
    playerSurvived,
    survivalRate: (playerSurvived / runs) * 100,
    timeouts,
    avgWinTime,
    minWinTime,
    maxWinTime,
  };
}
