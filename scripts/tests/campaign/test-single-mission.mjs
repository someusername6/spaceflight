#!/usr/bin/env node
/**
 * Single Mission Statistical Test
 *
 * Runs many trials of a specific mission for statistical significance testing.
 * Usage:
 *   npx tsx scripts/tests/campaign/test-single-mission.mjs "Mission Name" [sector] [trials]
 *
 * Example:
 *   npx tsx scripts/tests/campaign/test-single-mission.mjs "Another Day in Paradise" 1 200
 */

import { getMissionsForSector } from '../../../src/ui/screens/contracts-data.ts';
import {
  getLoadoutDescription,
  runMissionTrials,
} from '../shared/mission-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

const MISSION_NAME = process.argv[2] || 'Another Day in Paradise';
const SECTOR = parseInt(process.argv[3], 10) || 1;
const NUM_TRIALS = parseInt(process.argv[4], 10) || 200;

// Balance targets by difficulty
const BALANCE_TARGETS = {
  easy: { min: 60, max: 80 },
  medium: { min: 40, max: 60 },
  hard: { min: 20, max: 40 },
};

// ============================================================================
// Statistical Functions
// ============================================================================

/**
 * Calculate 95% confidence interval for a proportion.
 * Uses normal approximation: p ± 1.96 * sqrt(p(1-p)/n)
 */
function confidenceInterval95(wins, trials) {
  const p = wins / trials;
  const z = 1.96;
  const se = Math.sqrt((p * (1 - p)) / trials);
  return {
    lower: Math.max(0, (p - z * se) * 100),
    upper: Math.min(100, (p + z * se) * 100),
  };
}

/**
 * Calculate z-score for comparing observed win rate to expected.
 * H0: true proportion = expected
 */
function zScore(wins, trials, expectedRate) {
  const p = wins / trials;
  const p0 = expectedRate / 100;
  const se = Math.sqrt((p0 * (1 - p0)) / trials);
  return (p - p0) / se;
}

/**
 * Two-tailed p-value from z-score.
 */
function pValueFromZ(z) {
  // Standard normal CDF approximation (Abramowitz and Stegun)
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp((-absZ * absZ) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * p; // two-tailed
}

// ============================================================================
// Main
// ============================================================================

// Support lookup by name or ID
let mission = null;
let missionSector = SECTOR;

// First try to find by name or ID in specified sector
const sectorMissions = getMissionsForSector(SECTOR);
mission = sectorMissions.find(
  (m) => m.name === MISSION_NAME || m.id === MISSION_NAME,
);

// If not found and no sector specified, search all sectors
if (!mission && !process.argv[3]) {
  for (let s = 1; s <= 5; s++) {
    const missions = getMissionsForSector(s);
    const found = missions.find(
      (m) => m.name === MISSION_NAME || m.id === MISSION_NAME,
    );
    if (found) {
      mission = found;
      missionSector = s;
      break;
    }
  }
}

if (!mission) {
  console.error(`Mission "${MISSION_NAME}" not found`);
  console.error('Available missions in sector ' + SECTOR + ':');
  for (const m of sectorMissions) {
    console.error(`  - ${m.name} (${m.difficulty}) [${m.id}]`);
  }
  process.exit(1);
}

// Use found sector if auto-detected
const EFFECTIVE_SECTOR = missionSector;

const target = BALANCE_TARGETS[mission.difficulty];
const loadoutDesc = getLoadoutDescription(EFFECTIVE_SECTOR);

console.log('='.repeat(80));
console.log(`SINGLE MISSION STATISTICAL TEST`);
console.log('='.repeat(80));
console.log(`Mission: ${mission.name} [${mission.id}]`);
console.log(
  `Difficulty: ${mission.difficulty} (target: ${target.min}-${target.max}%)`,
);
console.log(`Sector: ${EFFECTIVE_SECTOR}`);
console.log(`Loadout: ${loadoutDesc}`);
console.log(`Trials: ${NUM_TRIALS}`);
console.log('-'.repeat(80));
console.log('Running simulation...');

const startTime = Date.now();
const result = runMissionTrials(mission, EFFECTIVE_SECTOR, NUM_TRIALS);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`Completed in ${elapsed}s`);
console.log('');

// Results
console.log('='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`Wins: ${result.wins} / ${result.runs}`);
console.log(`Win Rate: ${result.winRate.toFixed(1)}%`);
console.log(`Avg Victory Time: ${result.avgTime.toFixed(1)}s`);
console.log(`Avg Survivors: ${result.avgSurvivors.toFixed(2)}`);
console.log(`Timeouts: ${result.timeouts}`);
console.log('');

// Statistical Analysis
console.log('='.repeat(80));
console.log('STATISTICAL ANALYSIS');
console.log('='.repeat(80));

const ci = confidenceInterval95(result.wins, result.runs);
console.log(`95% CI: ${ci.lower.toFixed(1)}% - ${ci.upper.toFixed(1)}%`);
console.log(`Margin of Error: ±${((ci.upper - ci.lower) / 2).toFixed(1)}%`);

// Test against target bounds
const targetMid = (target.min + target.max) / 2;
const z = zScore(result.wins, result.runs, targetMid);
const p = pValueFromZ(z);

console.log('');
console.log(`Test vs Target Midpoint (${targetMid}%):`);
console.log(`  z-score: ${z.toFixed(3)}`);
console.log(`  p-value: ${p.toFixed(4)}`);
console.log(`  Significant (p < 0.05): ${p < 0.05 ? 'YES' : 'NO'}`);
console.log(`  Significant (p < 0.01): ${p < 0.01 ? 'YES' : 'NO'}`);

// Determine status
console.log('');
console.log('='.repeat(80));
console.log('CONCLUSION');
console.log('='.repeat(80));

let exitCode = 0;
if (ci.lower > target.max) {
  console.log(`Status: FAIL - TOO EASY (95% CI entirely above ${target.max}%)`);
  console.log(`Recommendation: Add enemies, upgrade skills, or add waves`);
  exitCode = 1;
} else if (ci.upper < target.min) {
  console.log(`Status: FAIL - TOO HARD (95% CI entirely below ${target.min}%)`);
  console.log(
    `Recommendation: Remove enemies, downgrade skills, or remove waves`,
  );
  exitCode = 1;
} else if (ci.lower >= target.min && ci.upper <= target.max) {
  console.log(
    `Status: PASS (95% CI entirely within ${target.min}-${target.max}%)`,
  );
} else {
  console.log(`Status: MARGINAL (95% CI overlaps target range)`);
  if (result.winRate > target.max) {
    console.log(`Recommendation: Slightly increase difficulty`);
  } else if (result.winRate < target.min) {
    console.log(`Recommendation: Slightly decrease difficulty`);
  }
}

// Show wave composition for context
console.log('');
console.log('Wave Composition:');
mission.waves.forEach((wave, i) => {
  const enemies = wave.enemies
    .map((e) => `${e.count}x ${e.archetype}${e.skill ? ` (${e.skill})` : ''}`)
    .join(', ');
  console.log(`  Wave ${i + 1}: ${enemies}`);
});

console.log('='.repeat(80));

process.exit(exitCode);
