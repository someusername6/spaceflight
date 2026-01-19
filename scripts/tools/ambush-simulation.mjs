/**
 * Ambush Mission Simulation
 *
 * Runs ambush mission simulations for reward calculation.
 * Used by update-ambush-rewards.mjs.
 */

import {
  getAmbushPlayerSpawn,
  getAmbushWingmenSpawns,
  setupAmbushMission,
} from '../../src/campaign/mission/ambush-launcher.ts';
import { isDead } from '../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../src/core/types.ts';
import { createAIShip } from '../../src/factories/ship.ts';
import { processAmbushMissionTick } from '../../src/systems/ambush-mission.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../tests/shared/combat-utils.mjs';
import { getLoadout } from '../tests/shared/mission-simulation.mjs';
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
 * Count living entities by faction
 */
function countEntities(world) {
  let playerTeam = 0;
  let enemies = 0;

  for (const entity of queryEntities(world, [
    'faction',
    'health',
    'shipIdentity',
  ])) {
    const faction = getComponent(world, entity, 'faction');
    const health = getComponent(world, entity, 'health');
    const convoyShip = getComponent(world, entity, 'convoyShip');

    // Skip convoy ships
    if (convoyShip) continue;

    if (faction.faction === Faction.Player && !isDead(health)) {
      playerTeam++;
    } else if (faction.faction === Faction.Enemy && !isDead(health)) {
      enemies++;
    }
  }

  return { playerTeam, enemies };
}

/**
 * Calculate which enemies (escorts) were killed
 */
function calculateKilledEnemies(world, spawnedEnemies) {
  const killed = [];
  for (const enemy of spawnedEnemies) {
    const health = getComponent(world, enemy.entity, 'health');
    if (!health || isDead(health)) {
      killed.push({ archetype: enemy.archetype });
    }
  }
  return killed;
}

/**
 * Run a single ambush mission simulation
 *
 * @param {object} mission - Mission configuration
 * @param {number} seed - Random seed
 * @param {number} sector - Sector number (for loadout)
 * @returns {object} Mission metrics
 */
export function runAmbushMission(mission, seed, sector) {
  const ambushData = mission.ambushData;
  if (!ambushData) {
    throw new Error('Mission is not an ambush mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state
  world.systemState.mission = {
    missionType: 'ambush',
    result: MissionResult.InProgress,
  };

  // Get spawn positions from ambush launcher
  const playerSpawn = getAmbushPlayerSpawn(ambushData);
  const loadout = getLoadout(sector);
  const wingmenCount = loadout.length - 1;
  const wingmenSpawns = getAmbushWingmenSpawns(ambushData, wingmenCount);

  // Track player entities for loss calculation
  const playerEntities = [];

  // Spawn commander
  const commanderEntity = createAIShip(
    world,
    loadout[0].archetype,
    Faction.Player,
    playerSpawn.position,
    playerSpawn.rotation,
    loadout[0].skill,
  );
  addComponent(world, commanderEntity, { type: 'playerControlled', input: {} });
  playerEntities.push({
    entity: commanderEntity,
    archetype: loadout[0].archetype,
    skill: loadout[0].skill,
  });

  // Spawn wingmen
  for (let i = 0; i < wingmenCount; i++) {
    const spawn = wingmenSpawns[i];
    const entity = createAIShip(
      world,
      loadout[i + 1].archetype,
      Faction.Player,
      spawn.position,
      spawn.rotation,
      loadout[i + 1].skill,
    );
    playerEntities.push({
      entity,
      archetype: loadout[i + 1].archetype,
      skill: loadout[i + 1].skill,
    });
  }

  // Setup ambush mission (spawns convoy and escorts)
  const ambushState = setupAmbushMission(world, mission);

  // Track spawned escort enemies
  const spawnedEnemies = [];
  for (const entity of queryEntities(world, ['faction', 'shipIdentity'])) {
    const faction = getComponent(world, entity, 'faction');
    if (faction?.faction === Faction.Enemy) {
      const identity = getComponent(world, entity, 'shipIdentity');
      spawnedEnemies.push({ entity, archetype: identity.archetype });
    }
  }

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    playerTeamTotal: loadout.length,
    shipsLost: [],
    convoyStopped: 0,
    convoyDestroyed: 0,
    convoyTotal: ambushData.convoySize,
    rewardMultiplier: 0,
    consumablesUsed: 0,
    timeout: false,
    enemiesKilled: [],
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;

    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    processAmbushMissionTick(world, ambushState);

    const counts = countEntities(world);
    metrics.playerTeamRemaining = counts.playerTeam;

    if (world.systemState.mission.result === MissionResult.Victory) {
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

      metrics.convoyStopped = ambushState.stoppedConvoy;
      metrics.convoyDestroyed = ambushState.destroyedConvoy;
      metrics.consumablesUsed = getConsumedValue(world);
      metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);

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
    metrics.winner = 'enemy';
    metrics.shipsLost = playerEntities.map((p) => ({
      archetype: p.archetype,
      skill: p.skill,
    }));
    metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
  }

  return metrics;
}
