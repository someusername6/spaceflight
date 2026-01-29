/**
 * E2E Test Utilities
 *
 * Core utilities and test runner helpers for lobby E2E tests.
 */

import { fileURLToPath } from 'node:url';
import { startServers, stopServers } from './servers.mjs';

// Re-export server utilities for convenience
export {
  PROJECT_ROOT,
  SIGNALING_PORT,
  SIGNALING_URL,
  startServers,
  stopServers,
  VITE_PORT,
  VITE_URL,
} from './servers.mjs';

/**
 * Check if the current module is the main entry point.
 * Use to guard `runTestSuite()` so test files can be both imported and run directly.
 *
 * @param {string} importMetaUrl - Pass `import.meta.url` from the calling module
 */
export function isMainModule(importMetaUrl) {
  return process.argv[1] === fileURLToPath(importMetaUrl);
}

/**
 * Sleep utility.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Test Runner Helpers
// =============================================================================

/**
 * Run a full E2E test suite.
 * Replaces the boilerplate main() function in every test file.
 *
 * @param {string} title - Suite title displayed in the header
 * @param {{ name: string, fn: () => Promise<boolean> }[]} tests - Test definitions
 */
export async function runTestSuite(title, tests) {
  const testArgIdx = process.argv.indexOf('--test');
  const testNum =
    testArgIdx >= 0 ? parseInt(process.argv[testArgIdx + 1], 10) : null;

  console.log('\n============================================');
  console.log(`   ${title}`);
  console.log('============================================\n');

  if (testNum) {
    console.log(`  Running only test ${testNum}\n`);
  }

  try {
    await startServers();
  } catch (error) {
    console.error('Failed to start servers:', error.message);
    process.exit(1);
  }

  const results = [];

  try {
    for (let i = 0; i < tests.length; i++) {
      if (testNum && i + 1 !== testNum) continue;
      results.push({ name: tests[i].name, passed: await tests[i].fn() });
    }
  } finally {
    await stopServers();
  }

  const { failed } = printResults(results);
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Run a single test with browser lifecycle management.
 * Launches a browser, runs the test function, and ensures cleanup.
 * Tracks created contexts and ensures they are closed on failure.
 *
 * @param {string} name - Test name for logging
 * @param {(browser: import('playwright').Browser) => Promise<void>} testFn
 * @returns {Promise<boolean>} Whether the test passed
 */
export async function runTest(name, testFn) {
  const { chromium } = await import('playwright');
  console.log(`\n=== ${name} ===\n`);
  const browser = await chromium.launch({ headless: true });

  // Track contexts created during test for cleanup
  /** @type {import('playwright').BrowserContext[]} */
  const contexts = [];
  const originalNewContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const ctx = await originalNewContext(...args);
    contexts.push(ctx);
    return ctx;
  };

  try {
    await testFn(browser);
    console.log(`\n  ${name} PASSED\n`);
    return true;
  } catch (error) {
    console.error(`\n  ${name} FAILED:`, error.message, '\n');
    return false;
  } finally {
    // Close any contexts that were created but not cleaned up
    for (const ctx of contexts) {
      await ctx.close().catch(() => {});
    }
    await browser.close();
  }
}

// =============================================================================
// Results
// =============================================================================

/**
 * Print test results summary.
 */
export function printResults(results) {
  console.log('\n============================================');
  console.log('   Test Results');
  console.log('============================================\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${result.name}`);
    if (result.passed) passed++;
    else failed++;
  }

  console.log(`\n  Total: ${passed} passed, ${failed} failed\n`);

  return { passed, failed };
}
