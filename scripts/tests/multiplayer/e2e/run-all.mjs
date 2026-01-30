#!/usr/bin/env node

/**
 * E2E Test Runner
 *
 * Runs all multiplayer E2E test suites with shared server infrastructure.
 * Starts servers once, runs all suites, then stops servers.
 *
 * Test files are auto-discovered from this directory. Any .mjs file that
 * exports ALL_TESTS is treated as a test suite.
 *
 * Usage:
 *   node scripts/tests/multiplayer/e2e/run-all.mjs            # Run all suites
 *   node scripts/tests/multiplayer/e2e/run-all.mjs --suite 3  # Run only suite 3
 */

import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { printResults, startServers, stopServers } from './utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Files that are utilities, not test suites
const EXCLUDED_FILES = new Set([
  'run-all.mjs',
  'run-n-times.mjs',
  'utils.mjs',
  'helpers.mjs',
  'connection-helpers.mjs',
  'loadout-helpers.mjs',
  'servers.mjs',
  'test-config.mjs',
]);

/**
 * Convert filename to suite name: "state-sync-host.mjs" -> "State Sync Host"
 */
function fileToSuiteName(filename) {
  return filename
    .replace('.mjs', '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Discover all test suites by scanning the e2e directory
 */
async function discoverSuites() {
  const files = await readdir(__dirname);
  const testFiles = files
    .filter((f) => f.endsWith('.mjs') && !EXCLUDED_FILES.has(f))
    .sort(); // Alphabetical order for consistent runs

  const suites = [];
  for (const file of testFiles) {
    const mod = await import(`./${file}`);
    if (mod.ALL_TESTS) {
      suites.push({ name: fileToSuiteName(file), tests: mod.ALL_TESTS });
    }
  }
  return suites;
}

async function main() {
  const suiteArgIdx = process.argv.indexOf('--suite');
  const suiteNum =
    suiteArgIdx >= 0 ? parseInt(process.argv[suiteArgIdx + 1], 10) : null;

  const SUITES = await discoverSuites();
  const totalTests = SUITES.reduce((n, s) => n + s.tests.length, 0);

  console.log('\n========================================');
  console.log(
    `  Running all E2E test suites (${SUITES.length}, ${totalTests} tests)`,
  );
  console.log('========================================\n');

  if (suiteNum) {
    console.log(`  Running only suite ${suiteNum}\n`);
  }

  try {
    await startServers();
  } catch (error) {
    console.error('Failed to start servers:', error.message);
    process.exit(1);
  }

  const allResults = [];

  try {
    for (let i = 0; i < SUITES.length; i++) {
      if (suiteNum && i + 1 !== suiteNum) continue;

      const suite = SUITES[i];
      console.log(
        `\n--- Suite ${i + 1}: ${suite.name} (${suite.tests.length} tests) ---`,
      );

      for (const test of suite.tests) {
        allResults.push({
          name: `[${suite.name}] ${test.name}`,
          passed: await test.fn(),
        });
      }
    }
  } finally {
    await stopServers();
  }

  const { failed } = printResults(allResults);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Runner error:', error);
  process.exit(1);
});
