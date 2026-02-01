/**
 * E2E Tests - Chat Polish
 *
 * Tests for chat rate limiting and message length validation.
 * Total: 2 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  VITE_URL,
} from '../core/index.mjs';

// =============================================================================
// Helper: Setup host in lobby
// =============================================================================

async function setupHostInLobby(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', (err) => console.log(`  [Page Error] ${err.message}`));

  await page.goto(VITE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-host-game', {
    state: 'visible',
    timeout: 15000,
  });
  await page.click('#btn-host-game');
  await page.waitForSelector('.saves-list', {
    state: 'visible',
    timeout: 5000,
  });

  const occupiedSlot = await page.locator('.save-slot.occupied').first();
  if (await occupiedSlot.isVisible().catch(() => false)) {
    await occupiedSlot.click();
  } else {
    await page.locator('.save-slot.empty').first().click();
    await page.waitForSelector('.campaign-create-modal', {
      state: 'visible',
      timeout: 5000,
    });
    await page.click('#btn-start');
  }

  await page.waitForSelector('.lobby-screen', {
    state: 'visible',
    timeout: 30000,
  });
  console.log('  In lobby');

  return { context, page };
}

// =============================================================================
// Tests
// =============================================================================

function testRateLimitingPreventsRapidMessages() {
  return runTest('Rate limiting prevents rapid messages', async (browser) => {
    const { context, page } = await setupHostInLobby(browser);

    // Send first message - should succeed
    await page.fill('#chat-input', 'First message');
    await page.press('#chat-input', 'Enter');
    console.log('  Sent first message');

    // Wait for message to appear
    await page.waitForFunction(
      () =>
        Array.from(
          document.querySelectorAll('.chat-message:not(.system)'),
        ).some((el) => el.textContent?.includes('First message')),
      { timeout: 5000 },
    );
    console.log('  First message appeared');

    // Immediately try second message - should be rate limited
    await page.fill('#chat-input', 'Second message');
    await page.press('#chat-input', 'Enter');
    console.log('  Attempted second message immediately');

    // Check that second message does NOT appear (rate limited)
    // Wait a short time to ensure it would have appeared if allowed
    await page.waitForTimeout(500);

    const hasSecondMessage = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.chat-message:not(.system)')).some(
        (el) => el.textContent?.includes('Second message'),
      ),
    );

    if (hasSecondMessage) {
      throw new Error('Rate limiting did not prevent rapid message');
    }
    console.log('  Second message was rate limited');

    // Wait for rate limit to expire and try again
    await page.waitForTimeout(1100);
    await page.fill('#chat-input', 'Third message after wait');
    await page.press('#chat-input', 'Enter');

    await page.waitForFunction(
      () =>
        Array.from(
          document.querySelectorAll('.chat-message:not(.system)'),
        ).some((el) => el.textContent?.includes('Third message')),
      { timeout: 5000 },
    );
    console.log('  Third message sent after rate limit expired');

    await context.close();
  });
}

function testLongMessagesBlocked() {
  return runTest('Long messages are blocked by maxlength', async (browser) => {
    const { context, page } = await setupHostInLobby(browser);

    // Check that input has maxlength attribute
    const maxLength = await page.evaluate(() => {
      const input = document.querySelector('#chat-input');
      return input?.getAttribute('maxlength');
    });

    if (maxLength) {
      console.log(`  Input has maxlength=${maxLength}`);
      if (parseInt(maxLength, 10) !== 200) {
        throw new Error(`Expected maxlength=200, got ${maxLength}`);
      }
    } else {
      console.log('  Input does not have maxlength attribute');
      // Test validation instead
    }

    // Try to type a very long message
    const longMessage = 'a'.repeat(250);
    await page.fill('#chat-input', longMessage);

    // Check what was actually entered
    const actualValue = await page.evaluate(
      () => document.querySelector('#chat-input').value,
    );

    if (actualValue.length > 200) {
      throw new Error(
        `Input accepted ${actualValue.length} chars, should cap at 200`,
      );
    }
    console.log(`  Input capped at ${actualValue.length} characters`);

    await context.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Rate limiting', fn: testRateLimitingPreventsRapidMessages },
  { name: 'Long messages blocked', fn: testLongMessagesBlocked },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Chat Polish Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
