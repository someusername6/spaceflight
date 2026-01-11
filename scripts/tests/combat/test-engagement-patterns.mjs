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

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ARCHETYPES, TICK_RATE } from '../shared/combat-utils.mjs';
import { analyzeFight } from './fight-analysis-helpers.mjs';

const RUNS_PER_ARCHETYPE = 20;
const MAX_FIGHT_TIME = 60;
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

describe('Engagement Pattern Analysis', () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log('ENGAGEMENT PATTERN ANALYSIS');
  console.log('='.repeat(70));

  // Run analysis for each archetype
  console.log('\n--- STATE TIME DISTRIBUTION (% of fight) ---');
  console.log(
    'Archetype'.padEnd(14) +
      'Pursue'.padStart(8) +
      'Engage'.padStart(8) +
      'Evade'.padStart(8) +
      'Regroup'.padStart(8) +
      'Repos'.padStart(8) +
      'Idle'.padStart(8),
  );
  console.log('-'.repeat(14 + 48));

  const archetypeResults = {};

  for (const archetype of ARCHETYPES) {
    const results = [];
    for (let run = 0; run < RUNS_PER_ARCHETYPE; run++) {
      results.push(
        analyzeFight(
          archetype,
          run * 1000 + ARCHETYPES.indexOf(archetype) * 100,
          MAX_TICKS,
        ),
      );
    }

    // Average state times
    const avgStateTime = {
      pursue: 0,
      engage: 0,
      evade: 0,
      regroup: 0,
      reposition: 0,
      idle: 0,
    };
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
        `${avgStateTime.pursue.toFixed(0)}%`.padStart(8) +
        `${avgStateTime.engage.toFixed(0)}%`.padStart(8) +
        `${avgStateTime.evade.toFixed(0)}%`.padStart(8) +
        `${avgStateTime.regroup.toFixed(0)}%`.padStart(8) +
        `${avgStateTime.reposition.toFixed(0)}%`.padStart(8) +
        `${avgStateTime.idle.toFixed(0)}%`.padStart(8),
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
        `${r.avgDuration.toFixed(1)}s`.padStart(14) +
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

  console.log(`\n${'='.repeat(70)}`);
  console.log('ENGAGEMENT PATTERN ANALYSIS COMPLETE');
  console.log(`${'='.repeat(70)}\n`);

  it('should have majority of archetypes with healthy combat flow', () => {
    const minHealthy = Math.floor(ARCHETYPES.length * 0.5);
    assert.ok(
      healthyFlows >= minHealthy,
      `Only ${healthyFlows}/${ARCHETYPES.length} archetypes have healthy combat flow (need at least ${minHealthy})`,
    );
  });

  it('should have archetypes spend significant time in engage state', () => {
    for (const archetype of ARCHETYPES) {
      const engageTime = archetypeResults[archetype].avgStateTime.engage;
      assert.ok(
        engageTime >= 20,
        `${archetype} spends too little time engaging: ${engageTime.toFixed(0)}%`,
      );
    }
  });
});
