/**
 * Stock Balance Simulation - Output and Results Display
 *
 * This file contains functions for printing simulation results.
 * Extracted to keep the main simulation file under 400 lines.
 */

import { CONSTANTS } from './stock-balance-data.mjs';

/**
 * Print detailed simulation results to console.
 */
export function printResults(results, numRuns) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('STOCK SYSTEM SIMULATION RESULTS');
  console.log('='.repeat(70));
  console.log(`Runs per profile: ${numRuns}`);
  console.log(
    `Missions simulated: S1(9) + S2(8) + S3(8) + S4(8) + S5(20) = 53`,
  );
  console.log('');

  console.log('CONSTANTS TESTED:');
  console.log(`  SHIP_BASE: ${CONSTANTS.SHIP_BASE}`);
  console.log(`  SHIP_SECTOR_BONUS: ${CONSTANTS.SHIP_SECTOR_BONUS}`);
  console.log(`  PRIMARY_BASE: ${CONSTANTS.PRIMARY_BASE}`);
  console.log(`  PRIMARY_SECTOR_BONUS: ${CONSTANTS.PRIMARY_SECTOR_BONUS}`);
  console.log(`  MISSILE_BASE_LOADS: ${CONSTANTS.MISSILE_BASE_LOADS}`);
  console.log(`  AMMO_BASE_REFILLS: ${CONSTANTS.AMMO_BASE_REFILLS}`);
  console.log(`  TRICKLE_PROB_BASE: ${CONSTANTS.TRICKLE_PROB_BASE}`);
  console.log(`  TRICKLE_PROB_DECAY: ${CONSTANTS.TRICKLE_PROB_DECAY}`);
  console.log(`  MISSILE_TRICKLE_LOADS: ${CONSTANTS.MISSILE_TRICKLE_LOADS}`);
  console.log(`  AMMO_TRICKLE_REFILLS: ${CONSTANTS.AMMO_TRICKLE_REFILLS}`);
  console.log('');

  for (const [_profileId, stats] of Object.entries(results)) {
    printProfileStats(stats, numRuns);
  }

  printAnalysisSummary(results, numRuns);
}

/**
 * Print stats for a single player profile.
 */
function printProfileStats(stats, numRuns) {
  console.log('-'.repeat(70));
  console.log(`PROFILE: ${stats.profile}`);
  console.log(`  ${stats.description}`);
  console.log('');

  const shortageRate = ((stats.runsWithShortages / numRuns) * 100).toFixed(1);
  console.log(`  Shortage Rate: ${shortageRate}% of runs had shortages`);
  console.log('');

  console.log('  Average Shortages per Run:');
  console.log(`    Ships: ${stats.avgShipShortages.toFixed(2)}`);
  console.log(`    Primaries: ${stats.avgPrimaryShortages.toFixed(2)}`);
  console.log(`    Missiles: ${stats.avgMissileShortages.toFixed(1)}`);
  console.log(`    Ammo: ${stats.avgAmmoShortages.toFixed(0)}`);
  console.log('');

  console.log('  Average Consumption per Run:');
  console.log(`    Ships purchased: ${stats.avgShipsPurchased.toFixed(1)}`);
  console.log(
    `    Primaries purchased: ${stats.avgPrimariesPurchased.toFixed(1)}`,
  );
  console.log(`    Missiles used: ${stats.avgMissilesUsed.toFixed(0)}`);
  console.log(`    Ammo used: ${stats.avgAmmoUsed.toFixed(0)}`);
  console.log('');

  if (Object.keys(stats.shortagesBySector).length > 0) {
    console.log('  Shortages by Sector:');
    for (const [sector, count] of Object.entries(stats.shortagesBySector)) {
      console.log(`    ${sector}: ${count} events`);
    }
    console.log('');
  }

  if (Object.keys(stats.shortagesByItem).length > 0) {
    console.log('  Top Shortage Items:');
    const sorted = Object.entries(stats.shortagesByItem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [item, count] of sorted) {
      console.log(`    ${item}: ${count} events`);
    }
    console.log('');
  }

  console.log('  Avg Final Stock (End of S5):');
  console.log('    Ships:', JSON.stringify(stats.avgFinalStock.ships));
  console.log('    Primaries:', JSON.stringify(stats.avgFinalStock.primaries));
  console.log('    Missiles:', JSON.stringify(stats.avgFinalStock.missiles));
  console.log('    Ammo:', JSON.stringify(stats.avgFinalStock.ammo));
  console.log('');
}

/**
 * Print analysis summary and recommendations.
 */
function printAnalysisSummary(results, numRuns) {
  console.log('='.repeat(70));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(70));

  const balanced = results.balanced;
  const aggressive = results.aggressive;
  const missileSpammer = results.missileSpammer;

  console.log('');
  console.log('Target: Balanced profile should have <10% shortage rate');
  console.log(
    `  Actual: ${((balanced.runsWithShortages / numRuns) * 100).toFixed(1)}%`,
  );
  console.log('');

  console.log('Target: Aggressive profile should have <30% shortage rate');
  console.log(
    `  Actual: ${((aggressive.runsWithShortages / numRuns) * 100).toFixed(1)}%`,
  );
  console.log('');

  console.log('Target: Missile Spammer should feel constrained but playable');
  console.log(
    `  Actual: ${((missileSpammer.runsWithShortages / numRuns) * 100).toFixed(1)}% shortage rate`,
  );
  console.log(
    `  Avg missile shortages: ${missileSpammer.avgMissileShortages.toFixed(0)}`,
  );
  console.log('');

  // Check for accumulation issues
  const conservativeFinal = results.conservative.avgFinalStock;
  console.log('Accumulation Check (Conservative final stocks):');
  const highAccumulation = [];
  for (const [name, count] of Object.entries(conservativeFinal.missiles)) {
    if (count > 2000) highAccumulation.push(`${name}: ${count}`);
  }
  if (highAccumulation.length > 0) {
    console.log(
      `  Warning: High missile accumulation: ${highAccumulation.join(', ')}`,
    );
  } else {
    console.log('  Missile accumulation: OK');
  }
  console.log('');
}
