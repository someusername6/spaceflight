#!/usr/bin/env node
/**
 * Statistical Balance Audit for All Missions
 *
 * Runs 200 trials on every mission across all sectors and generates
 * a comprehensive balance report with statistical confidence.
 *
 * Usage:
 *   npx tsx scripts/tests/campaign/test-all-missions-statistical.mjs
 *   npx tsx scripts/tests/campaign/test-all-missions-statistical.mjs --sector 1
 *   npx tsx scripts/tests/campaign/test-all-missions-statistical.mjs --difficulty medium
 */

import { getMissionsForSector } from '../../../src/ui/screens/contracts-data.ts';
import {
  getLoadoutDescription,
  runMissionTrials,
} from '../shared/mission-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

const TRIALS_PER_MISSION = 200;

// Parse CLI args
const args = process.argv.slice(2);
const sectorArg = args.indexOf('--sector');
const difficultyArg = args.indexOf('--difficulty');
const FILTER_SECTOR = sectorArg >= 0 ? parseInt(args[sectorArg + 1], 10) : null;
const FILTER_DIFFICULTY = difficultyArg >= 0 ? args[difficultyArg + 1] : null;

// Balance targets by difficulty
const BALANCE_TARGETS = {
  easy: { min: 80, max: 90 },
  medium: { min: 70, max: 80 },
  hard: { min: 60, max: 70 },
};

// ============================================================================
// Statistical Functions
// ============================================================================

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
 * Determine pass/fail status based on 95% CI vs target range.
 */
function getStatus(ci, target, winRate) {
  if (ci.lower > target.max) {
    return 'FAIL_TOO_EASY';
  }
  if (ci.upper < target.min) {
    return 'FAIL_TOO_HARD';
  }
  if (ci.lower >= target.min && ci.upper <= target.max) {
    return 'PASS';
  }
  // CI overlaps boundary
  if (winRate >= target.min && winRate <= target.max) {
    return 'MARGINAL'; // Point estimate in range, CI extends outside
  }
  return 'NEEDS_ATTENTION'; // Point estimate AND CI boundary outside target
}

// ============================================================================
// Main
// ============================================================================

console.log('='.repeat(90));
console.log('STATISTICAL BALANCE AUDIT');
console.log('='.repeat(90));
console.log(`Trials per mission: ${TRIALS_PER_MISSION}`);
if (FILTER_SECTOR) console.log(`Filter: Sector ${FILTER_SECTOR}`);
if (FILTER_DIFFICULTY) console.log(`Filter: ${FILTER_DIFFICULTY} difficulty`);
console.log('');

// Collect all missions
const allMissions = [];
for (let sector = 1; sector <= 5; sector++) {
  if (FILTER_SECTOR && sector !== FILTER_SECTOR) continue;
  const missions = getMissionsForSector(sector);
  for (const mission of missions) {
    if (FILTER_DIFFICULTY && mission.difficulty !== FILTER_DIFFICULTY) continue;
    allMissions.push({ ...mission, sector });
  }
}

console.log(`Total missions to test: ${allMissions.length}`);
const estimatedTime = Math.round((allMissions.length * 40) / 60);
console.log(`Estimated time: ~${estimatedTime} minutes`);
console.log('');

// Run tests
const results = [];
const startTime = Date.now();

for (let i = 0; i < allMissions.length; i++) {
  const mission = allMissions[i];
  const progress = `[${i + 1}/${allMissions.length}]`;
  process.stdout.write(
    `${`${progress} Testing "${mission.name}"...`.padEnd(60)}\r`,
  );

  const trialResult = runMissionTrials(
    mission,
    mission.sector,
    TRIALS_PER_MISSION,
  );
  const ci = confidenceInterval95(trialResult.wins, trialResult.runs);
  const target = BALANCE_TARGETS[mission.difficulty];
  const status = getStatus(ci, target, trialResult.winRate);

  results.push({
    mission,
    sector: mission.sector,
    difficulty: mission.difficulty,
    winRate: trialResult.winRate,
    ci,
    target,
    status,
    avgTime: trialResult.avgTime,
    avgSurvivors: trialResult.avgSurvivors,
    timeouts: trialResult.timeouts,
  });
}

