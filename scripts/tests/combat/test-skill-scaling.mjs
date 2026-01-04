/**
 * Skill Scaling Verification Test
 *
 * Verifies that AI skill progression works correctly across ALL archetypes.
 * Higher skill should consistently beat lower skill.
 *
 * Tests:
 * 1. Same-archetype skill ladder (rookie < regular < veteran < ace)
 * 2. Skill gap impact (how much does one tier matter?)
 * 3. Consistency across archetypes (skill should matter equally for all ships)
 */

import { Quaternion, Vector3 } from 'three';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  ARCHETYPES,
  initCombatStats,
  jitter,
  runFrame,
  TICK_RATE,
} from '../shared/combat-utils.mjs';

const _PROFILES = ['rookie', 'regular', 'veteran', 'ace'];
const RUNS_PER_MATCHUP = 50;
const MAX_FIGHT_TIME = 60;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

console.log(`\n${'='.repeat(70)}`);
console.log('SKILL SCALING VERIFICATION');
console.log('='.repeat(70));

// Run a single matchup
function runMatchup(archetype, profileA, profileB, runs) {
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  let totalTime = 0;

  for (let run = 0; run < runs; run++) {
    const seed = run * 1000 + ARCHETYPES.indexOf(archetype) * 100;
    const world = createWorld(seed);
    initCombatStats(world);

    // Spawn with jitter to prevent perfect alignment
    const shipA = createAIShip(
      world,
      archetype,
      Faction.Player,
      new Vector3(jitter(), jitter(), jitter()),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      profileA,
    );

    const shipB = createAIShip(
      world,
      archetype,
      Faction.Enemy,
      new Vector3(jitter(), jitter(), 500 + jitter()),
      new Quaternion(),
      profileB,
    );

    let ticksRun = 0;
    let aAlive = true;
    let bAlive = true;

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      runFrame(world);
      ticksRun++;

      aAlive = !!getComponent(world, shipA, 'health');
      bAlive = !!getComponent(world, shipB, 'health');

      if (!aAlive || !bAlive) break;
    }

    totalTime += ticksRun / TICK_RATE;

    if (!aAlive && !bAlive) draws++;
    else if (!bAlive) aWins++;
    else if (!aAlive) bWins++;
    else draws++; // timeout
  }

  return {
    aWinRate: (aWins / runs) * 100,
    bWinRate: (bWins / runs) * 100,
    drawRate: (draws / runs) * 100,
    avgTime: totalTime / runs,
  };
}

// Test 1: Skill ladder per archetype
console.log('\n--- TEST 1: SKILL LADDER BY ARCHETYPE ---');
console.log('Each row shows higher skill win rate against lower skill');
console.log(
  'Archetype'.padEnd(14) +
    'R>Rk'.padStart(8) +
    'V>R'.padStart(8) +
    'A>V'.padStart(8) +
    'A>Rk'.padStart(8),
);
console.log('-'.repeat(14 + 32));

const ladderResults = {};

for (const archetype of ARCHETYPES) {
  ladderResults[archetype] = {};

  // Rookie vs Regular (Regular should win)
  const rrResult = runMatchup(archetype, 'rookie', 'regular', RUNS_PER_MATCHUP);
  ladderResults[archetype]['rookie-regular'] = rrResult.bWinRate;

  // Regular vs Veteran (Veteran should win)
  const rvResult = runMatchup(
    archetype,
    'regular',
    'veteran',
    RUNS_PER_MATCHUP,
  );
  ladderResults[archetype]['regular-veteran'] = rvResult.bWinRate;

  // Veteran vs Ace (Ace should win)
  const vaResult = runMatchup(archetype, 'veteran', 'ace', RUNS_PER_MATCHUP);
  ladderResults[archetype]['veteran-ace'] = vaResult.bWinRate;

  // Rookie vs Ace (Ace should dominate)
  const raResult = runMatchup(archetype, 'rookie', 'ace', RUNS_PER_MATCHUP);
  ladderResults[archetype]['rookie-ace'] = raResult.bWinRate;

  console.log(
    archetype.slice(0, 12).padEnd(14) +
      `${rrResult.bWinRate.toFixed(0)}%`.padStart(8) +
      `${rvResult.bWinRate.toFixed(0)}%`.padStart(8) +
      `${vaResult.bWinRate.toFixed(0)}%`.padStart(8) +
      `${raResult.bWinRate.toFixed(0)}%`.padStart(8),
  );
}

