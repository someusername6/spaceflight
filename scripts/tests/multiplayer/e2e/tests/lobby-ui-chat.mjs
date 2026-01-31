/**
 * E2E Tests - Lobby UI (Chat & Connection)
 *
 * Tests for chat messaging, cleanup, copy, and ping display.
 * Total: 4 tests
 */

import {
  isMainModule,
  runTest,
  runTestSuite,
  VITE_URL,
} from '../core/index.mjs';

// =============================================================================
// Chat Messaging
// =============================================================================

function testChatMessaging() {
  return runTest('Chat Messaging', async (browser) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    hostPage.on('pageerror', (err) =>
      console.log(`  [Host Error] ${err.message}`),
    );
    guestPage.on('pageerror', (err) =>
      console.log(`  [Guest Error] ${err.message}`),
    );

    // Setup: Get both players into lobby
    await hostPage.goto(VITE_URL, { waitUntil: 'networkidle' });
    await hostPage.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 15000,
    });
    await hostPage.click('#btn-host-game');
    await hostPage.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });

    const hostOccupiedSlot = await hostPage
      .locator('.save-slot.occupied')
      .first();
    if (await hostOccupiedSlot.isVisible().catch(() => false)) {
      await hostOccupiedSlot.click();
    } else {
      await hostPage.locator('.save-slot.empty').first().click();
      await hostPage.waitForSelector('.campaign-create-modal', {
        state: 'visible',
        timeout: 5000,
      });
      await hostPage.click('#btn-start');
    }

    await hostPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Host: In lobby');

    const roomCode = (
      await hostPage.locator('.lobby-screen .room-code-value').textContent()
    )?.trim();

    await guestPage.goto(VITE_URL, { waitUntil: 'networkidle' });
    await guestPage.waitForSelector('#btn-join-game', {
      state: 'visible',
      timeout: 15000,
    });
    await guestPage.click('#btn-join-game');
    await guestPage.waitForSelector('.join-game-screen', {
      state: 'visible',
      timeout: 5000,
    });
    await guestPage.fill('#room-code', roomCode.replace(/\s+/g, ''));

    const callsignInput = guestPage.locator('#callsign');
    if (await callsignInput.isVisible().catch(() => false)) {
      await callsignInput.fill('ChatGuest');
    }

    await guestPage.click('#btn-join');
    await guestPage.waitForSelector('.lobby-screen', {
      state: 'visible',
      timeout: 30000,
    });
    console.log('  Guest: In lobby');

    await Promise.all([
      hostPage.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 2,
        { timeout: 15000 },
      ),
      guestPage.waitForFunction(
        () => document.querySelectorAll('.player-row').length >= 2,
        { timeout: 15000 },
      ),
    ]);
    console.log('  Both players connected');

    // Test: Host sends chat message
    const testMessage = 'Hello from host!';
    await hostPage.fill('#chat-input', testMessage);
    await hostPage.press('#chat-input', 'Enter');
    console.log('  Host: Sent chat message');

    await hostPage.waitForFunction(
      (msg) =>
        Array.from(
          document.querySelectorAll('.chat-message:not(.system)'),
        ).some((el) => el.textContent?.includes(msg)),
      testMessage,
      { timeout: 10000 },
    );
    console.log('  Host: Sees own message');

    await guestPage.waitForFunction(
      (msg) =>
        Array.from(
          document.querySelectorAll('.chat-message:not(.system)'),
        ).some((el) => el.textContent?.includes(msg)),
      testMessage,
      { timeout: 10000 },
    );
    console.log('  Guest: Sees host message');

    // Test: Guest sends chat message
    const guestMessage = 'Reply from guest!';
    await guestPage.fill('#chat-input', guestMessage);
    await guestPage.press('#chat-input', 'Enter');
    console.log('  Guest: Sent chat message');

    await Promise.all([
      hostPage.waitForFunction(
        (msg) =>
          Array.from(
            document.querySelectorAll('.chat-message:not(.system)'),
          ).some((el) => el.textContent?.includes(msg)),
        guestMessage,
        { timeout: 10000 },
      ),
      guestPage.waitForFunction(
        (msg) =>
          Array.from(
            document.querySelectorAll('.chat-message:not(.system)'),
          ).some((el) => el.textContent?.includes(msg)),
        guestMessage,
        { timeout: 10000 },
      ),
    ]);
    console.log('  Both: See guest message');

    await hostContext.close();
    await guestContext.close();
  });
}

