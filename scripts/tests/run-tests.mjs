#!/usr/bin/env node
/**
 * Test Runner - organizes tests into quick vs long-running categories.
 *
 * Uses Node.js built-in test runner (node:test) via tsx.
 *
 * Usage:
 *   npx tsx scripts/tests/run-tests.mjs              # Run quick tests (default)
 *   npx tsx scripts/tests/run-tests.mjs --all        # Run all tests (balance in advisory mode)
 *   npx tsx scripts/tests/run-tests.mjs --balance    # Run balance tests only (advisory mode)
 *   npx tsx scripts/tests/run-tests.mjs --balance --strict  # Balance tests with strict failures
 *
 * Advisory mode: Balance tests run and report results, but don't fail the build.
 * Use --strict with --balance to enforce balance test failures.
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
  'campaign/test-save-load.mjs',
  'campaign/test-campaign-settings.mjs',
  'campaign/test-campaign-storage.mjs',
  'campaign/test-store-ammo.mjs',
  'campaign/test-store-caps.mjs',
  'campaign/test-resupply-needs.mjs',
  'campaign/test-resupply-ship.mjs',
  'campaign/test-resupply-estimate.mjs',
  'campaign/test-ejection.mjs',
  'campaign/test-pilot-xp.mjs',

  // Replay system tests
  'replay/test-compression.mjs',
  'replay/test-gzip.mjs',
  'replay/test-playback.mjs',
  'replay/test-storage.mjs',
  'replay/test-storage-compression.mjs',
  'systems/test-input-replay.mjs',

  // Serialization tests (multiplayer rollback support)
  'serialization/test-world-serialization.mjs',
  'serialization/test-world-hash.mjs',

  // UI framework and component tests
  'rendering/test-hud-dom-utils.mjs',
  'ui/framework/test-screen-framework.mjs',
  'ui/framework/test-screen-state.mjs',
  'ui/common/test-nav-bar.mjs',
  'ui/screens/test-ship-picker.mjs',

  // Multiplayer unit tests
  'multiplayer/unit/test-encoding-lobby.mjs',
  'multiplayer/unit/test-encoding-session.mjs',
  'multiplayer/unit/test-lobby-messages.mjs',
  'multiplayer/unit/test-lobby-messages-encoding.mjs',
  'multiplayer/unit/test-lobby-messages-handlers.mjs',
  'multiplayer/unit/test-lobby-state.mjs',
  'multiplayer/unit/test-permissions.mjs',
  'multiplayer/unit/test-callsign-storage.mjs',
  'multiplayer/unit/test-ship-assignment.mjs',
  'multiplayer/unit/test-ship-assignment-queries.mjs',
  'multiplayer/unit/test-protocol-router.mjs',
  'multiplayer/unit/test-protocol-manager.mjs',
  'multiplayer/unit/test-protocol-sync.mjs',
  'multiplayer/unit/test-protocol-validation.mjs',
  'multiplayer/unit/test-input-format.mjs',
  'multiplayer/unit/test-game-adapter.mjs',
  'multiplayer/unit/test-session-sync.mjs',
  'multiplayer/unit/test-replay-loadouts.mjs',
  'multiplayer/unit/test-replay-wingmen.mjs',
  'multiplayer/unit/test-replay-stats.mjs',
  'multiplayer/unit/test-replay-playback.mjs',
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

  // Campaign/mission balance
  'campaign/test-mission-pacing.mjs',
  'campaign/test-sector-balance.mjs',
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
 *
 * @param tests - List of test file paths
 * @param label - Label for this test category
 * @param advisory - If true, report results but don't fail (for balance tests)
 */
async function runTests(tests, label, advisory = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Running ${label} (${tests.length} tests)${advisory ? ' [ADVISORY]' : ''}`,
  );
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
  if (advisory && failed > 0) {
    console.log(
      `${label}: ${passed} passed, ${failed} failed (${totalTime}s) [ADVISORY - not blocking]`,
    );
  } else {
    console.log(`${label}: ${passed} passed, ${failed} failed (${totalTime}s)`);
  }
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter((r) => r.code !== 0)) {
      console.log(`  - ${r.testPath}`);
    }
  }

  // In advisory mode, always return true (don't block)
  return advisory ? true : failed === 0;
}

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all');
  const runBalance = args.includes('--balance');
  const strictBalance = args.includes('--strict');

  let success = true;

  if (runBalance) {
    // Only balance tests - strict mode (fail on errors) unless --advisory passed
    const advisory = !strictBalance;
    success = await runTests(BALANCE_TESTS, 'BALANCE TESTS', advisory);
  } else if (runAll) {
    // Quick first, then balance (advisory mode - don't block on balance failures)
    success = await runTests(QUICK_TESTS, 'QUICK TESTS');
    if (success) {
      // Balance tests in advisory mode - results shown but don't block
      await runTests(BALANCE_TESTS, 'BALANCE TESTS', true);
    }
  } else {
    // Default: quick tests only
    success = await runTests(QUICK_TESTS, 'QUICK TESTS');
  }

  console.log('');
  process.exit(success ? 0 : 1);
}

main();
