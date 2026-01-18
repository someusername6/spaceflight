#!/usr/bin/env node
/**
 * Station Defense Mission Reward Updater
 *
 * Runs simulations and automatically updates station defense mission reward values.
 * Also sorts missions by reward (increasing order) within each file.
 *
 * Formula:
 *   Reward = (replacement_cost + consumables_used + profitMargin) / station_health_fraction - expected_salvage
 *
 * Where:
 *   - replacement_cost = value of lost ships (player team)
 *   - consumables_used = missiles/ammo used by surviving ships
 *   - profitMargin = difficulty-based profit margin (same as wave missions)
 *   - station_health_fraction = fraction of station hull remaining (victories only)
 *   - expected_salvage = SALVAGE_RATE * (enemy ships killed value + friendly ships lost value)
 *
 * Usage:
 *   npx tsx scripts/tools/update-station-defense-rewards.mjs [sector]
 *   npx tsx scripts/tools/update-station-defense-rewards.mjs --dry-run [sector]
 *
 * Options:
 *   --dry-run  Show changes without writing to files
 */

import path from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';
import { SECTOR_1_STATION_DEFENSE } from '../../src/ui/screens/missions/sector1/station-defense.ts';
import { SECTOR_2_STATION_DEFENSE } from '../../src/ui/screens/missions/sector2/station-defense.ts';
import { SECTOR_3_STATION_DEFENSE } from '../../src/ui/screens/missions/sector3/station-defense.ts';
import { SECTOR_4_STATION_DEFENSE } from '../../src/ui/screens/missions/sector4/station-defense.ts';
import { SECTOR_5_STATION_DEFENSE } from '../../src/ui/screens/missions/sector5/station-defense.ts';
import { getLoadoutDescription } from '../tests/shared/mission-simulation.mjs';
import {
  getArchetypeValue,
  getPlayerShipValue,
  PROFIT_MARGINS,
  SALVAGE_RATE,
} from '../tests/shared/mission-value.mjs';
import { runStationDefenseMission } from './station-defense-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const sectorArg = args.find((a) => !a.startsWith('--'));
const SECTOR = sectorArg ? parseInt(sectorArg, 10) : null;

const RUNS_PER_MISSION = 50;

// Station defense mission files by sector
const STATION_DEFENSE_FILES = {
  1: 'src/ui/screens/missions/sector1/station-defense.ts',
  2: 'src/ui/screens/missions/sector2/station-defense.ts',
  3: 'src/ui/screens/missions/sector3/station-defense.ts',
  4: 'src/ui/screens/missions/sector4/station-defense.ts',
  5: 'src/ui/screens/missions/sector5/station-defense.ts',
};

// All station defense missions by sector
const STATION_DEFENSE_MISSIONS = {
  1: SECTOR_1_STATION_DEFENSE,
  2: SECTOR_2_STATION_DEFENSE,
  3: SECTOR_3_STATION_DEFENSE,
  4: SECTOR_4_STATION_DEFENSE,
  5: SECTOR_5_STATION_DEFENSE,
};

// ============================================================================
// File Updater (ts-morph)
// ============================================================================

function createProject() {
  return new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });
}