function testBackButtonCleanup() {
  return runTest('Back Button Cleanup', async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => console.log(`  [Page Error] ${err.message}`));

    await page.goto(VITE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btn-host-game', {
      state: 'visible',
      timeout: 15000,
    });
    await page.click('#btn-host-game');
    console.log('  Clicked Host Game');

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

    const roomCode = await page
      .locator('.lobby-screen .room-code-value')
      .textContent();
    console.log(`  Room code: ${roomCode?.trim()}`);

    await page.click('.lobby-screen #btn-back');
    console.log('  Clicked Leave button');

    await page.waitForSelector('#btn-play', {
      state: 'visible',
      timeout: 10000,
    });
    console.log('  Returned to title screen');

    if (
      await page
        .locator('.lobby-screen')
        .isVisible()
        .catch(() => false)
    ) {
      throw new Error('Lobby still visible after leaving');
    }
    console.log('  Lobby screen cleaned up');

    if (
      !(await page.locator('#btn-host-game').isVisible()) ||
      !(await page.locator('#btn-join-game').isVisible())
    ) {
      throw new Error('Multiplayer buttons not visible after returning');
    }
    console.log('  Multiplayer buttons accessible');

    await page.click('#btn-host-game');
    console.log('  Clicked Host Game again');

    await page.waitForSelector('.saves-list', {
      state: 'visible',
      timeout: 5000,
    });
    console.log('  Can access load campaign screen - cleanup successful');

    await context.close();
  });
}

// =============================================================================
// Copy Room Code & Ping
// =============================================================================

function testCopyRoomCode() {
  return runTest('Copy Room Code Button', async (browser) => {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
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

    const displayedRoomCode = (
      await page.locator('.lobby-screen .room-code-value').textContent()
    )?.trim();
    console.log(`  Room code: ${displayedRoomCode}`);

    const copyBtn = page.locator('.lobby-screen #btn-copy');
    if (!(await copyBtn.isVisible()))
      throw new Error('Copy button not visible');
    console.log('  Copy button visible');

    await copyBtn.click();
    console.log('  Clicked copy button');

    await page.waitForFunction(
      () =>
        document
          .querySelector('.lobby-screen #btn-copy')
          ?.textContent?.includes('Copied'),
      { timeout: 5000 },
    );
    console.log('  Button shows "Copied!" state');

    if (!(await copyBtn.evaluate((el) => el.classList.contains('copied')))) {
      throw new Error('Copy button missing "copied" class');
    }
    console.log('  Button has "copied" class');

    await context.close();
  });
}

function testPingDisplay() {
  return runTest('Ping Display', async (browser) => {
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

    const pingElement = page.locator('.ping');
    if (!(await pingElement.isVisible()))
      throw new Error('Ping element not visible');
    console.log('  Ping element visible');

    const pingText = await pingElement.textContent();
    if (!pingText?.includes('ms'))
      throw new Error(`Ping should show "ms" unit, got: ${pingText}`);
    console.log(`  Ping shows: ${pingText}`);

    const hasValidClass = await pingElement.evaluate(
      (el) =>
        el.classList.contains('ping-good') ||
        el.classList.contains('ping-medium') ||
        el.classList.contains('ping-bad'),
    );
    if (!hasValidClass)
      throw new Error('Ping missing quality class (ping-good/medium/bad)');
    console.log('  Ping has quality class');

    await context.close();
  });
}

// =============================================================================
// Exports
// =============================================================================

export const ALL_TESTS = [
  { name: 'Chat Messaging', fn: testChatMessaging },
  { name: 'Back Button Cleanup', fn: testBackButtonCleanup },
  { name: 'Copy Room Code', fn: testCopyRoomCode },
  { name: 'Ping Display', fn: testPingDisplay },
];

if (isMainModule(import.meta.url)) {
  runTestSuite('Lobby UI Chat Tests', ALL_TESTS).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
