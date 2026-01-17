/**
 * Escort Mission Simulation
 *
 * Runs escort mission simulations for reward calculation.
 * Used by update-escort-rewards.mjs.
 */

import { Quaternion, Vector3 } from 'three';
import {
  setFactionBehaviorMode,
  setupEscortMission,
  spawnEscortEnemy,
} from '../../src/campaign/mission/escort-launcher.ts';
import { isDead } from '../../src/components/health.ts';
import {
  addComponent,
  createWorld,
  getComponent,
  queryEntities,
} from '../../src/core/ecs.ts';
import { Faction, MissionResult } from '../../src/core/types.ts';
import { createAIShip } from '../../src/factories/ship.ts';
import { processEscortMissionTick } from '../../src/systems/escort-mission.ts';
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
 * Count player team, convoy alive, and convoy total
 */
function countEntities(world) {
  let playerTeam = 0;
  let convoyAlive = 0;
  let convoyTotal = 0;

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
    }
  }

  return { playerTeam, convoyAlive, convoyTotal };
}

/**
 * Calculate which enemies were killed by checking if they still exist and are alive
 */
function calculateKilledEnemies(world, spawnedEnemies) {
  const killed = [];
  for (const enemy of spawnedEnemies) {
    const health = getComponent(world, enemy.entity, 'health');
    // Entity is dead if health doesn't exist or is dead
    if (!health || isDead(health)) {
      killed.push({ archetype: enemy.archetype });
    }
  }
  return killed;
}

/**
 * Run a single escort mission simulation
 *
 * @param {object} mission - Mission configuration
 * @param {number} seed - Random seed
 * @param {number} sector - Sector number (for loadout)
 * @returns {object} Mission metrics
 */
export function runEscortMission(mission, seed, sector) {
  const escortData = mission.escortData;
  if (!escortData) {
    throw new Error('Mission is not an escort mission');
  }

  const world = createWorld(seed);
  initCombatStats(world);

  // Initialize mission state
  world.systemState.mission = {
    isEscortMission: true,
    result: MissionResult.InProgress,
  };

  // Spawn sector-specific player loadout
  const loadout = getLoadout(sector);
  const playerEntities = [];

  loadout.forEach((ship, i) => {
    const x = (i - (loadout.length - 1) / 2) * 50;
    const entity = createAIShip(
      world,
      ship.archetype,
      Faction.Player,
      new Vector3(x, 0, 100),
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

  // Setup escort mission
  const escortState = setupEscortMission(world, mission);
  setFactionBehaviorMode(world, Faction.Player, 'defensive');

  const escapeZonePosition = new Vector3(0, 0, escortData.escapeZoneDistance);

  // Track spawned enemies - use Set for O(1) lookup of known entities
  const knownEnemyEntities = new Set();
  const spawnedEnemies = [];

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    playerTeamTotal: loadout.length,
    shipsLost: [],
    convoyLost: 0,
    convoyTotal: escortData.convoySize,
    consumablesUsed: 0,
    timeout: false,
    enemiesKilled: [],
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;

    for (const system of SYSTEMS) {
      system(world, TICK_SEC);
    }

    processEscortMissionTick(world, escortState, TICK_SEC, () => {
      spawnEscortEnemy(world, escortData, escapeZonePosition);
    });

    // Track any new enemy entities (once per tick, not per spawn)
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

    if (world.systemState.mission.result === MissionResult.Victory) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;

      // Calculate ships lost
      const survivingEntities = new Set();
      for (const entity of queryEntities(world, ['faction', 'health'])) {
        const faction = getComponent(world, entity, 'faction');
        if (faction?.faction === Faction.Player) {
          survivingEntities.add(entity);
        }
      }

      metrics.shipsLost = playerEntities
        .filter((p) => !survivingEntities.has(p.entity))
        .map((p) => ({ archetype: p.archetype, skill: p.skill }));

      // Convoy lost = total - escaped
      metrics.convoyLost = escortData.convoySize - escortState.escapedConvoy;
      metrics.consumablesUsed = getConsumedValue(world);

      // Calculate killed enemies (all spawned enemies that are no longer alive)
      metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
      break;
    }

    if (world.systemState.mission.result === MissionResult.Defeat) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;
      metrics.shipsLost = playerEntities.map((p) => ({
        archetype: p.archetype,
        skill: p.skill,
      }));
      metrics.convoyLost = escortData.convoySize;

      // Still track killed enemies even on defeat
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
    metrics.convoyLost = escortData.convoySize;
    metrics.enemiesKilled = calculateKilledEnemies(world, spawnedEnemies);
  }

  return metrics;
}
