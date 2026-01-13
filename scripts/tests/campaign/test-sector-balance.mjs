#!/usr/bin/env node
/**
 * Sector Mission Balance Test
 *
 * Tests missions for a single sector and difficulty level.
 * Usage:
 *   npx tsx scripts/tests/campaign/test-sector-balance.mjs 1 easy
 *   npx tsx scripts/tests/campaign/test-sector-balance.mjs 1 medium
 *   npx tsx scripts/tests/campaign/test-sector-balance.mjs 1 hard
 *   npx tsx scripts/tests/campaign/test-sector-balance.mjs 1  # all difficulties
 *
 * Balance targets by difficulty:
 * - Easy: 80-90% win rate
 * - Medium: 70-80% win rate
 * - Hard: 60-70% win rate
 * - All: 90-180s average victory time
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getMissionsForSector } from '../../../src/ui/screens/contracts-data.ts';
import {
  getLoadoutDescription,
  runMissionTrials,
} from '../shared/mission-simulation.mjs';

// ============================================================================
// Configuration
// ============================================================================

const SECTOR = parseInt(process.argv[2], 10) || 1;
const DIFFICULTY = process.argv[3] || null; // easy, medium, hard, or null for all
const RUNS_PER_MISSION = 30;

// Balance targets by DIFFICULTY:
// - Easy: 80-90% win rate
// - Medium: 70-80% win rate
// - Hard: 60-70% win rate
// - All with 90s+ average victory time
const BALANCE_TARGETS = {
  easy: { min: 80, max: 90 },
  medium: { min: 70, max: 80 },
  hard: { min: 60, max: 70 },
};
const MIN_AVG_TIME = 90; // seconds
const MAX_AVG_TIME = 180; // seconds

// ============================================================================
// Tests
// ============================================================================

const difficultyLabel = DIFFICULTY ? DIFFICULTY.toUpperCase() : 'ALL';

describe(`Sector ${SECTOR} ${difficultyLabel} Balance`, () => {
  let missions = getMissionsForSector(SECTOR);

  // Filter by difficulty if specified
  if (DIFFICULTY) {
    missions = missions.filter((m) => m.difficulty === DIFFICULTY);
  }

  it('has missions to test', () => {
    assert.ok(
      missions.length > 0,
      `No missions found for sector ${SECTOR}${DIFFICULTY ? ` difficulty ${DIFFICULTY}` : ''}`,
    );
  });

  it('all missions meet balance targets', () => {
    if (missions.length === 0) {
      return; // Skip if no missions
    }

    const loadoutDesc = getLoadoutDescription(SECTOR);

    console.log('='.repeat(90));
    console.log(
      `SECTOR ${SECTOR} ${difficultyLabel} BALANCE TEST (${missions.length} missions, ${RUNS_PER_MISSION} runs each)`,
    );
    console.log(`Loadout: ${loadoutDesc}`);
    console.log(
      `Targets: Easy 80-90%, Medium 70-80%, Hard 60-70%, all 90-180s avg time`,
    );
    console.log('='.repeat(90));
    console.log(
      'Mission'.padEnd(22) +
        'Diff'.padEnd(8) +
        'WinRate'.padEnd(9) +
        'Target'.padEnd(11) +
        'Status'.padEnd(12) +
        'Time'.padEnd(8) +
        'Surv'.padEnd(6) +
        'T/O',
    );
    console.log('-'.repeat(90));

    const results = [];
    for (const mission of missions) {
      process.stdout.write(
        `${`Testing ${mission.name.substring(0, 18)}...`.padEnd(30)}\r`,
      );
      const result = runMissionTrials(mission, SECTOR, RUNS_PER_MISSION);
      const target = BALANCE_TARGETS[mission.difficulty];

      let status = 'OK';
      if (result.winRate < target.min) status = 'TOO HARD';
      else if (result.winRate > target.max) status = 'TOO EASY';
      else if (result.avgTime < MIN_AVG_TIME && result.winRate > 0)
        status = 'TOO SHORT';
      else if (result.avgTime > MAX_AVG_TIME && result.winRate > 0)
        status = 'TOO LONG';

      results.push({ ...result, mission, target, status });

      console.log(
        mission.name.substring(0, 21).padEnd(22) +
          mission.difficulty.padEnd(8) +
          `${result.winRate.toFixed(0)}%`.padEnd(9) +
          `${target.min}-${target.max}%`.padEnd(11) +
          status.padEnd(12) +
          `${result.avgTime.toFixed(0)}s`.padEnd(8) +
          `${result.avgSurvivors.toFixed(1)}`.padEnd(6) +
          result.timeouts,
      );
    }

    // Summary
    console.log('-'.repeat(90));
    const ok = results.filter((r) => r.status === 'OK').length;
    const hard = results.filter((r) => r.status === 'TOO HARD').length;
    const easy = results.filter((r) => r.status === 'TOO EASY').length;
    const short = results.filter((r) => r.status === 'TOO SHORT').length;
    const long = results.filter((r) => r.status === 'TOO LONG').length;
    console.log(
      `Results: ${ok} OK, ${hard} TOO HARD, ${easy} TOO EASY, ${short} TOO SHORT, ${long} TOO LONG`,
    );

    const failCount = hard + easy + short + long;
    assert.strictEqual(
      failCount,
      0,
      `${failCount} missions failed balance check`,
    );
  });
});
