/**
 * Skill Scaling vs Brawler Test
 *
 * Tests how escape/kiting ships scale against brawlers (typical gameplay scenario).
 * Mirror matches are edge cases; most gameplay involves different ship types.
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const RUNS_PER_MATCHUP = 50;
const MAX_FIGHT_TIME = 60;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

// Test ships with their typical brawler opponent and preferred starting range
const TEST_CASES = [
  { ship: 'scout', opponent: 'interceptor', startRange: 500 },
  { ship: 'sniper', opponent: 'striker', startRange: 900 },
  { ship: 'lancer', opponent: 'defender', startRange: 1000 },
];

const PROFILES = ['rookie', 'regular', 'veteran', 'ace'];

console.log(`\n${'='.repeat(70)}`);
console.log('SKILL SCALING VS BRAWLER');
console.log(
  '(How well does each skill level perform against a regular brawler?)',
);
console.log('='.repeat(70));

// Run a single matchup
function runMatchup(
  shipType,
  shipProfile,
  opponentType,
  opponentProfile,
  runs,
  startRange = 500,
) {
  let shipWins = 0;
  let opponentWins = 0;
  let draws = 0;

  for (let run = 0; run < runs; run++) {
    const seed = run * 1000;
    const world = createWorld(seed);
    initCombatStats(world);

    const ship = createAIShip(
      world,
      shipType,
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      shipProfile,
    );

    const opponent = createAIShip(
      world,
      opponentType,
      Faction.Enemy,
      new Vector3(jitter(), jitter(), startRange + jitter()),
      new Quaternion(),
      opponentProfile,
    );

    let shipAlive = true;
    let opponentAlive = true;

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);

      shipAlive = !!getComponent(world, ship, 'health');
      opponentAlive = !!getComponent(world, opponent, 'health');

      if (!shipAlive || !opponentAlive) break;
    }

    if (!shipAlive && !opponentAlive) draws++;
    else if (!opponentAlive) shipWins++;
    else if (!shipAlive) opponentWins++;
    else draws++;
  }

  return (shipWins / runs) * 100;
}

// Test each ship type
for (const { ship, opponent, startRange } of TEST_CASES) {
  console.log(
    `\n--- ${ship.toUpperCase()} vs ${opponent} (regular) @ ${startRange}m ---`,
  );
  console.log('Profile       Win Rate   Expected');
  console.log('-'.repeat(40));

  for (const profile of PROFILES) {
    const winRate = runMatchup(
      ship,
      profile,
      opponent,
      'regular',
      RUNS_PER_MATCHUP,
      startRange,
    );

    // Expected: rookie < regular ≈ 50% < veteran < ace
    let expected;
    switch (profile) {
      case 'rookie':
        expected = '<40%';
        break;
      case 'regular':
        expected = '~50%';
        break;
      case 'veteran':
        expected = '>55%';
        break;
      case 'ace':
        expected = '>70%';
        break;
    }

    const status =
      (profile === 'rookie' && winRate < 40) ||
      (profile === 'regular' && winRate >= 40 && winRate <= 60) ||
      (profile === 'veteran' && winRate > 55) ||
      (profile === 'ace' && winRate > 70)
        ? '✓'
        : '✗';

    console.log(
      profile.padEnd(14) +
        `${winRate.toFixed(0)}%`.padStart(8) +
        expected.padStart(12) +
        `  ${status}`,
    );
  }
}

console.log('\n' + '='.repeat(70));
console.log(
  'KEY INSIGHT: In typical gameplay (vs brawlers), skill should scale correctly.',
);
console.log(
  'Mirror matches are edge cases that may have inverted skill scaling.',
);
console.log('='.repeat(70));
