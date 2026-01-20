#!/usr/bin/env npx tsx
/**
 * Quick balance test for a single elimination mission.
 * Usage: npx tsx scripts/tests/balance-single-mission.mjs "Mission Name"
 */

import { SECTOR_1_EASY } from '../../src/ui/screens/missions/sector1/easy.ts';
import { SECTOR_1_HARD } from '../../src/ui/screens/missions/sector1/hard.ts';
import { SECTOR_1_MEDIUM } from '../../src/ui/screens/missions/sector1/medium.ts';
import { runMission } from './shared/mission-simulation.mjs';

const ALL_S1_MISSIONS = [
  ...SECTOR_1_EASY,
  ...SECTOR_1_MEDIUM,
  ...SECTOR_1_HARD,
];

const DIFFICULTY_TARGETS = {
  easy: { winMin: 80, winMax: 90, survMin: 3.0, survMax: 3.5 },
  medium: { winMin: 70, winMax: 80, survMin: 2.5, survMax: 3.0 },
  hard: { winMin: 60, winMax: 70, survMin: 2.0, survMax: 2.5 },
};

const missionName = process.argv[2];
if (!missionName) {
  console.log(
    'Usage: npx tsx scripts/tests/balance-single-mission.mjs "Mission Name"',
  );
  console.log('\nAvailable S1 missions:');
  for (const m of ALL_S1_MISSIONS) {
    console.log(`  - ${m.name} (${m.difficulty})`);
  }
  process.exit(1);
}

const mission = ALL_S1_MISSIONS.find(
  (m) => m.name.toLowerCase() === missionName.toLowerCase(),
);

if (!mission) {
  console.log(`Mission "${missionName}" not found.`);
  console.log('\nAvailable S1 missions:');
  for (const m of ALL_S1_MISSIONS) {
    console.log(`  - ${m.name} (${m.difficulty})`);
  }
  process.exit(1);
}

const RUNS = 50;
const sector = 1;

console.log(`\nTesting: ${mission.name} (${mission.difficulty})`);
console.log(`Running ${RUNS} simulations...\n`);

const results = [];
for (let i = 0; i < RUNS; i++) {
  const seed = 12345 + i * 7919 + mission.id.charCodeAt(0) * 13;
  results.push(runMission(mission, seed, sector));
}

const wins = results.filter((r) => r.winner === 'player');
const winRate = (wins.length / RUNS) * 100;
const avgTime =
  wins.length > 0
    ? wins.reduce((s, r) => s + r.timeToComplete, 0) / wins.length
    : 0;
const avgSurv =
  wins.length > 0
    ? wins.reduce((s, r) => s + r.playerTeamRemaining, 0) / wins.length
    : 0;
const timeouts = results.filter((r) => r.timeout).length;

const targets = DIFFICULTY_TARGETS[mission.difficulty];

console.log(`Results:`);
console.log(`  Win Rate: ${winRate.toFixed(1)}% (${wins.length}/${RUNS})`);
console.log(`  Avg Time: ${avgTime.toFixed(1)}s`);
console.log(`  Avg Survivors: ${avgSurv.toFixed(2)}/4`);
console.log(`  Timeouts: ${timeouts}`);
console.log();
console.log(`Targets for ${mission.difficulty}:`);
console.log(`  Win Rate: ${targets.winMin}-${targets.winMax}%`);
console.log(`  Survivors: ${targets.survMin}-${targets.survMax}`);
console.log();

const winOk = winRate >= targets.winMin && winRate <= targets.winMax;
const survOk = avgSurv >= targets.survMin && avgSurv <= targets.survMax;

if (winOk && survOk) {
  console.log('✓ BALANCED');
} else {
  if (winRate > targets.winMax) console.log('✗ WIN RATE: TOO EASY');
  else if (winRate < targets.winMin) console.log('✗ WIN RATE: TOO HARD');
  else console.log('✓ WIN RATE: OK');

  if (avgSurv > targets.survMax) console.log('✗ SURVIVORS: TOO MANY');
  else if (avgSurv < targets.survMin) console.log('✗ SURVIVORS: TOO FEW');
  else console.log('✓ SURVIVORS: OK');
}