const elapsed = Math.round((Date.now() - startTime) / 1000);
console.log(''.padEnd(70)); // Clear progress line
console.log(`Completed in ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
console.log('');

// ============================================================================
// Report by Sector and Difficulty
// ============================================================================

console.log('='.repeat(90));
console.log('DETAILED RESULTS');
console.log('='.repeat(90));

const header =
  'Mission'.padEnd(24) +
  'Diff'.padEnd(8) +
  'WinRate'.padEnd(9) +
  '95% CI'.padEnd(14) +
  'Target'.padEnd(11) +
  'Status'.padEnd(16) +
  'Time';
console.log(header);
console.log('-'.repeat(90));

// Sort by sector, then difficulty, then status
const sortOrder = {
  FAIL_TOO_HARD: 0,
  FAIL_TOO_EASY: 1,
  NEEDS_ATTENTION: 2,
  MARGINAL: 3,
  PASS: 4,
};
results.sort((a, b) => {
  if (a.sector !== b.sector) return a.sector - b.sector;
  if (a.difficulty !== b.difficulty) {
    const diffOrder = { easy: 0, medium: 1, hard: 2 };
    return diffOrder[a.difficulty] - diffOrder[b.difficulty];
  }
  return sortOrder[a.status] - sortOrder[b.status];
});

let currentSector = null;
for (const r of results) {
  if (r.sector !== currentSector) {
    if (currentSector !== null) console.log('');
    currentSector = r.sector;
    console.log(
      `--- SECTOR ${r.sector} (${getLoadoutDescription(r.sector)}) ---`,
    );
  }

  const statusIcon =
    r.status === 'PASS'
      ? ' '
      : r.status === 'MARGINAL'
        ? '~'
        : r.status === 'FAIL_TOO_EASY'
          ? '!'
          : r.status === 'FAIL_TOO_HARD'
            ? '!'
            : '?';

  const ciStr = `${r.ci.lower.toFixed(0)}-${r.ci.upper.toFixed(0)}%`;
  const targetStr = `${r.target.min}-${r.target.max}%`;

  console.log(
    r.mission.name.substring(0, 23).padEnd(24) +
      r.difficulty.padEnd(8) +
      `${r.winRate.toFixed(0)}%`.padEnd(9) +
      ciStr.padEnd(14) +
      targetStr.padEnd(11) +
      `${statusIcon} ${r.status}`.padEnd(16) +
      `${r.avgTime.toFixed(0)}s`,
  );
}

// ============================================================================
// Summary
// ============================================================================

console.log('');
console.log('='.repeat(90));
console.log('SUMMARY');
console.log('='.repeat(90));

const byStatus = {
  PASS: results.filter((r) => r.status === 'PASS'),
  MARGINAL: results.filter((r) => r.status === 'MARGINAL'),
  NEEDS_ATTENTION: results.filter((r) => r.status === 'NEEDS_ATTENTION'),
  FAIL_TOO_EASY: results.filter((r) => r.status === 'FAIL_TOO_EASY'),
  FAIL_TOO_HARD: results.filter((r) => r.status === 'FAIL_TOO_HARD'),
};

console.log(`Total missions: ${results.length}`);
console.log(
  `  PASS:            ${byStatus.PASS.length} (CI entirely within target)`,
);
console.log(
  `  MARGINAL:        ${byStatus.MARGINAL.length} (point estimate OK, CI overlaps boundary)`,
);
console.log(
  `  NEEDS_ATTENTION: ${byStatus.NEEDS_ATTENTION.length} (point estimate and CI outside target)`,
);
console.log(
  `  FAIL_TOO_EASY:   ${byStatus.FAIL_TOO_EASY.length} (CI entirely above target max)`,
);
console.log(
  `  FAIL_TOO_HARD:   ${byStatus.FAIL_TOO_HARD.length} (CI entirely below target min)`,
);

const failures = [
  ...byStatus.FAIL_TOO_EASY,
  ...byStatus.FAIL_TOO_HARD,
  ...byStatus.NEEDS_ATTENTION,
];
if (failures.length > 0) {
  console.log('');
  console.log('='.repeat(90));
  console.log('MISSIONS REQUIRING REBALANCING');
  console.log('='.repeat(90));

  for (const r of failures) {
    const direction =
      r.status === 'FAIL_TOO_HARD' ||
      (r.status === 'NEEDS_ATTENTION' && r.winRate < r.target.min)
        ? 'make easier'
        : 'make harder';
    console.log(
      `  - "${r.mission.name}" (S${r.sector} ${r.difficulty}): ${r.winRate.toFixed(0)}% vs ${r.target.min}-${r.target.max}% -> ${direction}`,
    );
  }
}

console.log('');
console.log('='.repeat(90));
console.log('AUDIT COMPLETE');
console.log('='.repeat(90));

// Exit with error code if there are failures
const failCount = byStatus.FAIL_TOO_EASY.length + byStatus.FAIL_TOO_HARD.length;
if (failCount > 0) {
  process.exit(1);
}
