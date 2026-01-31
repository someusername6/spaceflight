/**
 * E2E Tests - Mission Pause (Core Tests)
 *
 * Re-exports all core mission pause tests from the split modules.
 *
 * Basic tests: mission-pause-basic.mjs (3 tests)
 * Resume tests: mission-pause-resume.mjs (4 tests)
 * Quit tests: mission-pause-quit.mjs (2 tests)
 *
 * Total: 9 tests
 */

import { isMainModule, runTestSuite } from '../core/index.mjs';
import { ALL_TESTS as BASIC_TESTS } from './mission-pause-basic.mjs';
import { ALL_TESTS as QUIT_TESTS } from './mission-pause-quit.mjs';
import { ALL_TESTS as RESUME_TESTS } from './mission-pause-resume.mjs';

// All core tests combined
export const ALL_TESTS = [...BASIC_TESTS, ...RESUME_TESTS, ...QUIT_TESTS];

if (isMainModule(import.meta.url)) {
  runTestSuite('Mission Pause Tests (Core)', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
