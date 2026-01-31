/**
 * E2E Test Runner Utilities
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
 * @deprecated Prefer condition-based waiting (waitFor*) over arbitrary delays
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Condition-Based Waiting Utilities
// =============================================================================

/**
 * Wait for a page function to return truthy.
 * Use this instead of sleep() when waiting for state changes.
 *
 * @param {import('playwright').Page} page
 * @param {Function} fn - Function to evaluate in page context
 * @param {any} arg - Argument to pass to function
 * @param {object} options
 * @param {number} [options.timeout=5000] - Max wait time in ms
 * @param {number} [options.polling=50] - Poll interval in ms
 */
export async function waitFor(page, fn, arg = undefined, options = {}) {
  const { timeout = 5000, polling = 50 } = options;
  await page.waitForFunction(fn, arg, { timeout, polling });
}

/**
 * Wait for element count to reach expected value.
 * Replaces: await sleep(X); const count = await locator.count();
 *
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @param {number} expectedCount
 * @param {object} options
 * @param {number} [options.timeout=5000]
 * @param {'eq'|'gte'|'lte'|'gt'|'lt'} [options.comparison='eq']
 */
export async function waitForCount(
  page,
  selector,
  expectedCount,
  options = {},
) {
  const { timeout = 5000, comparison = 'eq' } = options;
  await page.waitForFunction(
    ({ sel, count, cmp }) => {
      const actual = document.querySelectorAll(sel).length;
      switch (cmp) {
        case 'gte':
          return actual >= count;
        case 'lte':
          return actual <= count;
        case 'gt':
          return actual > count;
        case 'lt':
          return actual < count;
        default:
          return actual === count;
      }
    },
    { sel: selector, count: expectedCount, cmp: comparison },
    { timeout, polling: 50 },
  );
}

/**
 * Wait for element text to contain a string.
 * Replaces: await sleep(X); const text = await locator.textContent();
 *
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @param {string} text
 * @param {object} options
 * @param {number} [options.timeout=5000]
 */
export async function waitForText(page, selector, text, options = {}) {
  const { timeout = 5000 } = options;
  await page.waitForFunction(
    ({ sel, txt }) => {
      const el = document.querySelector(sel);
      return el?.textContent?.includes(txt) ?? false;
    },
    { sel: selector, txt: text },
    { timeout, polling: 50 },
  );
}

/**
 * Wait for an element to have a specific attribute value.
 * Replaces: await sleep(X); check attribute
 *
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @param {string} attr
 * @param {string|null} value - null means attribute should not exist
 * @param {object} options
 * @param {number} [options.timeout=5000]
 */
export async function waitForAttribute(
  page,
  selector,
  attr,
  value,
  options = {},
) {
  const { timeout = 5000 } = options;
  await page.waitForFunction(
    ({ sel, a, v }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      if (v === null) return !el.hasAttribute(a);
      return el.getAttribute(a) === v;
    },
    { sel: selector, a: attr, v: value },
    { timeout, polling: 50 },
  );
}

/**
 * Wait for element to be visible and stable (no layout changes).
 * Use after animations or transitions.
 *
 * @param {import('playwright').Locator} locator
 * @param {object} options
 * @param {number} [options.timeout=5000]
 */
export async function waitForStable(locator, options = {}) {
  const { timeout = 5000 } = options;
  await locator.waitFor({ state: 'visible', timeout });
  // Playwright's waitFor with 'visible' ensures element is stable
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
