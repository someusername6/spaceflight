/**
 * Station Defense Mission Simulation
 *
 * Runs station defense mission simulations for reward calculation.
 * Used by update-station-defense-rewards.mjs.
 */

import { Quaternion, Vector3 } from 'three';
import {
  setupStationDefenseMission,
  spawnReinforcementForReplay,
} from '../../src/campaign/mission/station-defense-launcher.ts';
import { isDead } from '../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../src/core/types.ts';
import { createAIShip } from '../../src/factories/ship.ts';
import { processStationDefenseMissionTick } from '../../src/systems/station-defense.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../tests/shared/combat-utils.mjs';
import { SECTOR_LOADOUTS } from '../tests/shared/mission-simulation.mjs';
import { SECONDARY_PRICES } from '../tests/shared/mission-value.mjs';

const MAX_SIMULATION_TIME = 300;
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;

/**
 * Calculate value of consumables used by player team
 */
function getConsumedValue(world) {
  let totalConsumed = 0;

  for (const entity of queryEntities(world, ['faction', 'secondaryWeapons'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction !== Faction.Player) continue;

    const secondaries = getComponent(world, entity, 'secondaryWeapons');
    if (!secondaries?.weapons) continue;

    for (const weapon of secondaries.weapons) {
      const used = weapon.maxCount - weapon.count;
      const key = weapon.name.toLowerCase();
      const price = SECONDARY_PRICES[key]?.buy ?? 0;
      totalConsumed += used * price;
    }
  }

  return totalConsumed;
}

/**
 * Count living entities by faction and type.
 */
function countEntities(world) {
  let playerTeam = 0;
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
      if (identity && !isDead(health)) playerTeam++;
    } else if (faction.faction === Faction.Enemy) {
      const identity = getComponent(world, entity, 'shipIdentity');
      if (identity && !isDead(health)) enemies++;
    }
  }

  return { playerTeam, enemies, stationAlive, stationHealth, stationMaxHealth };
}

/**
 * Calculate which enemies were killed by checking if they still exist and are alive
 */
function calculateKilledEnemies(world, knownEnemyEntities) {
  const killed = [];
  for (const enemy of knownEnemyEntities) {
    const health = getComponent(world, enemy.entity, 'health');
    if (!health || isDead(health)) {
      killed.push({ archetype: enemy.archetype });
    }
  }
  return killed;
}

/**
 * Run a single station defense mission simulation
 *
 * @param {object} mission - Mission configuration
 * @param {number} seed - Random seed
 * @param {number} sector - Sector number (for loadout)
 * @returns {object} Mission metrics
 */
export function runStationDefenseMission(mission, seed, sector) {
  const stationDefenseData = mission.stationDefenseData;
  if (!stationDefenseData) {
    throw new Error('Mission is not a station defense mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state
  world.systemState.mission = {
    missionType: 'station-defense',
    result: MissionResult.InProgress,
  };

  // Spawn sector-specific player loadout
  const loadout = SECTOR_LOADOUTS[sector] || SECTOR_LOADOUTS[1];
  const playerEntities = [];

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
    playerEntities.push({
      entity,
      archetype: ship.archetype,
      skill: ship.skill,
    });
    if (i === 0) {
      addComponent(world, entity, { type: 'playerControlled', input: {} });
    }
  });

  // Setup station defense mission
  const stationState = setupStationDefenseMission(world, mission);

  // Track spawned enemies
  const knownEnemyEntities = new Set();
  const spawnedEnemies = [];

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    playerTeamTotal: loadout.length,
    shipsLost: [],
    stationHealthPercent: 100,
    consumablesUsed: 0,
    timeout: false,
    enemiesKilled: [],
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;

    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

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

    // Track any new enemy entities
    for (const entity of queryEntities(world, ['faction', 'shipIdentity'])) {
      const faction = getComponent(world, entity, 'faction');
      if (
        faction?.faction === Faction.Enemy &&
        !knownEnemyEntities.has(entity)
      ) {
        knownEnemyEntities.add(entity);
        const identity = getComponent(world, entity, 'shipIdentity');
        spawnedEnemies.push({ entity, archetype: identity.archetype });
      }
    }

    const counts = countEntities(world);
    metrics.playerTeamRemaining = counts.playerTeam;
    metrics.stationHealthPercent =
      counts.stationMaxHealth > 0
        ? (counts.stationHealth / counts.stationMaxHealth) * 100
        : 0;

    // Check defeat: station destroyed
    if (!counts.stationAlive) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      metrics.shipsLost = playerEntities.map((p) => ({
        archetype: p.archetype,
        skill: p.skill,
      }));
      metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
      break;
    }

    // Check defeat: all players dead
    if (counts.playerTeam === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      metrics.shipsLost = playerEntities.map((p) => ({
        archetype: p.archetype,
        skill: p.skill,
      }));
      metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
      break;
    }

    // Check victory: all waves spawned, reinforcements arrived, all enemies dead
    if (stationState.completed && counts.enemies === 0) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;

      // Calculate ships lost
      const survivingEntities = new Set();
      for (const entity of queryEntities(world, ['faction', 'health'])) {
        const faction = getComponent(world, entity, 'faction');
        const health = getComponent(world, entity, 'health');
        if (faction?.faction === Faction.Player && !isDead(health)) {
          survivingEntities.add(entity);
        }
      }

      metrics.shipsLost = playerEntities
        .filter((p) => !survivingEntities.has(p.entity))
        .map((p) => ({ archetype: p.archetype, skill: p.skill }));

      metrics.consumablesUsed = getConsumedValue(world);
      metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = MAX_SIMULATION_TIME;
    const counts = countEntities(world);
    metrics.winner = counts.stationAlive ? 'player' : 'enemy';
    metrics.shipsLost = playerEntities.map((p) => ({
      archetype: p.archetype,
      skill: p.skill,
    }));
    metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
  }

  return metrics;
}
