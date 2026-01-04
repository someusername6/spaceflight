/**
 * Engagement Pattern Analysis Test
 *
 * Analyzes combat flow to ensure fights have proper phases:
 * - Approach: Closing to engagement range
 * - Engagement: Active combat
 * - Break-off: Disengaging when damaged
 * - Recovery: Shield recharge during disengage
 * - Re-engagement: Returning to fight
 *
 * Key metrics:
 * - Time spent in each AI state
 * - Break-off frequency
 * - Shield recovery during disengagement
 * - Whether fights have "rounds" or are continuous
 */

import { Quaternion, Vector3 } from 'three';
import { AIState } from '../../../src/components/ai.ts';
import { createWorld, getComponent } from '../../../src/core/ecs.ts';
import { Faction } from '../../../src/core/types.ts';
import { createAIShip } from '../../../src/factories/ship.ts';
import {
  initCombatStats,
  runFrame,
  TICK_RATE,
  TICK_SEC,
} from '../shared/combat-utils.mjs';

const ARCHETYPES = [
  'scout',
  'interceptor',
  'striker',
  'defender',
  'bomber',
  'raider',
  'sentinel',
];
const RUNS_PER_ARCHETYPE = 20;
const MAX_FIGHT_TIME = 60;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

console.log('\n' + '='.repeat(70));
console.log('ENGAGEMENT PATTERN ANALYSIS');
console.log('='.repeat(70));

// Jitter function like combat sim (prevents perfect alignment)
const jitter = () => (Math.random() - 0.5) * 20;

// Track a single fight's engagement patterns
function analyzeFight(archetype, seed) {
  const world = createWorld(seed);
  initCombatStats(world);

  // Spawn with jitter to prevent perfect alignment
  const shipA = createAIShip(
    world,
    archetype,
    Faction.Player,
    new Vector3(jitter(), jitter(), jitter()),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    'regular',
  );

  const shipB = createAIShip(
    world,
    archetype,
    Faction.Enemy,
    new Vector3(jitter(), jitter(), 500 + jitter()),
    new Quaternion(),
    'regular',
  );

  // Tracking data
  const stateTimeA = {
    idle: 0,
    pursue: 0,
    engage: 0,
    evade: 0,
    protect: 0,
    regroup: 0,
  };
  const stateTimeB = {
    idle: 0,
    pursue: 0,
    engage: 0,
    evade: 0,
    protect: 0,
    regroup: 0,
  };

  let breakOffsA = 0;
  let breakOffsB = 0;
  let lastStateA = null;
  let lastStateB = null;

  // Shield tracking for recovery analysis
  const shieldSamples = [];
  let maxShieldsA = 0;
  let maxShieldsB = 0;
  let regroupStartShieldsA = 0;
  let regroupEndShieldsA = 0;
  let regroupStartShieldsB = 0;
  let regroupEndShieldsB = 0;
  let inRegroupA = false;
  let inRegroupB = false;

  let ticksRun = 0;
  let aAlive = true;
  let bAlive = true;

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    runFrame(world);
    ticksRun++;

    const aiA = getComponent(world, shipA, 'aiControlled');
    const aiB = getComponent(world, shipB, 'aiControlled');
    const shieldsA = getComponent(world, shipA, 'shields');
    const shieldsB = getComponent(world, shipB, 'shields');

    if (!aiA || !aiB) {
      aAlive = !!aiA;
      bAlive = !!aiB;
      break;
    }

    // Track initial max shields
    if (tick === 0) {
      maxShieldsA = shieldsA?.max || 0;
      maxShieldsB = shieldsB?.max || 0;
    }

    // Track state time
    const stateNameA = getStateName(aiA.state);
    const stateNameB = getStateName(aiB.state);

    if (stateNameA) stateTimeA[stateNameA] += TICK_SEC;
    if (stateNameB) stateTimeB[stateNameB] += TICK_SEC;

    // Track break-offs (transition to evade or regroup from combat states)
    if (lastStateA !== null) {
      if (
        (stateNameA === 'evade' || stateNameA === 'regroup') &&
        (lastStateA === 'engage' || lastStateA === 'pursue')
      ) {
        breakOffsA++;
      }
    }
    if (lastStateB !== null) {
      if (
        (stateNameB === 'evade' || stateNameB === 'regroup') &&
        (lastStateB === 'engage' || lastStateB === 'pursue')
      ) {
        breakOffsB++;
      }
    }

    // Track shield recovery during regroup
    if (stateNameA === 'regroup' && !inRegroupA) {
      inRegroupA = true;
      regroupStartShieldsA = shieldsA?.current || 0;
    } else if (stateNameA !== 'regroup' && inRegroupA) {
      inRegroupA = false;
      regroupEndShieldsA = shieldsA?.current || 0;
    }

    if (stateNameB === 'regroup' && !inRegroupB) {
      inRegroupB = true;
      regroupStartShieldsB = shieldsB?.current || 0;
    } else if (stateNameB !== 'regroup' && inRegroupB) {
      inRegroupB = false;
      regroupEndShieldsB = shieldsB?.current || 0;
    }

    lastStateA = stateNameA;
    lastStateB = stateNameB;

    // Sample shields periodically
    if (tick % 30 === 0) {
      // Every 0.5s
      shieldSamples.push({
        time: tick / TICK_RATE,
        a: shieldsA?.current || 0,
        b: shieldsB?.current || 0,
      });
    }
  }

  const fightDuration = ticksRun / TICK_RATE;

  // Calculate shield recovery
  const shieldRecoveryA =
    maxShieldsA > 0
      ? ((regroupEndShieldsA - regroupStartShieldsA) / maxShieldsA) * 100
      : 0;
  const shieldRecoveryB =
    maxShieldsB > 0
      ? ((regroupEndShieldsB - regroupStartShieldsB) / maxShieldsB) * 100
      : 0;

  return {
    archetype,
    duration: fightDuration,
    stateTimeA,
    stateTimeB,
    breakOffsA,
    breakOffsB,
    shieldRecoveryA,
    shieldRecoveryB,
    maxShieldsA,
    maxShieldsB,
    aAlive,
    bAlive,
  };
}

