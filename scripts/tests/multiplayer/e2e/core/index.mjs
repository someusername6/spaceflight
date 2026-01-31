/**
 * E2E Test Core - Re-exports
 *
 * Centralizes all core test infrastructure exports.
 */

// Config
export {
  createTestPage,
  injectTestConfig,
  TEST_COUNTDOWN_SECONDS,
  TIMEOUTS,
} from './config.mjs';

// Runner utilities
export {
  isMainModule,
  printResults,
  runTest,
  runTestSuite,
  sleep,
  waitFor,
  waitForAttribute,
  waitForCount,
  waitForStable,
  waitForText,
} from './runner.mjs';

// Server management
export {
  PROJECT_ROOT,
  SIGNALING_PORT,
  SIGNALING_URL,
  startServers,
  stopServers,
  VITE_PORT,
  VITE_URL,
} from './servers.mjs';
