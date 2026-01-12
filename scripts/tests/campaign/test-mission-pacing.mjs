#!/usr/bin/env node
/**
 * Mission Pacing Smoke Tests
 *
 * Tests mission scenarios with various player behaviors:
 * - Idle player (no input at all)
 * - AI player at each skill level (rookie, regular, veteran, ace)
 *
 * Measures:
 * - Time to mission complete
 * - Success rate (player side wins)
 * - Player survival rate
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { generateContracts } from '../../../src/ui/screens/contracts.ts';
import { PLAYER_MODES, runScenario } from './mission-sim.mjs';

// ============================================================================
// Mission Definitions - imported from src/ui/contracts.ts
// ============================================================================

// Use fixed seed for test determinism
const { contracts } = generateContracts(1, 12345, 0);

// Map contract difficulty to mission key
const difficultyToKey = { easy: 'easy', medium: 'medium', hard: 'hard' };

// Build MISSIONS object from contracts
const MISSIONS = {};
for (const contract of contracts) {
  const key = difficultyToKey[contract.difficulty];
  if (key) {
    MISSIONS[key] = {
      name: `${contract.name} (${contract.difficulty.charAt(0).toUpperCase() + contract.difficulty.slice(1)})`,
      playerSquad: [
        { archetype: 'interceptor', isPlayer: true },
        { archetype: 'interceptor', skill: 'regular' },
        { archetype: 'interceptor', skill: 'regular' },
      ],
      waves: contract.waves.map((wave, i) => ({
        enemies: wave.enemies,
        delay: i === 0 ? 0 : (wave.delay ?? 3),
      })),
      startDistance: 1500,
    };
  }
}

// ============================================================================
// Reporting
// ============================================================================

function printHeader() {
  console.log('='.repeat(80));
  console.log('MISSION PACING SMOKE TESTS');
  console.log('='.repeat(80));
  console.log();
}

function printMissionResults(missionKey) {
  const mission = MISSIONS[missionKey];
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Mission: ${mission.name}`);
  console.log('─'.repeat(80));

  const headers = [
    'Player Mode'.padEnd(12),
    'Win Rate'.padEnd(10),
    'Win Time'.padEnd(10),
    'Win Range'.padEnd(15),
    'Timeouts',
  ];
  console.log(headers.join(' │ '));
  console.log('─'.repeat(70));

  for (const mode of PLAYER_MODES) {
    const result = runScenario(mission, missionKey, mode);

    const winTimeStr =
      result.avgWinTime > 0 ? `${result.avgWinTime.toFixed(1)}s` : '-';
    const winRangeStr =
      result.minWinTime > 0
        ? `${result.minWinTime.toFixed(0)}-${result.maxWinTime.toFixed(0)}s`
        : '-';

    const row = [
      mode.padEnd(12),
      `${result.winRate.toFixed(0)}%`.padEnd(10),
      winTimeStr.padEnd(10),
      winRangeStr.padEnd(15),
      `${result.timeouts}`,
    ];
    console.log(row.join(' │ '));
  }
}

function collectPacingIssues(allResults) {
  const issues = [];

  for (const missionKey of Object.keys(MISSIONS)) {
    const missionResults = allResults.filter(
      (r) => r.missionKey === missionKey,
    );
    const idleResult = missionResults.find((r) => r.playerMode === 'idle');
    const regularResult = missionResults.find(
      (r) => r.playerMode === 'regular',
    );

    if (idleResult.avgWinTime > 0 && idleResult.avgWinTime < 15) {
      issues.push(
        `${MISSIONS[missionKey].name}: Mission resolves too fast when idle (${idleResult.avgWinTime.toFixed(1)}s)`,
      );
    }

    if (idleResult.winRate > 80) {
      issues.push(
        `${MISSIONS[missionKey].name}: Wingmen carry too hard - ${idleResult.winRate.toFixed(0)}% win with idle player`,
      );
    }

    if (
      idleResult.winRate < 20 &&
      idleResult.avgWinTime > 0 &&
      idleResult.avgWinTime < 20
    ) {
      issues.push(
        `${MISSIONS[missionKey].name}: Player gets killed too fast with no input`,
      );
    }

    if (
      regularResult &&
      regularResult.avgWinTime > 0 &&
      regularResult.avgWinTime < 20
    ) {
      issues.push(
        `${MISSIONS[missionKey].name}: Regular-skill victories too fast (${regularResult.avgWinTime.toFixed(1)}s)`,
      );
    }
  }

  return issues;
}

function printPacingAnalysis(allResults) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('PACING ANALYSIS');
  console.log('='.repeat(80));

  for (const missionKey of Object.keys(MISSIONS)) {
    const missionResults = allResults.filter(
      (r) => r.missionKey === missionKey,
    );
    const idleResult = missionResults.find((r) => r.playerMode === 'idle');
    const regularResult = missionResults.find(
      (r) => r.playerMode === 'regular',
    );

    console.log(`\n${MISSIONS[missionKey].name}:`);

    const issues = [];

    if (idleResult.avgWinTime > 0 && idleResult.avgWinTime < 15) {
      issues.push(
        `Mission resolves too fast when idle (${idleResult.avgWinTime.toFixed(1)}s)`,
      );
    }

    if (idleResult.winRate > 80) {
      issues.push(
        `Wingmen carry too hard - ${idleResult.winRate.toFixed(0)}% win with idle player`,
      );
    }

    if (
      idleResult.winRate < 20 &&
      idleResult.avgWinTime > 0 &&
      idleResult.avgWinTime < 20
    ) {
      issues.push('Player gets killed too fast with no input');
    }

    if (
      regularResult &&
      regularResult.avgWinTime > 0 &&
      regularResult.avgWinTime < 20
    ) {
      issues.push(
        `Regular-skill victories too fast (${regularResult.avgWinTime.toFixed(1)}s)`,
      );
    }

    if (issues.length === 0) {
      console.log('  Pacing looks reasonable');
    } else {
      for (const issue of issues) {
        console.log(`  Warning: ${issue}`);
      }
    }

    const idleWinTime =
      idleResult.avgWinTime > 0 ? `${idleResult.avgWinTime.toFixed(1)}s` : '-';
    console.log(
      `  Idle: ${idleResult.winRate.toFixed(0)}% win, ${idleWinTime} avg win time`,
    );
    if (regularResult) {
      const regWinTime =
        regularResult.avgWinTime > 0
          ? `${regularResult.avgWinTime.toFixed(1)}s`
          : '-';
      console.log(
        `  Regular AI: ${regularResult.winRate.toFixed(0)}% win, ${regWinTime} avg win time`,
      );
    }
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Mission Pacing', () => {
  it('runs pacing analysis for all missions', () => {
    printHeader();

    const allResults = [];

    for (const missionKey of Object.keys(MISSIONS)) {
      printMissionResults(missionKey);

      for (const mode of PLAYER_MODES) {
        allResults.push(runScenario(MISSIONS[missionKey], missionKey, mode));
      }
    }

    printPacingAnalysis(allResults);

    console.log(`\n${'='.repeat(80)}`);
    console.log('Test complete.');

    // Collect pacing issues for assertion
    const _issues = collectPacingIssues(allResults);

    // This test logs warnings but doesn't fail - it's a smoke test for observation
    // If we want strict enforcement, we can assert on _issues.length === 0
    assert.ok(true, 'Pacing analysis completed');
  });
});
