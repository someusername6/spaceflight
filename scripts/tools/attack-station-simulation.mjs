/**
 * Attack Station Mission Simulation
 *
 * Runs attack station mission simulations for reward calculation.
 * Used by update-attack-station-rewards.mjs.
 */

import { Quaternion, Vector3 } from 'three';
import {
  assignDpsBasedBehavior,
  processAttackStationMissionTick,
  setupAttackStationMission,
} from '../../src/campaign/mission/attack-station-launcher.ts';
import { isDead } from '../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../src/core/types.ts';
import { createAIShip } from '../../src/factories/ship.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../tests/shared/combat-utils.mjs';
import { SECTOR_ASSAULT_LOADOUTS } from '../tests/shared/mission-simulation.mjs';
import { SECONDARY_PRICES } from '../tests/shared/mission-value.mjs';

const MAX_SIMULATION_TIME = 180;
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
 * Run a single attack station mission simulation
 *
 * @param {object} mission - Mission configuration
 * @param {number} seed - Random seed
 * @param {number} sector - Sector number (for loadout)
 * @returns {object} Mission metrics
 */
export function runAttackStationMission(mission, seed, sector) {
  const attackStationData = mission.attackStationData;
  if (!attackStationData) {
    throw new Error('Mission is not an attack station mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state
  world.systemState.mission = {
    missionType: 'attack-station',
    result: MissionResult.InProgress,
  };

  // Spawn sector-specific assault loadout
  const wingmenEntities = new Set();
  const loadout = SECTOR_ASSAULT_LOADOUTS[sector] || SECTOR_ASSAULT_LOADOUTS[1];
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
    wingmenEntities.add(entity);
    playerEntities.push({
      entity,
      archetype: ship.archetype,
      skill: ship.skill,
    });
    if (i === 0) {
      addComponent(world, entity, { type: 'playerControlled', input: {} });
    }
  });

  // Setup attack station mission (spawns enemy station and defenders)
  const attackState = setupAttackStationMission(world, mission);

  // Assign DPS-based behavior to player faction ships
  assignDpsBasedBehavior(world, attackStationData.stationAttackDpsThreshold);

  // Track spawned enemies
  const knownEnemyEntities = new Set();
  const spawnedEnemies = [];

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    wingmenRemaining: 0,
    wingmenTotal: loadout.length,
    shipsLost: [],
    stationDamagePercent: 0,
    consumablesUsed: 0,
    timeout: false,
    enemiesKilled: [],
    reinforcementsSpawned: 0,
    overwhelmingSpawned: false,
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;

    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    processAttackStationMissionTick(world, attackState, mission, TICK_SEC);

    // Track any new enemy entities (exclude structures like stations)
    for (const entity of queryEntities(world, ['faction', 'shipIdentity'])) {
      const faction = getComponent(world, entity, 'faction');
      if (
        faction?.faction === Faction.Enemy &&
        !knownEnemyEntities.has(entity)
      ) {
        // Skip structures (stations) - they're not ships
        const structure = getComponent(world, entity, 'structure');
        if (structure) continue;

        knownEnemyEntities.add(entity);
        const identity = getComponent(world, entity, 'shipIdentity');
        spawnedEnemies.push({ entity, archetype: identity.archetype });
      }
    }

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

    // Check victory: station destroyed
    if (!counts.stationAlive) {
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
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = MAX_SIMULATION_TIME;
    // Timeout = defeat (station not destroyed in time)
    metrics.winner = 'enemy';
    metrics.shipsLost = playerEntities.map((p) => ({
      archetype: p.archetype,
      skill: p.skill,
    }));
    metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
  }

  return metrics;
}