function updateStationDefenseFile(project, filePath, rewardMap) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const sourceFile = project.addSourceFileAtPath(fullPath);

  const arrayDecl = sourceFile
    .getVariableDeclarations()
    .find((v) => v.getName().includes('SECTOR_'));

  if (!arrayDecl) {
    console.error(`  Could not find SECTOR_ array in ${filePath}`);
    return false;
  }

  const arrayLiteral = arrayDecl.getInitializerIfKind(
    SyntaxKind.ArrayLiteralExpression,
  );

  if (!arrayLiteral) {
    console.error(`  Could not find array literal in ${filePath}`);
    return false;
  }

  const missionElements = arrayLiteral.getElements();
  const missions = [];

  for (const element of missionElements) {
    if (element.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    const obj = element.asKind(SyntaxKind.ObjectLiteralExpression);
    const idProp = obj.getProperty('id');
    const rewardProp = obj.getProperty('reward');

    if (!idProp || !rewardProp) continue;

    const idInit = idProp
      .asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializer();
    const id = idInit?.getText().replace(/['"]/g, '');

    if (!id) continue;

    const newReward = rewardMap[id];

    if (newReward !== undefined) {
      const rewardAssign = rewardProp.asKind(SyntaxKind.PropertyAssignment);
      if (rewardAssign) {
        rewardAssign.setInitializer(newReward.toString());
      }
    }

    const currentReward =
      newReward ??
      parseInt(
        rewardProp
          .asKind(SyntaxKind.PropertyAssignment)
          ?.getInitializer()
          ?.getText() ?? '0',
        10,
      );

    missions.push({
      element: obj,
      id,
      reward: currentReward,
      text: obj.getFullText(),
    });
  }

  // Sort missions by reward (ascending)
  missions.sort((a, b) => a.reward - b.reward);

  const sortedTexts = missions.map((m) => m.element.getText());

  while (arrayLiteral.getElements().length > 0) {
    arrayLiteral.removeElement(0);
  }

  for (const text of sortedTexts) {
    arrayLiteral.addElement(text);
  }

  return true;
}

// ============================================================================
// Reward Calculation
// ============================================================================

function calculateStationDefenseReward(mission, sector) {
  const results = [];

  for (let i = 0; i < RUNS_PER_MISSION; i++) {
    const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
    results.push(runStationDefenseMission(mission, seed, sector));
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

  // Calculate expected salvage from killed enemies (from wins only)
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

  // Total expected salvage (enemy + friendly, both at SALVAGE_RATE)
  const expectedSalvage =
    (avgEnemySalvageValue + avgFriendlySalvageValue) * SALVAGE_RATE;

  // Calculate station health fraction from victories only
  // Higher health remaining = lower multiplier = lower reward
  let totalStationHealth = 0;
  for (const result of wins) {
    totalStationHealth += result.stationHealthPercent / 100;
  }
  const stationHealthFraction =
    wins.length > 0 ? totalStationHealth / wins.length : 0;

  // Profit margin by difficulty
  const profitMargin =
    PROFIT_MARGINS[mission.difficulty] ?? PROFIT_MARGINS.medium;

  // Formula: Reward = (replacement_cost + consumables + profit_margin) / station_health_fraction - expected_salvage
  // Guard against division by zero
  const effectiveHealth = Math.max(stationHealthFraction, 0.1);
  const baseCost = avgShipsLostValue + avgConsumablesUsed + profitMargin;
  const reward = Math.round(baseCost / effectiveHealth - expectedSalvage);

  return {
    reward: Math.max(reward, 100),
    breakdown: {
      avgShipsLostValue: Math.round(avgShipsLostValue),
      avgConsumablesUsed: Math.round(avgConsumablesUsed),
      expectedSalvage: Math.round(expectedSalvage),
      stationHealth: (stationHealthFraction * 100).toFixed(1),
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
  console.log(
    `STATION DEFENSE MISSION REWARD UPDATER ${DRY_RUN ? '(DRY RUN)' : ''}`,
  );
  console.log(
    'Formula: Reward = (replacement_cost + consumables + profit) / station_health - salvage',
  );
  console.log('='.repeat(90));

  const allUpdates = [];
  const rewardsByFile = {};

  for (const sector of sectors) {
    const missions = STATION_DEFENSE_MISSIONS[sector];
    if (!missions || missions.length === 0) continue;

    const loadoutDesc = getLoadoutDescription(sector);

    console.log(`\n${'─'.repeat(90)}`);
    console.log(
      `SECTOR ${sector} STATION DEFENSE (${missions.length} missions)`,
    );
    console.log(`Loadout: ${loadoutDesc}`);
    console.log('─'.repeat(90));
    console.log(
      'Mission'.padEnd(22) +
        'Diff'.padEnd(8) +
        'Current'.padEnd(10) +
        'New'.padEnd(10) +
        'WinRate'.padEnd(10) +
        'StationHP'.padEnd(12) +
        'Delta',
    );
    console.log('─'.repeat(90));

    const filePath = STATION_DEFENSE_FILES[sector];
    if (!rewardsByFile[filePath]) {
      rewardsByFile[filePath] = {};
    }

    for (const mission of missions) {
      process.stdout.write(
        `${`Calculating ${mission.name.substring(0, 14)}...`.padEnd(30)}\r`,
      );

      const { reward: newReward, breakdown } = calculateStationDefenseReward(
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
          `${breakdown.stationHealth}%`.padEnd(12) +
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
    const success = updateStationDefenseFile(project, filePath, rewardMap);
    if (success) {
      console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}Updated: ${filePath}`);
    }
  }

  if (!DRY_RUN) {
    await project.save();
  }

  console.log(`\n${'='.repeat(90)}`);
  console.log(
    `SUMMARY: ${allUpdates.length} station defense mission rewards changed`,
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
