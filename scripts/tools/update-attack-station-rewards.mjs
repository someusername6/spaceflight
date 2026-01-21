#!/usr/bin/env node
/**
 * Attack Station Mission Reward Updater
 *
 * Runs simulations and automatically updates attack station mission reward values.
 * Also sorts missions by reward (increasing order) within each file.
 *
 * Formula (all-or-nothing, calculated from victories):
 *   Reward = (replacement_cost + consumables_used + profitMargin) - expected_salvage
 *
 * Where:
 *   - replacement_cost = value of lost ships (player team)
 *   - consumables_used = missiles/ammo used by surviving ships
 *   - profitMargin = difficulty-based profit margin
 *   - expected_salvage = SALVAGE_RATE * (enemy ships killed value + friendly ships lost value)
 *
 * Victory = station destroyed (full reward)
 * Defeat = station survives (no reward)
 *
 * Usage:
 *   npx tsx scripts/tools/update-attack-station-rewards.mjs [sector]
 *   npx tsx scripts/tools/update-attack-station-rewards.mjs --dry-run [sector]
 *
 * Options:
 *   --dry-run  Show changes without writing to files
 */

import { SECTOR_1_ATTACK_STATION } from '../../src/ui/screens/missions/sector1/attack-station.ts';
import { getAssaultLoadoutDescription } from '../tests/shared/mission-simulation.mjs';
import {
  getArchetypeValue,
  getPlayerShipValue,
  PROFIT_MARGINS,
  SALVAGE_RATE,
} from '../tests/shared/mission-value.mjs';
import { runAttackStationMission } from './attack-station-simulation.mjs';
import { createProject, updateMissionFile } from './mission-file-updater.mjs';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const sectorArg = args.find((a) => !a.startsWith('--'));
const SECTOR = sectorArg ? parseInt(sectorArg, 10) : null;

const RUNS_PER_MISSION = 50;

// Attack station mission files by sector (only sector 1 for now)
const ATTACK_STATION_FILES = {
  1: 'src/ui/screens/missions/sector1/attack-station.ts',
};

// All attack station missions by sector
const ATTACK_STATION_MISSIONS = {
  1: SECTOR_1_ATTACK_STATION,
};

// ============================================================================
// Reward Calculation
// ============================================================================

function calculateAttackStationReward(mission, sector) {
  const results = [];

  for (let i = 0; i < RUNS_PER_MISSION; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runAttackStationMission(mission, seed, sector));
  }

  // Only victories count for reward calculation (all-or-nothing)
  const wins = results.filter((r) => r.winner === 'player');
  const winRate = (wins.length / results.length) * 100;

  if (wins.length === 0) {
    // If no wins, use fallback estimation
    return {
      reward: PROFIT_MARGINS[mission.difficulty] ?? PROFIT_MARGINS.medium,
      breakdown: {
        avgShipsLostValue: 0,
        avgConsumablesUsed: 0,
        expectedSalvage: 0,
        profitMargin:
          PROFIT_MARGINS[mission.difficulty] ?? PROFIT_MARGINS.medium,
        winRate: '0.0',
      },
    };
  }

  // Calculate averages from victories only (single pass for ship losses)
  let totalShipsLostValue = 0;
  let totalEnemyValue = 0;
  let totalConsumables = 0;

  for (const result of wins) {
    totalConsumables += result.consumablesUsed;

    for (const ship of result.shipsLost) {
      const value = getPlayerShipValue(ship.archetype, ship.skill);
      totalShipsLostValue += value.total;
    }

    for (const enemy of result.enemiesKilled) {
      const value = getArchetypeValue(enemy.archetype, true);
      totalEnemyValue += value.total;
    }
  }

  const avgShipsLostValue = totalShipsLostValue / wins.length;
  const avgConsumablesUsed = totalConsumables / wins.length;

  // Expected salvage: enemy ships + friendly ships lost (same value as replacement cost)
  const expectedSalvage =
    ((totalEnemyValue + totalShipsLostValue) / wins.length) * SALVAGE_RATE;

  // Profit margin by difficulty
  const profitMargin =
    PROFIT_MARGINS[mission.difficulty] ?? PROFIT_MARGINS.medium;

  // Formula: Reward = (replacement_cost + consumables + profit_margin) - expected_salvage
  const reward = Math.round(
    avgShipsLostValue + avgConsumablesUsed + profitMargin - expectedSalvage,
  );

  return {
    reward: Math.max(reward, 100),
    breakdown: {
      avgShipsLostValue: Math.round(avgShipsLostValue),
      avgConsumablesUsed: Math.round(avgConsumablesUsed),
      expectedSalvage: Math.round(expectedSalvage),
      profitMargin,
      winRate: winRate.toFixed(1),
    },
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const sectors = SECTOR ? [SECTOR] : [1];

  console.log('='.repeat(90));
  console.log(
    `ATTACK STATION MISSION REWARD UPDATER ${DRY_RUN ? '(DRY RUN)' : ''}`,
  );
  console.log(
    'Formula: Reward = (replacement_cost + consumables + profit) - salvage',
  );
  console.log('All-or-nothing: Victory = full reward, Defeat = nothing');
  console.log('='.repeat(90));

  const allUpdates = [];
  const rewardsByFile = {};

  for (const sector of sectors) {
    const missions = ATTACK_STATION_MISSIONS[sector];
    if (!missions || missions.length === 0) continue;

    const loadoutDesc = getAssaultLoadoutDescription(sector);

    console.log(`\n${'─'.repeat(90)}`);
    console.log(
      `SECTOR ${sector} ATTACK STATION (${missions.length} missions)`,
    );
    console.log(`Loadout: ${loadoutDesc}`);
    console.log('─'.repeat(90));
    console.log(
      'Mission'.padEnd(22) +
        'Diff'.padEnd(8) +
        'Current'.padEnd(10) +
        'New'.padEnd(10) +
        'WinRate'.padEnd(10) +
        'Delta',
    );
    console.log('─'.repeat(90));

    const filePath = ATTACK_STATION_FILES[sector];
    if (!rewardsByFile[filePath]) {
      rewardsByFile[filePath] = {};
    }

    for (const mission of missions) {
      process.stdout.write(
        `${`Calculating ${mission.name.substring(0, 14)}...`.padEnd(30)}\r`,
      );

      const { reward: newReward, breakdown } = calculateAttackStationReward(
        mission,
        sector,
      );
      const delta = newReward - mission.reward;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

      console.log(
        mission.name.substring(0, 21).padEnd(22) +
          mission.difficulty.padEnd(8) +
          mission.reward.toString().padEnd(10) +
          newReward.toString().padEnd(10) +
          `${breakdown.winRate}%`.padEnd(10) +
          deltaStr,
      );

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

  // Update files
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

  if (!DRY_RUN) {
    await project.save();
  }

  console.log(`\n${'='.repeat(90)}`);
  console.log(
    `SUMMARY: ${allUpdates.length} attack station mission rewards changed`,
  );

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
