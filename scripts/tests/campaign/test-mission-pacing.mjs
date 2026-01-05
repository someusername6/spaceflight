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

import { PLAYER_MODES, runScenario } from './mission-sim.mjs';

// ============================================================================
// Mission Definitions - MUST match src/ui/contracts.ts
// ============================================================================

const MISSIONS = {
  easy: {
    name: 'Patrol Duty (Easy)',
    playerSquad: [
      { archetype: 'interceptor', isPlayer: true },
      { archetype: 'interceptor', skill: 'regular' },
      { archetype: 'interceptor', skill: 'regular' },
    ],
    // Matches contracts.ts: 2 waves = 3 total rookie scouts
    waves: [
      {
        enemies: [{ archetype: 'scout', skill: 'rookie', count: 2 }],
        delay: 0,
      },
      {
        enemies: [{ archetype: 'scout', skill: 'rookie', count: 1 }],
        delay: 3,
      },
    ],
    startDistance: 1500,
  },
  medium: {
    name: 'Escort Mission (Medium)',
    playerSquad: [
      { archetype: 'interceptor', isPlayer: true },
      { archetype: 'interceptor', skill: 'regular' },
      { archetype: 'interceptor', skill: 'regular' },
    ],
    // Matches contracts.ts: 2 waves = scouts then scout + interceptor (4 total)
    waves: [
      {
        enemies: [{ archetype: 'scout', skill: 'rookie', count: 2 }],
        delay: 0,
      },
      {
        enemies: [
          { archetype: 'scout', skill: 'rookie', count: 1 },
          { archetype: 'interceptor', skill: 'rookie', count: 1 },
        ],
        delay: 3,
      },
    ],
    startDistance: 1500,
  },
  hard: {
    name: 'Strike Mission (Hard)',
    playerSquad: [
      { archetype: 'interceptor', isPlayer: true },
      { archetype: 'interceptor', skill: 'regular' },
      { archetype: 'interceptor', skill: 'regular' },
    ],
    // Matches contracts.ts: 3 waves = scouts then interceptors (5 total)
    waves: [
      {
        enemies: [{ archetype: 'scout', skill: 'rookie', count: 2 }],
        delay: 0,
      },
      {
        enemies: [{ archetype: 'scout', skill: 'rookie', count: 1 }],
        delay: 3,
      },
      {
        enemies: [{ archetype: 'interceptor', skill: 'rookie', count: 2 }],
        delay: 3,
      },
    ],
    startDistance: 1500,
  },
};

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

function printPacingAnalysis(allResults) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('PACING ANALYSIS');
  console.log('='.repeat(80));

  // Group by mission
  for (const missionKey of Object.keys(MISSIONS)) {
    const missionResults = allResults.filter(
      (r) => r.missionKey === missionKey,
    );
    const idleResult = missionResults.find((r) => r.playerMode === 'idle');
    const regularResult = missionResults.find(
      (r) => r.playerMode === 'regular',
    );

    console.log(`\n${MISSIONS[missionKey].name}:`);

    // Check for issues
    const issues = [];

    if (idleResult.avgWinTime > 0 && idleResult.avgWinTime < 15) {
      issues.push(
        `⚠ Mission resolves too fast when idle (${idleResult.avgWinTime.toFixed(1)}s)`,
      );
    }

    if (idleResult.winRate > 80) {
      issues.push(
        `⚠ Wingmen carry too hard - ${idleResult.winRate.toFixed(0)}% win with idle player`,
      );
    }

    if (
      idleResult.winRate < 20 &&
      idleResult.avgWinTime > 0 &&
      idleResult.avgWinTime < 20
    ) {
      issues.push('⚠ Player gets killed too fast with no input');
    }

    if (
      regularResult &&
      regularResult.avgWinTime > 0 &&
      regularResult.avgWinTime < 20
    ) {
      issues.push(
        `⚠ Regular-skill victories too fast (${regularResult.avgWinTime.toFixed(1)}s)`,
      );
    }

    if (issues.length === 0) {
      console.log('  ✓ Pacing looks reasonable');
    } else {
      for (const issue of issues) {
        console.log(`  ${issue}`);
      }
    }

    // Print engagement summary (using avgWinTime for victories)
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
// Main
// ============================================================================

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
