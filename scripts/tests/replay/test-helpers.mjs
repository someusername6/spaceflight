/**
 * Test Framework Helpers
 *
 * Shared test utilities for replay tests.
 */

export const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

export function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertThrows(fn, expectedMessage, testName) {
  try {
    fn();
    throw new Error(`${testName}: expected error but none was thrown`);
  } catch (e) {
    if (!e.message.includes(expectedMessage)) {
      throw new Error(
        `${testName}: expected error containing "${expectedMessage}", got "${e.message}"`,
      );
    }
  }
}

export function runTests(testName) {
  console.log(testName);
  console.log(`${'='.repeat(testName.length)}\n`);

  let localPassed = 0;
  let localFailed = 0;

  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✓ ${name}`);
      localPassed++;
    } catch (e) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${e.message}`);
      localFailed++;
    }
  }

  console.log(`\n${localPassed} passed, ${localFailed} failed`);

  if (localFailed > 0) {
    process.exit(1);
  }
}
