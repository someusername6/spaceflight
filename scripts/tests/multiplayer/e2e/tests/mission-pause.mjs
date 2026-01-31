/**
 * E2E Tests - Mission Pause & Disconnect
 *
 * Re-exports all mission pause tests from the split modules.
 *
 * Core tests: mission-pause-core.mjs (9 tests)
 * Disconnect tests: mission-pause-disconnect.mjs (3 tests)
 * Lag tests: mission-pause-lag.mjs (3 tests)
 *
 * Total: 15 tests
 */

import { isMainModule, runTestSuite } from '../core/index.mjs';
import { ALL_TESTS as CORE_TESTS } from './mission-pause-core.mjs';
import { ALL_TESTS as DISCONNECT_TESTS } from './mission-pause-disconnect.mjs';
import { ALL_TESTS as LAG_TESTS } from './mission-pause-lag.mjs';

// Re-export for backwards compatibility
export { CORE_TESTS, DISCONNECT_TESTS, LAG_TESTS };

// All tests combined
export const ALL_TESTS = [...CORE_TESTS, ...DISCONNECT_TESTS, ...LAG_TESTS];

if (isMainModule(import.meta.url)) {
  // Run all tests with --all flag, otherwise just core tests
  const runAll = process.argv.includes('--all');
  const tests = runAll ? ALL_TESTS : CORE_TESTS;
  const suiteName = runAll
    ? 'Mission Pause Tests (Full)'
    : 'Mission Pause Tests';

  runTestSuite(suiteName, tests).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
