#!/usr/bin/env node
/**
 * Ambush Mission Reward Updater
 *
 * Runs simulations and automatically updates ambush mission reward values.
 * Also sorts missions by reward (increasing order) within each file.
 *
 * Formula:
 *   Reward = (replacement_cost + consumables_used + profitMargin - expected_salvage) / reward_multiplier
 *
 * Where:
 *   - replacement_cost = value of lost ships (player team only)
 *   - consumables_used = missiles/ammo used by surviving ships
 *   - profitMargin = difficulty-based profit margin
 *   - reward_multiplier = cargo capture rate (stopped = 100%, destroyed = 50%)
 *   - expected_salvage = SALVAGE_RATE * (enemy escorts killed value + friendly ships lost value)
 *
 * Usage:
 *   npx tsx scripts/tools/update-ambush-rewards.mjs [sector]
 *   npx tsx scripts/tools/update-ambush-rewards.mjs --dry-run [sector]
 *
 * Options:
 *   --dry-run  Show changes without writing to files
 */

import { SECTOR_1_AMBUSH } from '../../src/ui/screens/missions/sector1/ambush.ts';
import { SECTOR_2_AMBUSH } from '../../src/ui/screens/missions/sector2/ambush.ts';
import { SECTOR_3_AMBUSH } from '../../src/ui/screens/missions/sector3/ambush.ts';
import { SECTOR_4_AMBUSH } from '../../src/ui/screens/missions/sector4/ambush.ts';
import { SECTOR_5_AMBUSH } from '../../src/ui/screens/missions/sector5/ambush.ts';
import { getLoadoutDescription } from '../tests/shared/mission-simulation.mjs';
import {
  getArchetypeValue,
  getPlayerShipValue,
  PROFIT_MARGINS,
  SALVAGE_RATE,
} from '../tests/shared/mission-value.mjs';
import { createProject, updateAmbushFile } from './ambush-file-updater.mjs';
import { runAmbushMission } from './ambush-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const sectorArg = args.find((a) => !a.startsWith('--'));
const SECTOR = sectorArg ? parseInt(sectorArg, 10) : null;

const RUNS_PER_MISSION = 50;

// Ambush mission files by sector
const AMBUSH_FILES = {
  1: 'src/ui/screens/missions/sector1/ambush.ts',
  2: 'src/ui/screens/missions/sector2/ambush.ts',
  3: 'src/ui/screens/missions/sector3/ambush.ts',
  4: 'src/ui/screens/missions/sector4/ambush.ts',
  5: 'src/ui/screens/missions/sector5/ambush.ts',
};

// All ambush missions by sector
const AMBUSH_MISSIONS = {
  1: SECTOR_1_AMBUSH,
  2: SECTOR_2_AMBUSH,
  3: SECTOR_3_AMBUSH,
  4: SECTOR_4_AMBUSH,
  5: SECTOR_5_AMBUSH,
};

// ============================================================================
// Reward Calculation
// ============================================================================

function calculateAmbushReward(mission, sector) {
  const results = [];

  for (let i = 0; i < RUNS_PER_MISSION; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runAmbushMission(mission, seed, sector));
  }

  // Calculate average ships lost value
  let totalLostValue = 0;
  for (const result of results) {
    for (const ship of result.shipsLost) {
      const value = getPlayerShipValue(ship.archetype, ship.skill);
      totalLostValue += value.total;
    }
  }
  const avgShipsLostValue = totalLostValue / results.length;

  // Calculate average consumables used (from wins only)
  const wins = results.filter((r) => r.winner === 'player');
  const avgConsumablesUsed =
    wins.length > 0
      ? wins.reduce((sum, r) => sum + r.consumablesUsed, 0) / wins.length
      : 0;

  // Calculate expected salvage from killed escort enemies (from wins only)
  let totalEnemySalvageValue = 0;
  for (const result of wins) {
    for (const enemy of result.enemiesKilled) {
      const value = getArchetypeValue(enemy.archetype, true);
      totalEnemySalvageValue += value.total;
    }
  }
  const avgEnemySalvageValue =
    wins.length > 0 ? totalEnemySalvageValue / wins.length : 0;

  // Calculate expected salvage from lost friendly ships (from wins only)
  let totalFriendlySalvageValue = 0;
  for (const result of wins) {
    for (const ship of result.shipsLost) {
      const value = getPlayerShipValue(ship.archetype, ship.skill);
      totalFriendlySalvageValue += value.total;
    }
  }
  const avgFriendlySalvageValue =
    wins.length > 0 ? totalFriendlySalvageValue / wins.length : 0;

  // Total expected salvage
  const expectedSalvage =
    (avgEnemySalvageValue + avgFriendlySalvageValue) * SALVAGE_RATE;

  // Calculate average reward multiplier from victories
  // (stopped convoy = 100%, destroyed = 50%)
  const avgRewardMultiplier =
    wins.length > 0
      ? wins.reduce((sum, r) => sum + r.rewardMultiplier, 0) / wins.length
      : 0;

  // Profit margin by difficulty
  const profitMargin =
    PROFIT_MARGINS[mission.difficulty] ?? PROFIT_MARGINS.medium;

  // Formula: Reward = (replacement_cost + consumables + profit_margin - expected_salvage) / reward_multiplier
  // Guard against division by zero
  const effectiveMultiplier = Math.max(avgRewardMultiplier, 0.1);
  const baseCost =
    avgShipsLostValue + avgConsumablesUsed + profitMargin - expectedSalvage;
  const reward = Math.round(baseCost / effectiveMultiplier);

  return {
    reward: Math.max(reward, 100),
    breakdown: {
      avgShipsLostValue: Math.round(avgShipsLostValue),
      avgConsumablesUsed: Math.round(avgConsumablesUsed),
      expectedSalvage: Math.round(expectedSalvage),
      avgRewardMultiplier: avgRewardMultiplier.toFixed(2),
      profitMargin,
      winRate: ((wins.length / results.length) * 100).toFixed(1),
    },
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const sectors = SECTOR ? [SECTOR] : [1, 2, 3, 4, 5];

  console.log('='.repeat(90));
  console.log(`AMBUSH MISSION REWARD UPDATER ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(
    'Formula: Reward = (replacement_cost + consumables + profit) / reward_multiplier - salvage',
  );
  console.log('='.repeat(90));

  const allUpdates = [];
  const rewardsByFile = {};

  for (const sector of sectors) {
    const missions = AMBUSH_MISSIONS[sector];
    if (!missions || missions.length === 0) continue;

    const loadoutDesc = getLoadoutDescription(sector);

    console.log(`\n${'─'.repeat(90)}`);
    console.log(`SECTOR ${sector} AMBUSH (${missions.length} missions)`);
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

    const filePath = AMBUSH_FILES[sector];
    if (!rewardsByFile[filePath]) {
      rewardsByFile[filePath] = {};
    }

    for (const mission of missions) {
      process.stdout.write(
        `${`Calculating ${mission.name.substring(0, 14)}...`.padEnd(30)}\r`,
      );

      const { reward: newReward, breakdown } = calculateAmbushReward(
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
    const success = updateAmbushFile(project, filePath, rewardMap);
    if (success) {
      console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}Updated: ${filePath}`);
    }
  }

  if (!DRY_RUN) {
    await project.save();
  }

  console.log(`\n${'='.repeat(90)}`);
  console.log(`SUMMARY: ${allUpdates.length} ambush mission rewards changed`);

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