function getStateName(state) {
  switch (state) {
    case AIState.Idle:
      return 'idle';
    case AIState.Pursue:
      return 'pursue';
    case AIState.Engage:
      return 'engage';
    case AIState.Evade:
      return 'evade';
    case AIState.Protect:
      return 'protect';
    case AIState.Regroup:
      return 'regroup';
    default:
      return null;
  }
}

// Run analysis for each archetype
console.log('\n--- STATE TIME DISTRIBUTION (% of fight) ---');
console.log(
  'Archetype'.padEnd(14) +
    'Pursue'.padStart(8) +
    'Engage'.padStart(8) +
    'Evade'.padStart(8) +
    'Regroup'.padStart(8) +
    'Idle'.padStart(8),
);
console.log('-'.repeat(14 + 40));

const archetypeResults = {};

for (const archetype of ARCHETYPES) {
  const results = [];
  for (let run = 0; run < RUNS_PER_ARCHETYPE; run++) {
    results.push(
      analyzeFight(archetype, run * 1000 + ARCHETYPES.indexOf(archetype) * 100),
    );
  }

  // Average state times
  const avgStateTime = { pursue: 0, engage: 0, evade: 0, regroup: 0, idle: 0 };
  let totalDuration = 0;
  let totalBreakOffs = 0;
  let totalShieldRecovery = 0;
  let shieldRecoveryCount = 0;

  for (const r of results) {
    totalDuration += r.duration;
    totalBreakOffs += r.breakOffsA + r.breakOffsB;

    for (const state of Object.keys(avgStateTime)) {
      avgStateTime[state] += (r.stateTimeA[state] + r.stateTimeB[state]) / 2;
    }

    if (r.shieldRecoveryA > 0) {
      totalShieldRecovery += r.shieldRecoveryA;
      shieldRecoveryCount++;
    }
    if (r.shieldRecoveryB > 0) {
      totalShieldRecovery += r.shieldRecoveryB;
      shieldRecoveryCount++;
    }
  }

  const avgDuration = totalDuration / RUNS_PER_ARCHETYPE;
  const avgBreakOffs = totalBreakOffs / RUNS_PER_ARCHETYPE;
  const avgShieldRecovery =
    shieldRecoveryCount > 0 ? totalShieldRecovery / shieldRecoveryCount : 0;

  // Normalize state times to percentages
  for (const state of Object.keys(avgStateTime)) {
    avgStateTime[state] =
      (avgStateTime[state] / RUNS_PER_ARCHETYPE / avgDuration) * 100;
  }

  archetypeResults[archetype] = {
    avgDuration,
    avgBreakOffs,
    avgShieldRecovery,
    avgStateTime,
  };

  console.log(
    archetype.slice(0, 12).padEnd(14) +
      (avgStateTime.pursue.toFixed(0) + '%').padStart(8) +
      (avgStateTime.engage.toFixed(0) + '%').padStart(8) +
      (avgStateTime.evade.toFixed(0) + '%').padStart(8) +
      (avgStateTime.regroup.toFixed(0) + '%').padStart(8) +
      (avgStateTime.idle.toFixed(0) + '%').padStart(8),
  );
}

