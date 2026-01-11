#!/usr/bin/env node
/**
 * Test Runner - organizes tests into quick vs long-running categories.
 *
 * Uses Node.js built-in test runner (node:test) via tsx.
 *
 * Usage:
 *   npx tsx scripts/tests/run-tests.mjs          # Run quick tests (default)
 *   npx tsx scripts/tests/run-tests.mjs --all    # Run all tests
 *   npx tsx scripts/tests/run-tests.mjs --balance # Run balance/simulation tests
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Quick logic tests - fast, deterministic, run every time
const QUICK_TESTS = [
  // Integration & architecture
  'integration/test-game.mjs',
  'integration/test-architecture.mjs',

  // System logic tests
  'systems/test-bank-size.mjs',
  'systems/test-heat.mjs',
  'systems/test-ship-identity.mjs',
  'systems/test-combat-stats.mjs',
  'systems/test-weapon-stats.mjs',
  'systems/test-kill-attribution.mjs',

  // Weapon logic tests
  'weapons/test-weapons.mjs',
  'weapons/test-weapons-flak.mjs',
  'weapons/test-weapons-nuke.mjs',
  'weapons/test-weapons-friendly-fire.mjs',
  'weapons/test-weapons-integration.mjs',
  'weapons/test-missile-lock-cone.mjs',
  'weapons/test-missile-owner-collision.mjs',
  'weapons/test-link-modes.mjs',

  // AI logic tests (non-simulation)
  'ai/test-ai-lock-system.mjs',
  'ai/test-ai-missile-lock.mjs',
  'ai/test-ai-speed-compatibility.mjs',
  'ai/test-aim-error-angular.mjs',
  'ai/test-ai-weapon-selection.mjs',

  // Campaign logic tests
  'campaign/test-slot-array.mjs',
  'campaign/test-store-ammo.mjs',
  'campaign/test-resupply-needs.mjs',
  'campaign/test-resupply-ship.mjs',
  'campaign/test-resupply-estimate.mjs',
];

// Balance/simulation tests - run multiple fights, take longer
const BALANCE_TESTS = [
  // Combat balance
  'combat/test-skill-scaling.mjs',
  'combat/test-weapon-diversity.mjs',
  'combat/test-decoy-missile.mjs',
  'combat/test-engagement-patterns.mjs',
  'combat/test-ttk-matrix.mjs',
  'combat/test-skill-vs-brawler.mjs',

  // Campaign/mission
  'campaign/test-mission-pacing.mjs',
];

/**
 * Run a single test file using node:test runner via tsx.
 */
async function runTest(testPath) {
  const fullPath = join(__dirname, testPath);
  return new Promise((resolve) => {
    const start = Date.now();
    // Use tsx --test to run with node:test runner
    const proc = spawn('npx', ['tsx', '--test', fullPath], {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      resolve({ testPath, code, duration });
    });

    proc.on('error', () => {
      resolve({ testPath, code: 1, duration: 0 });
    });
  });
}

/**
 * Run a list of tests sequentially.
 */
async function runTests(tests, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running ${label} (${tests.length} tests)`);
  console.log('='.repeat(60));

  const results = [];
  const startTime = Date.now();

  for (const test of tests) {
    console.log(`\n--- ${test} ---`);
    const result = await runTest(test);
    results.push(result);

    if (result.code !== 0) {
      console.log(`FAILED (${result.duration}s)`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = results.filter((r) => r.code === 0).length;
  const failed = results.filter((r) => r.code !== 0).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label}: ${passed} passed, ${failed} failed (${totalTime}s)`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter((r) => r.code !== 0)) {
      console.log(`  - ${r.testPath}`);
    }
  }

  return failed === 0;
}

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all');
  const runBalance = args.includes('--balance');

  let success = true;

  if (runBalance) {
    // Only balance tests
    success = await runTests(BALANCE_TESTS, 'BALANCE TESTS');
  } else if (runAll) {
    // Quick first, then balance
    success = await runTests(QUICK_TESTS, 'QUICK TESTS');
    if (success) {
      success = await runTests(BALANCE_TESTS, 'BALANCE TESTS');
    }
  } else {
    // Default: quick tests only
    success = await runTests(QUICK_TESTS, 'QUICK TESTS');
  }

  console.log('');
  process.exit(success ? 0 : 1);
}

main();
