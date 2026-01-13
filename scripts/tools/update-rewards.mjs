#!/usr/bin/env node
/**
 * Mission Reward Updater
 *
 * Runs simulations and automatically updates mission reward values in source files.
 * Also sorts missions by reward (increasing order) within each file.
 * Uses ts-morph for robust AST manipulation.
 *
 * Usage:
 *   npx tsx scripts/tests/campaign/update-rewards.mjs [sector]
 *   npx tsx scripts/tests/campaign/update-rewards.mjs --dry-run [sector]
 *
 * Options:
 *   --dry-run  Show changes without writing to files
 */

import { Quaternion, Vector3 } from 'three';
import {
  createWorld,
  getComponent,
  queryEntities,
} from '../../src/core/ecs.ts';
import { Faction } from '../../src/core/types.ts';
import { createAIShip } from '../../src/factories/ship.ts';
import { getMissionsForSector } from '../../src/ui/screens/contracts-data.ts';
import {
  initCombatStats,
  SYSTEMS,
  TICK_RATE,
  TICK_SEC,
} from '../tests/shared/combat-utils.mjs';
import {
  calculateWaveDelay,
  getLoadout,
  getLoadoutAverageShipValue,
  getLoadoutConsumableValue,
  getLoadoutDescription,
  spawnWave,
} from '../tests/shared/mission-simulation.mjs';
import {
  calculateReward,
  getMissionEnemyValue,
  getPlayerShipValue,
  SECONDARY_PRICES,
} from '../tests/shared/mission-value.mjs';
import {
  createProject,
  getMissionFilePath,
  updateMissionFile,
} from './mission-file-updater.mjs';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const sectorArg = args.find((a) => !a.startsWith('--'));
const SECTOR = sectorArg ? parseInt(sectorArg, 10) : null;

const MAX_SIMULATION_TIME = 300;
const MAX_TICKS = MAX_SIMULATION_TIME * TICK_RATE;
const RUNS_PER_MISSION = 30;

// ============================================================================
// Consumable Tracking
// ============================================================================

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

// ============================================================================
// Mission Simulation
// ============================================================================

function runMission(mission, seed, sector) {
  const world = createWorld(seed);
  initCombatStats(world);

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
      metrics.shipsLost = playerEntities
        .filter((p) => !survivingEntities.has(p.entity))
        .map((p) => ({ archetype: p.archetype, skill: p.skill }));
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

function calculateMissionReward(mission, sector) {
  const results = [];

  for (let i = 0; i < RUNS_PER_MISSION; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runMission(mission, seed, sector));
  }

  const wins = results.filter((r) => r.winner === 'player');
  const totalShipsLost = results.reduce(
    (sum, r) => sum + r.shipsLost.length,
    0,
  );
  const avgShipsLost = totalShipsLost / results.length;

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

  const totalConsumables = wins.reduce((sum, r) => sum + r.consumablesUsed, 0);
  const avgConsumablesUsed =
    wins.length > 0
      ? totalConsumables / wins.length
      : getLoadoutConsumableValue(sector) * 0.5;

  const enemyValue = getMissionEnemyValue(mission).totalValue;

  const { reward } = calculateReward({
    difficulty: mission.difficulty,
    enemyValue,
    avgShipsLost,
    avgShipValue,
    avgConsumablesUsed,
  });

  return reward;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const sectors = SECTOR ? [SECTOR] : [1, 2, 3, 4, 5];

  console.log('='.repeat(90));
  console.log(`MISSION REWARD UPDATER ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log('Calculates rewards and sorts missions by reward (ascending)');
  console.log('Uses ts-morph for AST manipulation');
  console.log('='.repeat(90));

  const allUpdates = [];
  const rewardsByFile = {}; // filePath -> { missionId -> newReward }

  for (const sector of sectors) {
    const missions = getMissionsForSector(sector);
    if (missions.length === 0) continue;

    const loadoutDesc = getLoadoutDescription(sector);

    console.log(`\n${'─'.repeat(90)}`);
    console.log(`SECTOR ${sector} (${missions.length} missions)`);
    console.log(`Loadout: ${loadoutDesc}`);
    console.log('─'.repeat(90));
    console.log(
      'Mission'.padEnd(22) +
        'Diff'.padEnd(8) +
        'Current'.padEnd(10) +
        'New'.padEnd(10) +
        'Delta',
    );
    console.log('─'.repeat(90));

    for (const mission of missions) {
      process.stdout.write(
        `${`Calculating ${mission.name.substring(0, 14)}...`.padEnd(30)}\r`,
      );

      const newReward = calculateMissionReward(mission, sector);
      const delta = newReward - mission.reward;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

      console.log(
        mission.name.substring(0, 21).padEnd(22) +
          mission.difficulty.padEnd(8) +
          mission.reward.toString().padEnd(10) +
          newReward.toString().padEnd(10) +
          deltaStr,
      );

      // Track reward for file update
      const filePath = getMissionFilePath(sector, mission.difficulty);
      if (!rewardsByFile[filePath]) {
        rewardsByFile[filePath] = {};
      }
      rewardsByFile[filePath][mission.id] = newReward;

      if (delta !== 0) {
        allUpdates.push({
          sector,
          mission: mission.name,
          old: mission.reward,
          new: newReward,
          delta,
        });
      }
    }
  }

  // Update files using ts-morph
  console.log(`\n${'─'.repeat(90)}`);
  console.log('UPDATING FILES');
  console.log('─'.repeat(90));

  const project = createProject();

  for (const [filePath, rewardMap] of Object.entries(rewardsByFile)) {
    const success = updateMissionFile(project, filePath, rewardMap);
    if (success) {
      console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}Updated: ${filePath}`);
    }
  }

  // Save all changes
  if (!DRY_RUN) {
    await project.save();
  }

  console.log(`\n${'='.repeat(90)}`);
  console.log(`SUMMARY: ${allUpdates.length} mission rewards changed`);

  if (allUpdates.length > 0) {
    const totalDelta = allUpdates.reduce((sum, u) => sum + u.delta, 0);
    console.log(
      `Total reward change: ${totalDelta >= 0 ? '+' : ''}${totalDelta}`,
    );
  }

  if (DRY_RUN) {
    console.log('\nThis was a dry run. No files were modified.');
    console.log('Run without --dry-run to apply changes.');
  } else if (allUpdates.length > 0) {
    console.log('\nFiles updated. Run `npm run lint` to format.');
  }

  console.log('='.repeat(90));
}

main().catch(console.error);