// Break-off analysis
console.log('\n--- BREAK-OFF FREQUENCY ---');
console.log(
  'Archetype'.padEnd(14) +
    'Avg Duration'.padStart(14) +
    'Break-offs'.padStart(12) +
    'Per 10s'.padStart(10),
);
console.log('-'.repeat(14 + 36));

for (const archetype of ARCHETYPES) {
  const r = archetypeResults[archetype];
  const breakOffsPer10s = (r.avgBreakOffs / r.avgDuration) * 10;
  console.log(
    archetype.slice(0, 12).padEnd(14) +
      (r.avgDuration.toFixed(1) + 's').padStart(14) +
      r.avgBreakOffs.toFixed(1).padStart(12) +
      breakOffsPer10s.toFixed(1).padStart(10),
  );
}

// Shield recovery analysis
console.log('\n--- SHIELD RECOVERY DURING REGROUP ---');
for (const archetype of ARCHETYPES) {
  const r = archetypeResults[archetype];
  console.log(
    `${archetype.padEnd(14)}: ${r.avgShieldRecovery.toFixed(0)}% shields recovered per regroup`,
  );
}

// Combat flow assessment
console.log('\n--- COMBAT FLOW ASSESSMENT ---');

const issues = [];
let healthyFlows = 0;

for (const archetype of ARCHETYPES) {
  const r = archetypeResults[archetype];
  const state = r.avgStateTime;

  // Check for healthy combat flow
  const hasEngagement = state.engage > 30; // At least 30% in engage
  const hasDisengagement = state.evade + state.regroup > 10; // At least 10% disengaging
  const notConstantCombat = state.pursue + state.engage < 85; // Not 100% fighting
  const meaningfulRecovery = r.avgShieldRecovery > 15; // At least 15% shield recovery

  if (hasEngagement && hasDisengagement && notConstantCombat) {
    healthyFlows++;
  } else {
    if (!hasEngagement)
      issues.push(
        `${archetype}: Too little engagement (${state.engage.toFixed(0)}%)`,
      );
    if (!hasDisengagement)
      issues.push(
        `${archetype}: Too little disengagement (${(state.evade + state.regroup).toFixed(0)}%)`,
      );
    if (!notConstantCombat)
      issues.push(
        `${archetype}: Combat too constant (${(state.pursue + state.engage).toFixed(0)}% in combat)`,
      );
  }

  if (!meaningfulRecovery && state.regroup > 5) {
    issues.push(
      `${archetype}: Regroup not recovering shields (${r.avgShieldRecovery.toFixed(0)}%)`,
    );
  }
}

console.log(
  `Healthy combat flow: ${healthyFlows}/${ARCHETYPES.length} archetypes`,
);

if (issues.length > 0) {
  console.log('\nIssues:');
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
} else {
  console.log('All archetypes show healthy engagement patterns!');
}

console.log('\n' + '='.repeat(70));
console.log('ENGAGEMENT PATTERN ANALYSIS COMPLETE');
console.log('='.repeat(70) + '\n');
