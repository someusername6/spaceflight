#!/usr/bin/env node
/**
 * Mission Reward Calculator
 *
 * Runs simulations for all missions and computes appropriate rewards based on:
 * - Expected replacement cost (ships lost + pilots + equipment + consumables)
 * - Expected salvage (enemy value × 5%)
 * - Profit margin (500/750/1000 for easy/medium/hard)
 *
 * Usage: npx tsx scripts/tests/campaign/calculate-rewards.mjs [sector]
 * If no sector specified, calculates for all sectors.
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import { getMissionsForSector } from '../../../src/ui/screens/contracts-data.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';
import {
  calculateWaveDelay,
  getLoadout,
  getLoadoutAverageShipValue,
  getLoadoutConsumableValue,
  getLoadoutDescription,
  spawnWave,
} from './mission-simulation.mjs';
import {
  calculateReward,
  getMissionEnemyValue,
  getPlayerShipValue,
  SALVAGE_RATE,
  SECONDARY_PRICES,
} from './mission-value.mjs';

// ============================================================================
// Configuration
// ============================================================================

const SECTOR = process.argv[2] ? parseInt(process.argv[2]) : null;
const MAX_SIMULATION_TIME = 300;
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;
const RUNS_PER_MISSION = 30;

// ============================================================================
// Consumable Tracking
// ============================================================================

/**
 * Calculate consumable cost from secondary weapons component.
 * Computes missiles/decoys used by comparing current count to max count.
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
      // Names are capitalized ("Seeker"), keys are lowercase ("seeker")
      const key = weapon.name.toLowerCase();
      const price = SECONDARY_PRICES[key]?.buy ?? 0;
      totalConsumed += used * price;
    }
  }

  return totalConsumed;
}

// ============================================================================
// Mission Simulation
// ============================================================================

function runMission(mission, seed, sector) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Spawn sector-specific loadout and track initial ships
  const loadout = getLoadout(sector);
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
  });

  const waveState = {
    currentWave: 0,
    totalWaves: mission.waves.length,
    waveCleared: false,
    delayRemaining: 0,
  };
  if (mission.waves.length > 0) spawnWave(world, mission.waves[0]);

  const metrics = {
    winner: null,
    timeToComplete: 0,
    playerTeamRemaining: 0,
    shipsLost: [],
    consumablesUsed: 0,
    timeout: false,
  };

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.systemState.gameTime += TICK_SEC;
    for (const system of SYSTEMS) system(world, TICK_SEC);

    let playerTeamCount = 0,
      enemyCount = 0;
    const survivingEntities = new Set();

    for (const entity of queryEntities(world, ['faction', 'health'])) {
      const faction = getComponent(world, entity, 'faction');
      if (faction.faction === Faction.Player) {
        playerTeamCount++;
        survivingEntities.add(entity);
      } else if (faction.faction === Faction.Enemy) {
        enemyCount++;
      }
    }
    metrics.playerTeamRemaining = playerTeamCount;

    // Wave management
    if (enemyCount === 0 && !waveState.waveCleared) {
      waveState.waveCleared = true;
      const nextWaveIndex = waveState.currentWave + 1;
      if (nextWaveIndex < waveState.totalWaves) {
        waveState.delayRemaining = calculateWaveDelay(
          mission.waves[nextWaveIndex].delay,
          world.prng,
        );
      }
    }

    if (
      waveState.waveCleared &&
      waveState.currentWave + 1 < waveState.totalWaves
    ) {
      if (waveState.delayRemaining > 0) waveState.delayRemaining -= TICK_SEC;
      else {
        waveState.currentWave++;
        waveState.waveCleared = false;
        spawnWave(world, mission.waves[waveState.currentWave]);
      }
    }

    if (playerTeamCount === 0) {
      metrics.winner = 'enemy';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;

      // All ships lost
      metrics.shipsLost = playerEntities.map((p) => ({
        archetype: p.archetype,
        skill: p.skill,
      }));
      break;
    }

    const allWavesSpawned = waveState.currentWave >= waveState.totalWaves - 1;
    if (enemyCount === 0 && allWavesSpawned && waveState.waveCleared) {
      metrics.winner = 'player';
      metrics.timeToComplete = (tick + 1) / TICK_RATE;

      // Track ships lost (not in surviving entities)
      metrics.shipsLost = playerEntities
        .filter((p) => !survivingEntities.has(p.entity))
        .map((p) => ({ archetype: p.archetype, skill: p.skill }));

      // Track consumables used by all ships (survivors)
      metrics.consumablesUsed = getConsumedValue(world);
      break;
    }
  }

  if (!metrics.winner) {
    metrics.timeout = true;
    metrics.timeToComplete = MAX_SIMULATION_TIME;
    metrics.winner = metrics.playerTeamRemaining > 0 ? 'player' : 'enemy';
    metrics.shipsLost = playerEntities
      .filter(
        (p) =>
          !queryEntities(world, ['faction', 'health']).some(
            (e) => e === p.entity,
          ),
      )
      .map((p) => ({ archetype: p.archetype, skill: p.skill }));
  }

  return metrics;
}

// ============================================================================
// Reward Calculation
// ============================================================================

function runMissionRewardCalc(mission, sector) {
  const results = [];

  for (let i = 0; i < RUNS_PER_MISSION; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runMission(mission, seed, sector));
  }

  const wins = results.filter((r) => r.winner === 'player');
  const winRate = (wins.length / results.length) * 100;

  // Calculate average ships lost (across all runs, not just wins)
  const totalShipsLost = results.reduce(
    (sum, r) => sum + r.shipsLost.length,
    0,
  );
  const avgShipsLost = totalShipsLost / results.length;

  // Calculate average ship value (from lost ships)
  let totalLostValue = 0;
  let lostShipCount = 0;
  for (const result of results) {
    for (const ship of result.shipsLost) {
      const value = getPlayerShipValue(ship.archetype, ship.skill);
      totalLostValue += value.total;
      lostShipCount++;
    }
  }
  const avgShipValue =
    lostShipCount > 0
      ? totalLostValue / lostShipCount
      : getLoadoutAverageShipValue(sector);

  // Calculate average consumables used (from victories)
  const totalConsumables = wins.reduce((sum, r) => sum + r.consumablesUsed, 0);
  const avgConsumablesUsed =
    wins.length > 0
      ? totalConsumables / wins.length
      : getLoadoutConsumableValue(sector) * 0.5;

  // Get enemy value for salvage calculation
  const enemyValue = getMissionEnemyValue(mission).totalValue;

  // Calculate recommended reward
  const { reward, breakdown } = calculateReward({
    difficulty: mission.difficulty,
    enemyValue,
    avgShipsLost,
    avgShipValue,
    avgConsumablesUsed,
  });

  return {
    winRate,
    avgTime:
      wins.length > 0
        ? wins.reduce((s, r) => s + r.timeToComplete, 0) / wins.length
        : 0,
    avgShipsLost,
    avgShipValue,
    avgConsumablesUsed,
    enemyValue,
    recommendedReward: reward,
    currentReward: mission.reward,
    breakdown,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const sectors = SECTOR ? [SECTOR] : [1, 2, 3, 4, 5];

  console.log('='.repeat(110));
  console.log('MISSION REWARD CALCULATOR');
  console.log(
    'Formula: reward = (ships_lost × ship_value + consumables) - (enemy_value × 5%) + profit_margin',
  );
  console.log('='.repeat(110));

  for (const sector of sectors) {
    const missions = getMissionsForSector(sector);
    if (missions.length === 0) continue;

    const loadoutDesc = getLoadoutDescription(sector);

    console.log(`\n${'─'.repeat(110)}`);
    console.log(`SECTOR ${sector} (${missions.length} missions)`);
    console.log(`Loadout: ${loadoutDesc}`);
    console.log('─'.repeat(110));
    console.log(
      'Mission'.padEnd(20) +
        'Diff'.padEnd(8) +
        'Win%'.padEnd(7) +
        'Lost'.padEnd(6) +
        'ShipVal'.padEnd(8) +
        'Consumd'.padEnd(8) +
        'Enemy$'.padEnd(9) +
        'Salvage'.padEnd(9) +
        'Current'.padEnd(9) +
        'Recommend'.padEnd(10) +
        'Delta',
    );
    console.log('─'.repeat(110));

    for (const mission of missions) {
      process.stdout.write(
        `Testing ${mission.name.substring(0, 16)}...`.padEnd(28) + '\r',
      );

      const result = runMissionRewardCalc(mission, sector);
      const delta = result.recommendedReward - result.currentReward;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

      console.log(
        mission.name.substring(0, 19).padEnd(20) +
          mission.difficulty.padEnd(8) +
          `${result.winRate.toFixed(0)}%`.padEnd(7) +
          result.avgShipsLost.toFixed(1).padEnd(6) +
          Math.round(result.avgShipValue).toString().padEnd(8) +
          Math.round(result.avgConsumablesUsed).toString().padEnd(8) +
          result.enemyValue.toString().padEnd(9) +
          Math.round(result.enemyValue * SALVAGE_RATE)
            .toString()
            .padEnd(9) +
          result.currentReward.toString().padEnd(9) +
          result.recommendedReward.toString().padEnd(10) +
          deltaStr,
      );
    }
  }

  console.log('\n' + '='.repeat(110));
  console.log('LEGEND:');
  console.log('  Lost     = Average ships lost per mission (all runs)');
  console.log(
    '  ShipVal  = Average value of lost ships (hull + weapons + missiles + pilot)',
  );
  console.log(
    '  Consumd  = Average consumables used (missiles/decoys) by survivors',
  );
  console.log('  Enemy$   = Total enemy composition value');
  console.log('  Salvage  = Expected salvage (Enemy$ × 5%)');
  console.log('  Delta    = Recommended - Current reward');
  console.log('='.repeat(110));
}

main().catch(console.error);