// Test 2: Consistency check - skill should matter similarly across archetypes
console.log('\n--- TEST 2: SKILL CONSISTENCY ANALYSIS ---');

const regularBeatRookie = ARCHETYPES.map(
  (a) => ladderResults[a]['rookie-regular'],
);
const avgRegularWin =
  regularBeatRookie.reduce((a, b) => a + b, 0) / ARCHETYPES.length;
const minRegularWin = Math.min(...regularBeatRookie);
const maxRegularWin = Math.max(...regularBeatRookie);

console.log(
  `Regular > Rookie: avg=${avgRegularWin.toFixed(0)}%, range=${minRegularWin.toFixed(0)}-${maxRegularWin.toFixed(0)}%`,
);

const veteranBeatRegular = ARCHETYPES.map(
  (a) => ladderResults[a]['regular-veteran'],
);
const avgVeteranWin =
  veteranBeatRegular.reduce((a, b) => a + b, 0) / ARCHETYPES.length;
const minVeteranWin = Math.min(...veteranBeatRegular);
const maxVeteranWin = Math.max(...veteranBeatRegular);

console.log(
  `Veteran > Regular: avg=${avgVeteranWin.toFixed(0)}%, range=${minVeteranWin.toFixed(0)}-${maxVeteranWin.toFixed(0)}%`,
);

const aceBeatVeteran = ARCHETYPES.map((a) => ladderResults[a]['veteran-ace']);
const avgAceWin = aceBeatVeteran.reduce((a, b) => a + b, 0) / ARCHETYPES.length;
const minAceWin = Math.min(...aceBeatVeteran);
const maxAceWin = Math.max(...aceBeatVeteran);

console.log(
  `Ace > Veteran: avg=${avgAceWin.toFixed(0)}%, range=${minAceWin.toFixed(0)}-${maxAceWin.toFixed(0)}%`,
);

const aceBeatRookie = ARCHETYPES.map((a) => ladderResults[a]['rookie-ace']);
const avgAceRookie =
  aceBeatRookie.reduce((a, b) => a + b, 0) / ARCHETYPES.length;

console.log(`Ace > Rookie: avg=${avgAceRookie.toFixed(0)}% (should be >80%)`);

// Test 3: Identify anomalies
console.log('\n--- TEST 3: SKILL ANOMALIES ---');
const anomalies = [];

for (const archetype of ARCHETYPES) {
  const r = ladderResults[archetype];

  // Higher skill should win >55% of the time at least
  if (r['rookie-regular'] < 55) {
    anomalies.push(
      `${archetype}: Regular only beats Rookie ${r['rookie-regular'].toFixed(0)}%`,
    );
  }
  if (r['regular-veteran'] < 55) {
    anomalies.push(
      `${archetype}: Veteran only beats Regular ${r['regular-veteran'].toFixed(0)}%`,
    );
  }
  if (r['veteran-ace'] < 55) {
    anomalies.push(
      `${archetype}: Ace only beats Veteran ${r['veteran-ace'].toFixed(0)}%`,
    );
  }

  // Ace should crush Rookie (>75%)
  if (r['rookie-ace'] < 75) {
    anomalies.push(
      `${archetype}: Ace only beats Rookie ${r['rookie-ace'].toFixed(0)}%`,
    );
  }
}

if (anomalies.length === 0) {
  console.log('No skill scaling anomalies detected - progression is healthy!');
} else {
  console.log('Anomalies found:');
  for (const a of anomalies) {
    console.log(`  - ${a}`);
  }
}

// Test 4: Skill tier value
console.log('\n--- TEST 4: SKILL TIER VALUE ---');
console.log('How much does each skill tier matter?');

const tier1Gap = avgRegularWin - 50; // How much better is Regular than Rookie
const tier2Gap = avgVeteranWin - 50; // How much better is Veteran than Regular
const tier3Gap = avgAceWin - 50; // How much better is Ace than Veteran

console.log(`Rookie -> Regular: +${tier1Gap.toFixed(0)}% advantage`);
console.log(`Regular -> Veteran: +${tier2Gap.toFixed(0)}% advantage`);
console.log(`Veteran -> Ace: +${tier3Gap.toFixed(0)}% advantage`);

// Check if tiers are meaningful
if (tier1Gap < 10 || tier2Gap < 10 || tier3Gap < 5) {
  console.log('\nWARNING: Some skill tiers provide minimal advantage');
}

console.log(`\n${'='.repeat(70)}`);
console.log('SKILL SCALING VERIFICATION COMPLETE');
console.log(`${'='.repeat(70)}\n`);
