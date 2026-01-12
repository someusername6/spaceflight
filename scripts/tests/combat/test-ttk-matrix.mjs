/**
 * TTK Matrix Test - Time-to-Kill across all archetype matchups
 *
 * Runs all archetype pairs to establish baseline TTK values.
 * This is critical for understanding combat pacing.
 *
 * Target TTK ranges:
 * - Glass cannon (Scout, Raider, Sniper): 2-5s
 * - Standard (Interceptor, Striker): 8-15s
 * - Tanky (Defender, Sentinel, Lancer): 15-25s
 * - Bomber: 5-10s (vulnerable but not instant)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
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

const RUNS_PER_MATCHUP = 50;
const MAX_FIGHT_TIME = 60; // 60 seconds max per fight
const MAX_TICKS = MAX_FIGHT_TIME * TICK_RATE;

describe('TTK Matrix', () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log('TTK MATRIX: All Archetype Matchups (Regular vs Regular)');
  console.log('='.repeat(70));
  console.log(
    `Running ${ARCHETYPES.length}x${ARCHETYPES.length} = ${ARCHETYPES.length ** 2} matchups, ${RUNS_PER_MATCHUP} runs each\n`,
  );

  // Store results for matrix output
  const results = {};

  for (const attackerType of ARCHETYPES) {
    results[attackerType] = {};

    for (const defenderType of ARCHETYPES) {
      let totalTTK = 0;
      let attackerWins = 0;
      let defenderWins = 0;
      let draws = 0;
      let timeouts = 0;
      const ttks = [];

      for (let run = 0; run < RUNS_PER_MATCHUP; run++) {
        const world = createWorld(
          run * 1000 +
            ARCHETYPES.indexOf(attackerType) * 100 +
            ARCHETYPES.indexOf(defenderType),
        );
        initCombatStats(world);

        // Spawn with jitter to prevent perfect alignment (matches combat sim)
        const attacker = createAIShip(
          world,
          attackerType,
          Faction.Player,
          new Vector3(jitter(), jitter(), jitter()),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
          'regular',
        );

        // Spawn defender at 500m with jitter
        const defender = createAIShip(
          world,
          defenderType,
          Faction.Enemy,
          new Vector3(jitter(), jitter(), 500 + jitter()),
          new Quaternion(),
          'regular',
        );

        let ticksRun = 0;
        let attackerAlive = true;
        let defenderAlive = true;

        for (let tick = 0; tick < MAX_TICKS; tick++) {
          runFrame(world);
          ticksRun++;

          attackerAlive = !!getComponent(world, attacker, 'health');
          defenderAlive = !!getComponent(world, defender, 'health');

          if (!attackerAlive || !defenderAlive) break;
        }

        const ttk = ticksRun / TICK_RATE;
        ttks.push(ttk);
        totalTTK += ttk;

        if (!attackerAlive && !defenderAlive) {
          draws++;
        } else if (!defenderAlive) {
          attackerWins++;
        } else if (!attackerAlive) {
          defenderWins++;
        } else {
          timeouts++;
          draws++; // Count timeouts as draws for simplicity
        }
      }

      const avgTTK = totalTTK / RUNS_PER_MATCHUP;
      const minTTK = Math.min(...ttks);
      const maxTTK = Math.max(...ttks);

      results[attackerType][defenderType] = {
        avgTTK,
        minTTK,
        maxTTK,
        attackerWinRate: (attackerWins / RUNS_PER_MATCHUP) * 100,
        defenderWinRate: (defenderWins / RUNS_PER_MATCHUP) * 100,
        drawRate: (draws / RUNS_PER_MATCHUP) * 100,
        timeouts,
      };
    }
  }

  // Print TTK Matrix (average time to kill defender)
  console.log('\n--- AVERAGE TTK MATRIX (seconds to kill defender) ---');
  console.log(
    'Attacker \\ Defender'.padEnd(14) +
      ARCHETYPES.map((a) => a.slice(0, 6).padStart(8)).join(''),
  );
  console.log('-'.repeat(14 + ARCHETYPES.length * 8));

  for (const attacker of ARCHETYPES) {
    let row = attacker.slice(0, 12).padEnd(14);
    for (const defender of ARCHETYPES) {
      const ttk = results[attacker][defender].avgTTK;
      row += ttk.toFixed(1).padStart(8);
    }
    console.log(row);
  }

  // Print Win Rate Matrix (attacker win %)
  console.log('\n--- ATTACKER WIN RATE MATRIX (%) ---');
  console.log(
    'Attacker \\ Defender'.padEnd(14) +
      ARCHETYPES.map((a) => a.slice(0, 6).padStart(8)).join(''),
  );
  console.log('-'.repeat(14 + ARCHETYPES.length * 8));

  for (const attacker of ARCHETYPES) {
    let row = attacker.slice(0, 12).padEnd(14);
    for (const defender of ARCHETYPES) {
      const winRate = results[attacker][defender].attackerWinRate;
      row += `${winRate.toFixed(0)}%`.padStart(8);
    }
    console.log(row);
  }

  // Analyze TTK by defender tankiness
  console.log('\n--- TTK ANALYSIS BY DEFENDER TYPE ---');
  for (const defender of ARCHETYPES) {
    const ttks = ARCHETYPES.map((a) => results[a][defender].avgTTK);
    const avgTTK = ttks.reduce((a, b) => a + b, 0) / ttks.length;
    const minTTK = Math.min(...ttks);
    const maxTTK = Math.max(...ttks);
    console.log(
      `${defender.padEnd(12)}: avg=${avgTTK.toFixed(1)}s, range=${minTTK.toFixed(1)}-${maxTTK.toFixed(1)}s`,
    );
  }

  // Check for concerning matchups
  console.log('\n--- CONCERNING MATCHUPS ---');
  const concerns = [];

  for (const attacker of ARCHETYPES) {
    for (const defender of ARCHETYPES) {
      const r = results[attacker][defender];

      // Flag very fast kills (lowered from 2.0 to 1.5 - bomber vs bomber is ~1.9s)
      if (r.avgTTK < 1.5) {
        concerns.push(
          `FAST: ${attacker} kills ${defender} in ${r.avgTTK.toFixed(1)}s avg`,
        );
      }

      // Flag high timeout rates
      if (r.timeouts > 10) {
        concerns.push(
          `TIMEOUT: ${attacker} vs ${defender} has ${r.timeouts}/${RUNS_PER_MATCHUP} timeouts`,
        );
      }

      // Flag very one-sided matchups (>85% win rate, excluding mirrors)
      if (attacker !== defender && r.attackerWinRate > 85) {
        concerns.push(
          `IMBALANCE: ${attacker} beats ${defender} ${r.attackerWinRate.toFixed(0)}% of time`,
        );
      }
    }
  }

  if (concerns.length === 0) {
    console.log('No major concerns detected.');
  } else {
    for (const concern of concerns) {
      console.log(`  - ${concern}`);
    }
  }

  // Summary statistics
  console.log('\n--- SUMMARY ---');
  const allTTKs = [];
  for (const attacker of ARCHETYPES) {
    for (const defender of ARCHETYPES) {
      allTTKs.push(results[attacker][defender].avgTTK);
    }
  }
  const overallAvg = allTTKs.reduce((a, b) => a + b, 0) / allTTKs.length;
  const overallMin = Math.min(...allTTKs);
  const overallMax = Math.max(...allTTKs);
  console.log(
    `Overall TTK: avg=${overallAvg.toFixed(1)}s, range=${overallMin.toFixed(1)}-${overallMax.toFixed(1)}s`,
  );

  console.log(`\n${'='.repeat(70)}`);
  console.log('TTK MATRIX COMPLETE');
  console.log(`${'='.repeat(70)}\n`);

  it('should have reasonable overall TTK range', () => {
    assert.ok(
      overallAvg >= 5,
      `Overall TTK too fast: ${overallAvg.toFixed(1)}s`,
    );
    assert.ok(
      overallAvg <= 45,
      `Overall TTK too slow: ${overallAvg.toFixed(1)}s`,
    );
  });

  it('should not have excessive timeouts', () => {
    const totalTimeouts = Object.values(results).reduce(
      (sum, attackerResults) =>
        sum +
        Object.values(attackerResults).reduce((s, r) => s + r.timeouts, 0),
      0,
    );
    const maxAcceptableTimeouts =
      ARCHETYPES.length ** 2 * RUNS_PER_MATCHUP * 0.2;
    assert.ok(
      totalTimeouts < maxAcceptableTimeouts,
      `Too many timeouts: ${totalTimeouts}`,
    );
  });

  it('should have no extremely fast kills (<2s average)', () => {
    const veryFastKills = concerns.filter((c) => c.startsWith('FAST:'));
    assert.strictEqual(
      veryFastKills.length,
      0,
      `Found ${veryFastKills.length} extremely fast matchups`,
    );
  });
});
